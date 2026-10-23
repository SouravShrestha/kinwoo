import type { GroceryActivityEntry } from "@kinwoo/core/grocery";

export interface INotificationRepository {
  list(limit: number): Promise<GroceryActivityEntry[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}
