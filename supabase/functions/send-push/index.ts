import { createClient } from "npm:@supabase/supabase-js@2";

import {
  audienceFor,
  chunk,
  deadTokens,
  messageFor,
  PUSH_TYPES,
  sameSecret,
  type Activity,
  type Ticket,
} from "./logic.ts";
import { parseSubscription, sendWebPush, type Vapid } from "./webpush.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHANNEL_ID = "default";
const TTL_SECONDS = 24 * 60 * 60;

const vapid: Vapid | null =
  Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY")
    ? {
        subject: Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@kinwoo.in",
        publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
        privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
      }
    : null;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sendBatch(messages: Record<string, unknown>[]): Promise<Ticket[]> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo push responded ${response.status}`);

  const { data } = (await response.json()) as { data?: Ticket[] };
  return data ?? [];
}

async function recipientIds(activity: Activity): Promise<string[]> {
  const audience = audienceFor(activity);
  if (audience.kind === "none") return [];

  const members = supabase
    .from("house_members")
    .select("user_id")
    .eq("house_id", activity.house_id)
    .eq("status", "active");

  const { data, error } = await (audience.kind === "admins"
    ? members.eq("role", "admin")
    : members.in("user_id", audience.ids));
  if (error) throw error;

  return data.map((row) => row.user_id).filter((id) => id !== activity.actor_id);
}

// Private lists show only to their creator, so an entry about one never leaves the app.
async function onPrivateList(activity: Activity): Promise<boolean> {
  const listId = activity.payload.list_id;
  if (typeof listId !== "string") return false;

  const { data, error } = await supabase
    .from("grocery_lists")
    .select("visibility")
    .eq("id", listId)
    .maybeSingle();
  if (error) throw error;

  return data?.visibility !== "shared";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sameSecret(request.headers.get("x-push-secret"), Deno.env.get("PUSH_FUNCTION_SECRET"))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null);
  const activityId = typeof body?.activity_id === "string" ? body.activity_id : null;
  if (!activityId) return json({ error: "activity_id is required" }, 400);

  try {
    const { data: activity, error } = await supabase
      .from("activity_log")
      .select("id, house_id, actor_id, type, entity_type, entity_id, payload")
      .eq("id", activityId)
      .maybeSingle<Activity>();
    if (error) throw error;
    if (!activity || !(PUSH_TYPES as readonly string[]).includes(activity.type)) {
      return json({ sent: 0 });
    }
    if (await onPrivateList(activity)) return json({ sent: 0 });

    const candidates = await recipientIds(activity);
    if (candidates.length === 0) return json({ sent: 0 });

    // The inbox is for everyone told, whatever their push setting. A failure here must not stop the push.
    // Not ignoreDuplicates: a retry must still return the existing row ids for the push payload.
    const { data: inbox, error: inboxError } = await supabase
      .from("notifications")
      .upsert(
        candidates.map((user_id) => ({ user_id, activity_id: activity.id })),
        { onConflict: "user_id,activity_id" },
      )
      .select("id, user_id");
    if (inboxError) console.error(inboxError);
    const notificationIds = new Map<string, string>(
      (inbox ?? []).map((row) => [row.user_id as string, row.id as string]),
    );

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, notifications_enabled, muted_push_types")
      .in("id", [...candidates, ...(activity.actor_id ? [activity.actor_id] : [])]);
    if (profilesError) throw profilesError;

    const recipients = profiles
      .filter(
        (profile) =>
          candidates.includes(profile.id) &&
          profile.notifications_enabled &&
          !profile.muted_push_types.includes(activity.type),
      )
      .map((profile) => profile.id);
    if (recipients.length === 0) return json({ sent: 0 });

    const actorName = profiles.find((profile) => profile.id === activity.actor_id)?.display_name;
    const message = messageFor(activity, actorName ?? null);
    if (!message) return json({ sent: 0 });

    const { data: rows, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, user_id")
      .in("user_id", recipients);
    if (tokensError) throw tokensError;

    const isWeb = (token: string) => token.startsWith("{");
    const tokens = rows.map((row) => row.token as string);
    const idForToken = new Map(
      rows.map((row) => [row.token as string, notificationIds.get(row.user_id as string)]),
    );
    let sent = 0;
    const dead: string[] = [];

    for (const batch of chunk(tokens.filter((token) => !isWeb(token)))) {
      const tickets = await sendBatch(
        batch.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: {
            url: message.url,
            notificationId: idForToken.get(to),
            houseId: activity.house_id,
          },
          channelId: CHANNEL_ID,
          priority: "high",
          ttl: TTL_SECONDS,
        })),
      );
      for (const ticket of tickets) {
        if (ticket.status !== "ok") console.error("Expo rejected a push:", JSON.stringify(ticket));
      }
      sent += tickets.filter((ticket) => ticket.status === "ok").length;
      dead.push(...deadTokens(tickets, batch));
    }

    const browsers = tokens.filter(isWeb);
    if (browsers.length > 0 && !vapid) console.error("VAPID keys are not set; skipping browsers");
    if (vapid) {
      const results = await Promise.allSettled(
        browsers.map(async (token) => {
          const subscription = parseSubscription(token);
          if (!subscription) return { token, status: 410 };
          const status = await sendWebPush(
            subscription,
            { ...message, notificationId: idForToken.get(token), houseId: activity.house_id },
            vapid,
            TTL_SECONDS,
          );
          return { token, status };
        }),
      );
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Web push failed:", result.reason);
        } else if (result.value.status === 404 || result.value.status === 410) {
          dead.push(result.value.token);
        } else if (result.value.status >= 200 && result.value.status < 300) {
          sent += 1;
        } else {
          console.error("Push service rejected a push:", result.value.status);
        }
      }
    }

    if (dead.length > 0) await supabase.from("push_tokens").delete().in("token", dead);

    return json({ sent, removed: dead.length });
  } catch (cause) {
    console.error(cause);
    return json({ error: "Could not send notifications" }, 500);
  }
});
