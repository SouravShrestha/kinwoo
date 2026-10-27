// Pure rules for send-push. It imports nothing so Deno and Vitest both run it as is.

export type Activity = {
  id: string;
  house_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
};

export type Audience = { kind: "users"; ids: string[] } | { kind: "admins" } | { kind: "none" };

export type Message = { title: string; body: string; url: string };

export type Ticket = { status: string; details?: { error?: string } };

export const PUSH_TYPES = [
  "expense.created",
  "expense.updated",
  "settlement.recorded",
  "grocery_item.assigned",
  "join_requested",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 100;
const EXPO_BATCH = 100;

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${lastThree}`;
}

// A copy of formatPaise in @kinwoo/core: functions deploy without the rest of the repo.
// logic.test.ts fails if the two ever differ.
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(paise));
  const rupees = groupIndian(String(Math.floor(absolute / 100)));
  const fraction = absolute % 100;
  return `${sign}₹${rupees}${fraction === 0 ? "" : `.${String(fraction).padStart(2, "0")}`}`;
}

function text(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > MAX_TEXT ? `${clean.slice(0, MAX_TEXT - 1)}…` : clean;
}

function amount(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? formatPaise(value) : "";
}

function users(ids: unknown[], actorId: string | null): Audience {
  const unique = [...new Set(ids.filter((id): id is string => typeof id === "string"))].filter(
    (id) => UUID.test(id) && id !== actorId,
  );
  return unique.length > 0 ? { kind: "users", ids: unique } : { kind: "none" };
}

export function audienceFor(activity: Activity): Audience {
  const { payload, actor_id: actor } = activity;

  switch (activity.type) {
    case "expense.created":
    case "expense.updated": {
      const shares = Array.isArray(payload.shares) ? payload.shares : [];
      return users(
        shares.map((share) => (share as { user_id?: unknown } | null)?.user_id),
        actor,
      );
    }
    case "settlement.recorded":
      return users([payload.payer_id, payload.payee_id], actor);
    case "grocery_item.assigned":
      return users([payload.assigned_to], actor);
    case "join_requested":
      return { kind: "admins" };
    default:
      return { kind: "none" };
  }
}

export function messageFor(activity: Activity, actorName: string | null): Message | null {
  const { payload } = activity;
  const actor = text(actorName, "Someone");

  switch (activity.type) {
    case "expense.created": {
      if (!activity.entity_id) return null;
      const total = amount(payload.amount_paise);
      return {
        title: "New expense",
        body: `${actor} added ${text(payload.title, "an expense")}${total ? ` · ${total}` : ""}`,
        url: `/expense/${activity.entity_id}`,
      };
    }
    case "expense.updated": {
      if (!activity.entity_id) return null;
      const total = amount(payload.amount_paise);
      return {
        title: "Expense updated",
        body: `${actor} updated ${text(payload.title, "an expense")}${total ? ` · ${total}` : ""}`,
        url: `/expense/${activity.entity_id}`,
      };
    }
    case "settlement.recorded": {
      if (!activity.entity_id) return null;
      const paid = amount(payload.amount_paise);
      return {
        title: "Payment recorded",
        body: `${text(payload.payer_name, "Someone")} paid ${text(payload.payee_name, "someone")}${
          paid ? ` ${paid}` : ""
        }`,
        url: `/expenses/payment?settlementId=${activity.entity_id}`,
      };
    }
    case "grocery_item.assigned":
      return {
        title: "Item assigned",
        body: `${actor} assigned you ${text(payload.name, "an item")}`,
        url: "/tasks",
      };
    case "join_requested":
      return { title: "Join request", body: `${actor} wants to join your house`, url: "/" };
    default:
      return null;
  }
}

export function chunk<T>(items: T[], size = EXPO_BATCH): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Expo answers with one ticket per message, in order.
export function deadTokens(tickets: Ticket[], tokens: string[]): string[] {
  return tokens.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered");
}

export function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
