import type { Database } from "@kinwoo/core/db";
import type { GroceryActivityEntry } from "@kinwoo/core/grocery";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { INotificationRepository } from "./INotificationRepository";

const COLUMNS =
  "id, created_at, read_at, activity_log!inner(house_id, actor_id, type, entity_type, entity_id, payload, created_at, profiles!activity_log_actor_id_fkey(display_name))";

// Takes the session-scoped client: RLS and the RPCs read the caller from the JWT, so a user can
// only ever see or mark their own notifications.
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  // The entry's id is the notification's id, so a row can be marked read by the id it renders with.
  async list(limit: number): Promise<GroceryActivityEntry[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    // Rows render by the activity's time, which can differ from when the notification was queued,
    // so the day groups need this order to stay consecutive.
    const rows = [...data].sort((a, b) =>
      b.activity_log.created_at.localeCompare(a.activity_log.created_at),
    );

    return rows.map((row) => {
      const activity = row.activity_log;
      return {
        id: row.id,
        houseId: activity.house_id,
        actorId: activity.actor_id,
        actorName: activity.profiles?.display_name ?? null,
        type: activity.type,
        entityType: activity.entity_type,
        entityId: activity.entity_id,
        payload: (activity.payload ?? {}) as Record<string, unknown>,
        createdAt: activity.created_at,
        readAt: row.read_at,
      };
    });
  }

  async markRead(id: string): Promise<void> {
    const { error } = await this.client.rpc("mark_notification_read", { p_id: id });
    if (error) throw new Error(error.message);
  }

  async markAllRead(): Promise<void> {
    const { error } = await this.client.rpc("mark_notifications_read");
    if (error) throw new Error(error.message);
  }
}
