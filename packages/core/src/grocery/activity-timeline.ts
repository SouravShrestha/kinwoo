import { formatFullDate } from "./bought-groups";
import type { GroceryActivityEntry } from "./types";

export const ACTIVITY_PAGE_SIZE = 30;

export type ActivityCursor = { createdAt: string; id: string };

// Timestamps stay strings end to end: a Date round trip would truncate Postgres microseconds
// and make the next page skip or repeat rows.
const CURSOR_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function encodeActivityCursor(
  entry: Pick<GroceryActivityEntry, "createdAt" | "id">,
): string {
  return `${entry.createdAt}|${entry.id}`;
}

export function parseActivityCursor(value: string): ActivityCursor | null {
  const match = CURSOR_PATTERN.exec(value);
  return match ? { createdAt: match[1], id: match[2] } : null;
}

export type ActivityDayGroup = {
  key: string;
  label: string;
  entries: GroceryActivityEntry[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(date: Date, now: Date): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday)) return "Yesterday";

  const label = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** Groups newest-first entries into consecutive local calendar days, keeping their order. */
export function groupActivityByDay(
  entries: readonly GroceryActivityEntry[],
  now: number = Date.now(),
): ActivityDayGroup[] {
  const today = new Date(now);
  const groups: ActivityDayGroup[] = [];

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, label: dayLabel(date, today), entries: [entry] });
    }
  }

  return groups;
}

export type ActivityIconName =
  | "cart-plus"
  | "cart-check"
  | "cart-minus"
  | "cart-cross"
  | "bag-dollar"
  | "user-check"
  | "user-cross"
  | "heart"
  | "frown"
  | "file-plus"
  | "list-settings"
  | "trash"
  | "archive"
  | "house-plus"
  | "shield-check"
  | "invite"
  | "email"
  | "arrow-right"
  | "transaction"
  | "item-edit"
  | "pulse";

const ICON_BY_ACTIVITY: Record<string, ActivityIconName> = {
  "grocery_item.added": "cart-plus",
  "grocery_item.updated": "item-edit",
  "grocery_item.claimed": "cart-check",
  "grocery_item.unclaimed": "cart-minus",
  "grocery_item.unassigned": "user-cross",
  "grocery_item.assigned": "user-check",
  "grocery_item.assignment_accepted": "user-check",
  "grocery_item.assignment_declined": "user-cross",
  "grocery_item.missed": "cart-cross",
  "grocery.digest": "pulse",
  "grocery_item.bought": "bag-dollar",
  "grocery_batch.bought": "bag-dollar",
  "expense.created": "transaction",
  "expense.updated": "transaction",
  "expense.deleted": "trash",
  "settlement.recorded": "transaction",
  "settlement.updated": "transaction",
  "settlement.deleted": "trash",
  simplify_debts_changed: "transaction",
  "grocery_item.cancelled": "cart-cross",
  "grocery_item.deleted": "trash",
  "grocery_item.archived": "archive",
  "grocery_list.created": "file-plus",
  "grocery_list.updated": "list-settings",
  "grocery_list.deleted": "trash",
  house_created: "house-plus",
  member_joined: "heart",
  join_requested: "house-plus",
  member_left: "frown",
  member_removed: "user-cross",
  role_changed: "shield-check",
  join_rejected: "user-cross",
  invite_created: "invite",
  invite_revoked: "invite",
  email_invited: "email",
  email_uninvited: "email",
  "grocery_item.moved": "arrow-right",
};

export function activityIconName(entry: GroceryActivityEntry): ActivityIconName {
  return ICON_BY_ACTIVITY[entry.type] ?? "pulse";
}

export function formatRelativeTime(dateString: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(dateString).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatClock(date: Date): string {
  const hours = date.getHours();
  const hour12 = String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hour12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** "Today at 05:51 PM", "Yesterday at 09:30 AM", otherwise "16 Oct, 2026 at 05:51 PM". */
export function formatActivityTimestamp(dateString: string, now: number = Date.now()): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const label = dayLabel(date, new Date(now));
  const day = label === "Today" || label === "Yesterday" ? label : formatFullDate(date.getTime());
  return `${day} at ${formatClock(date)}`;
}

const RELATIVE_TIME_MAX_DAYS = 2;

export function formatTimelineTime(dateString: string, now: number = Date.now()): string {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((now - time) / 86_400_000);
  return days <= RELATIVE_TIME_MAX_DAYS
    ? formatRelativeTime(dateString, now)
    : formatFullDate(time);
}

export function withHouseName(
  text: string,
  entry: Pick<GroceryActivityEntry, "houseId">,
  houseNames: ReadonlyMap<string, string> | undefined,
): string {
  const name = entry.houseId ? houseNames?.get(entry.houseId) : undefined;
  return name ? `${text} · ${name}` : text;
}
