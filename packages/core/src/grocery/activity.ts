import { applyFilters, type FilterGroup, type FilterSelection } from "../filters";
import { formatFullDate, formatPaise } from "./bought-groups";
import type { GroceryActivityEntry } from "./types";

const UNKNOWN_ACTOR = "unknown";

const TYPE_OPTIONS = [
  { id: "added", label: "Added" },
  { id: "claims", label: "Claims & assignments" },
  { id: "bought", label: "Bought" },
  { id: "deleted", label: "Deleted" },
  { id: "lists", label: "Lists" },
  { id: "house", label: "House" },
] as const;

const TYPE_OPTION_BY_ACTIVITY: Record<string, string> = {
  "grocery_item.added": "added",
  "grocery_item.claimed": "claims",
  "grocery_item.unclaimed": "claims",
  "grocery_item.unassigned": "claims",
  "grocery_item.assigned": "claims",
  "grocery_item.assignment_accepted": "claims",
  "grocery_item.assignment_declined": "claims",
  "grocery_item.bought": "bought",
  "grocery_batch.bought": "bought",
  "grocery_item.cancelled": "deleted",
  "grocery_item.deleted": "deleted",
  "grocery_list.created": "lists",
  "grocery_list.updated": "lists",
  "grocery_list.deleted": "lists",
  house_created: "house",
  member_joined: "house",
  member_left: "house",
};

function actorKey(entry: GroceryActivityEntry): string {
  return entry.actorId ?? UNKNOWN_ACTOR;
}

export function activityActorLabel(
  entry: Pick<GroceryActivityEntry, "actorId" | "actorName">,
  currentUserId?: string | null,
): string {
  if (currentUserId && entry.actorId === currentUserId) return "You";
  return entry.actorName ?? "Someone";
}

function matchesActivityOption(
  entry: GroceryActivityEntry,
  groupId: string,
  optionId: string,
): boolean {
  switch (groupId) {
    case "type":
      return TYPE_OPTION_BY_ACTIVITY[entry.type] === optionId;
    case "people":
      return actorKey(entry) === optionId;
    default:
      return false;
  }
}

export function filterActivity(
  entries: readonly GroceryActivityEntry[],
  selection: FilterSelection,
): GroceryActivityEntry[] {
  return applyFilters(entries, selection, matchesActivityOption);
}

export function activityFilterGroups(
  entries: readonly GroceryActivityEntry[],
  currentUserId?: string | null,
): FilterGroup[] {
  const count = (groupId: string, optionId: string) =>
    entries.filter((entry) => matchesActivityOption(entry, groupId, optionId)).length;

  const actors = new Map<string, string>();
  for (const entry of entries)
    actors.set(actorKey(entry), activityActorLabel(entry, currentUserId));

  const groups: FilterGroup[] = [
    {
      id: "type",
      label: "Type",
      options: TYPE_OPTIONS.map((option) => ({ ...option, count: count("type", option.id) })),
    },
  ];

  if (actors.size > 0) {
    groups.push({
      id: "people",
      label: "People",
      options: [...actors]
        .map(([id, label]) => ({ id, label, count: count("people", id) }))
        .sort((a, b) =>
          a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : a.label.localeCompare(b.label),
        ),
    });
  }

  return groups;
}

export type ActivitySegment = { text: string; emphasis: boolean };

const ITEM_VERBS: Record<string, string> = {
  "grocery_item.added": "added",
  "grocery_item.updated": "updated",
  "grocery_item.claimed": "claimed",
  "grocery_item.unclaimed": "unclaimed",
  "grocery_item.unassigned": "unassigned",
  "grocery_item.assigned": "assigned",
  "grocery_item.assignment_accepted": "accepted assignment for",
  "grocery_item.assignment_declined": "declined assignment for",
  "grocery_item.bought": "bought",
  "grocery_batch.bought": "bought",
  "grocery_item.cancelled": "cancelled",
  "grocery_item.deleted": "deleted",
  "grocery_list.created": "created list",
  "grocery_list.updated": "updated list",
  "grocery_list.deleted": "deleted list",
};

const LIST_PREPOSITIONS: Record<string, string> = {
  "grocery_item.added": "to",
  "grocery_item.updated": "in",
  "grocery_item.claimed": "in",
  "grocery_item.unclaimed": "in",
  "grocery_item.unassigned": "in",
  "grocery_item.assigned": "in",
  "grocery_item.assignment_accepted": "in",
  "grocery_item.assignment_declined": "in",
};

const PLAIN_PHRASES: Record<string, string> = {
  house_created: "created the house",
  member_joined: "joined the house",
  member_left: "left the house",
};

function assigneeSegment(
  entry: GroceryActivityEntry,
  currentUserId?: string | null,
): ActivitySegment {
  const assigneeId = entry.payload?.assigned_to;
  const isSelf = typeof assigneeId === "string" && assigneeId === entry.actorId;
  const isViewer = !!currentUserId && assigneeId === currentUserId;

  if (isSelf) {
    return { text: isViewer ? "yourself" : "themselves", emphasis: true };
  }
  if (isViewer) return { text: "you", emphasis: true };

  const name = entry.payload?.assigned_to_name;
  return { text: typeof name === "string" && name ? name : "someone", emphasis: true };
}

/** The sentence for an entry, with the actor and item names flagged for emphasis. */
export function formatActivityParts(
  entry: GroceryActivityEntry,
  currentUserId?: string | null,
): ActivitySegment[] {
  const actor: ActivitySegment = { text: activityActorLabel(entry, currentUserId), emphasis: true };
  const verb = ITEM_VERBS[entry.type];

  if (verb) {
    const isBatch = entry.type === "grocery_batch.bought";
    const fallback = entry.type.startsWith("grocery_list.")
      ? "a list"
      : isBatch
        ? "some items"
        : "an item";
    const rawName = isBatch ? entry.payload?.label : entry.payload?.name;
    const name = typeof rawName === "string" && rawName ? rawName : fallback;
    const parts: ActivitySegment[] = [
      actor,
      { text: ` ${verb} `, emphasis: false },
      { text: name, emphasis: true },
    ];

    if (entry.type === "grocery_item.assigned") {
      parts.push({ text: " to ", emphasis: false }, assigneeSegment(entry, currentUserId));
    }

    const totalPaise = entry.payload?.total_paise;
    if (isBatch && typeof totalPaise === "number") {
      parts.push({ text: ` · ${formatPaise(totalPaise)}`, emphasis: false });
    }

    const preposition = LIST_PREPOSITIONS[entry.type];
    const listName = entry.payload?.list_name;
    if (preposition && typeof listName === "string" && listName) {
      parts.push({ text: ` ${preposition} `, emphasis: false }, { text: listName, emphasis: true });
    }
    return parts;
  }

  const phrase = PLAIN_PHRASES[entry.type] ?? "performed an action";
  return [actor, { text: ` ${phrase}`, emphasis: false }];
}

export function batchBoughtTimelinePhrase(entry: GroceryActivityEntry): string {
  const count = entry.payload?.item_count;
  const others = typeof count === "number" ? count - 1 : 0;
  if (others < 1) return "marked this item as bought";
  return `marked this item as bought with ${others} ${others === 1 ? "other" : "others"}`;
}

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
  | "house-plus"
  | "pulse";

const ICON_BY_ACTIVITY: Record<string, ActivityIconName> = {
  "grocery_item.added": "cart-plus",
  "grocery_item.claimed": "cart-check",
  "grocery_item.unclaimed": "cart-minus",
  "grocery_item.unassigned": "user-cross",
  "grocery_item.assigned": "user-check",
  "grocery_item.assignment_accepted": "user-check",
  "grocery_item.assignment_declined": "user-cross",
  "grocery_item.bought": "bag-dollar",
  "grocery_batch.bought": "bag-dollar",
  "grocery_item.cancelled": "cart-cross",
  "grocery_item.deleted": "trash",
  "grocery_list.created": "file-plus",
  "grocery_list.updated": "list-settings",
  "grocery_list.deleted": "trash",
  house_created: "house-plus",
  member_joined: "heart",
  member_left: "frown",
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

const RELATIVE_TIME_MAX_DAYS = 2;

export function formatTimelineTime(dateString: string, now: number = Date.now()): string {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((now - time) / 86_400_000);
  return days <= RELATIVE_TIME_MAX_DAYS
    ? formatRelativeTime(dateString, now)
    : formatFullDate(time);
}
