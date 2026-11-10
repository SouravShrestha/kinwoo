import { isOpenItem } from "./add-item";
import type { GroceryItem, ItemUrgency } from "./types";

export type NeededState = "overdue" | "today" | "tomorrow" | "upcoming" | "stale" | "none";

// An undated item this many days old is flagged so it does not sit unnoticed forever.
const STALE_AFTER_DAYS = 5;

// ponytail: one time zone for every house, matching public.house_today(); add a per-house zone
// when a house outside India needs it.
const HOUSE_TIME_ZONE = "Asia/Kolkata";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value: number) => String(value).padStart(2, "0");

/** The device's local day as "YYYY-MM-DD"; such keys compare correctly as strings. */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today in the houses' time zone, for server code that has no device clock to go by. */
export function houseDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOUSE_TIME_ZONE }).format(date);
}

function dayNumber(key: string): number {
  return (
    Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) /
    DAY_MS
  );
}

function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

function addDays(key: string, days: number): string {
  return new Date((dayNumber(key) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Mirrors public.urgency_needed_by. The server sets the real date; this fills optimistic rows. */
export function neededByFor(urgency: ItemUrgency, today: string = localDateKey()): string | null {
  switch (urgency) {
    case "now":
    case "today":
      return today;
    case "tomorrow":
      return addDays(today, 1);
    case "this_week":
      return addDays(today, 6);
    default:
      return null;
  }
}

type DatedItem = Pick<GroceryItem, "status" | "neededBy" | "createdAt">;

function daysWaiting(item: DatedItem, today: string): number {
  return daysBetween(localDateKey(new Date(item.createdAt)), today);
}

export function neededState(item: DatedItem, today: string = localDateKey()): NeededState {
  if (!isOpenItem(item)) return "none";
  if (!item.neededBy) return daysWaiting(item, today) >= STALE_AFTER_DAYS ? "stale" : "none";
  if (item.neededBy < today) return "overdue";
  if (item.neededBy === today) return "today";
  return daysBetween(today, item.neededBy) === 1 ? "tomorrow" : "upcoming";
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The full phrase, for screen readers and the details prompt. */
export function itemNeededLabel(
  item: DatedItem,
  today: string = localDateKey(),
): { state: NeededState; text: string } | null {
  const state = neededState(item, today);
  switch (state) {
    case "overdue":
      return {
        state,
        text: `overdue by ${plural(daysBetween(item.neededBy!, today), "day")}`,
      };
    case "today":
      return { state, text: "needed today" };
    case "tomorrow":
      return { state, text: "needed tomorrow" };
    case "upcoming":
      return {
        state,
        text: `needed by ${WEEKDAYS[new Date(dayNumber(item.neededBy!) * DAY_MS).getUTCDay()]}`,
      };
    case "stale": {
      const days = daysWaiting(item, today);
      return { state, text: `added ${plural(days, "day")} ago` };
    }
    default:
      return null;
  }
}

// Shown in item details, where there is room to say what to do about it.
export function itemNeededPrompt(item: DatedItem, today: string = localDateKey()): string | null {
  const label = itemNeededLabel(item, today);
  if (label?.state !== "overdue" && label?.state !== "stale") return null;
  const text = label.text[0]!.toUpperCase() + label.text.slice(1);
  return label.state === "overdue" ? `${text}. Still need it?` : text;
}

// The last one sends no reason.
export const MISSED_REASONS = ["Out of stock", "Too pricey", "Forgot", "Other"] as const;

const STATE_RANK: Record<NeededState, number> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  upcoming: 3,
  stale: 4,
  none: 5,
};

export function compareNeeded(a: DatedItem, b: DatedItem, today: string = localDateKey()): number {
  return (
    STATE_RANK[neededState(a, today)] - STATE_RANK[neededState(b, today)] ||
    (a.neededBy ?? "").localeCompare(b.neededBy ?? "") ||
    a.createdAt.localeCompare(b.createdAt)
  );
}
