import { applyFilters, type FilterGroup, type FilterSelection } from "../filters";
import { formatFullDate, formatPaise } from "./bought-groups";
import type { GroceryActivityEntry } from "./types";

const UNKNOWN_ACTOR = "unknown";

const TYPE_OPTIONS = [
  { id: "added", label: "Added" },
  { id: "claims", label: "Claims & assignments" },
  { id: "bought", label: "Bought" },
  { id: "expenses", label: "Expenses" },
  { id: "deleted", label: "Deleted & archived" },
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
  "expense.created": "expenses",
  "expense.updated": "expenses",
  "expense.deleted": "expenses",
  "settlement.recorded": "expenses",
  "settlement.updated": "expenses",
  "settlement.deleted": "expenses",
  simplify_debts_changed: "expenses",
  "grocery_item.cancelled": "deleted",
  "grocery_item.deleted": "deleted",
  "grocery_item.archived": "deleted",
  "grocery_list.created": "lists",
  "grocery_list.updated": "lists",
  "grocery_list.deleted": "lists",
  "grocery_item.moved": "lists",
  house_created: "house",
  member_joined: "house",
  member_left: "house",
  member_removed: "house",
  role_changed: "house",
  join_rejected: "house",
  invite_created: "house",
  invite_revoked: "house",
  email_invited: "house",
  email_uninvited: "house",
};

const LINKED_EXPENSE_KEY = "linked_expense";

function linkedExpense(entry: GroceryActivityEntry): Record<string, unknown> | null {
  const value = entry.payload?.[LINKED_EXPENSE_KEY];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

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

const INVOLVES_ME_OPTION = { id: "me", label: "Involves you" } as const;
const EXPENSES_ONLY_OPTION = { id: "only", label: "Expenses only" } as const;

function userRowExists(value: unknown, userId: string): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        (row as Record<string, unknown>).user_id === userId,
    )
  );
}

function involvesUser(entry: GroceryActivityEntry, userId: string): boolean {
  if (entry.actorId === userId || entry.payload?.assigned_to === userId) return true;
  if (entry.payload?.payer_id === userId || entry.payload?.payee_id === userId) return true;
  if (entry.entityType === "member" && entry.entityId === userId) return true;

  const expense = entry.type.startsWith("expense.") ? entry.payload : linkedExpense(entry);
  return (
    !!expense && (userRowExists(expense.payers, userId) || userRowExists(expense.shares, userId))
  );
}

function isExpenseEntry(entry: GroceryActivityEntry): boolean {
  return TYPE_OPTION_BY_ACTIVITY[entry.type] === "expenses" || linkedExpense(entry) !== null;
}

function matchesActivityOption(
  entry: GroceryActivityEntry,
  groupId: string,
  optionId: string,
  currentUserId?: string | null,
): boolean {
  switch (groupId) {
    case "type":
      return optionId === "expenses"
        ? isExpenseEntry(entry)
        : TYPE_OPTION_BY_ACTIVITY[entry.type] === optionId;
    case "expenses":
      return optionId === EXPENSES_ONLY_OPTION.id && isExpenseEntry(entry);
    case "people":
      return actorKey(entry) === optionId;
    case "involvement":
      return (
        optionId === INVOLVES_ME_OPTION.id && !!currentUserId && involvesUser(entry, currentUserId)
      );
    default:
      return false;
  }
}

export function filterActivity(
  entries: readonly GroceryActivityEntry[],
  selection: FilterSelection,
  currentUserId?: string | null,
): GroceryActivityEntry[] {
  return applyFilters(entries, selection, (entry, groupId, optionId) =>
    matchesActivityOption(entry, groupId, optionId, currentUserId),
  );
}

export function activityFilterGroups(
  entries: readonly GroceryActivityEntry[],
  currentUserId?: string | null,
): FilterGroup[] {
  const count = (groupId: string, optionId: string) =>
    entries.filter((entry) => matchesActivityOption(entry, groupId, optionId, currentUserId))
      .length;

  const actors = new Map<string, string>();
  for (const entry of entries)
    actors.set(actorKey(entry), activityActorLabel(entry, currentUserId));

  const groups: FilterGroup[] = [
    {
      id: "expenses",
      label: EXPENSES_ONLY_OPTION.label,
      options: [EXPENSES_ONLY_OPTION],
      toggle: true,
    },
  ];

  if (currentUserId) {
    groups.push({
      id: "involvement",
      label: INVOLVES_ME_OPTION.label,
      options: [INVOLVES_ME_OPTION],
      toggle: true,
    });
  }

  groups.push({
    id: "type",
    label: "Type",
    options: TYPE_OPTIONS.map((option) => ({ ...option, count: count("type", option.id) })),
  });

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
  "grocery_item.moved": "moved",
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
  "grocery_item.archived": "archived",
  "grocery_list.created": "created list",
  "grocery_list.updated": "updated list",
  "grocery_list.deleted": "deleted list",
  "expense.created": "added expense",
  "expense.updated": "updated expense",
  "expense.deleted": "deleted expense",
};

const LIST_PREPOSITIONS: Record<string, string> = {
  "grocery_item.added": "to",
  "grocery_item.updated": "in",
  "grocery_item.moved": "to",
  "grocery_item.claimed": "in",
  "grocery_item.unclaimed": "in",
  "grocery_item.unassigned": "in",
  "grocery_item.assigned": "in",
  "grocery_item.assignment_accepted": "in",
  "grocery_item.assignment_declined": "in",
};

const AMOUNT_PREPOSITIONS: Record<string, string> = {
  "grocery_item.bought": "for",
  "grocery_batch.bought": "for",
  "expense.created": "for",
  "expense.updated": "to",
  "expense.deleted": "of",
};

const PLAIN_PHRASES: Record<string, string> = {
  house_created: "created the house",
  member_joined: "joined the house",
  join_requested: "asked to join the house",
  member_left: "left the house",
  join_rejected: "rejected a join request",
  invite_revoked: "revoked an invite",
  email_invited: "added an email to the invite list",
  email_uninvited: "removed an email from the invite list",
};

function memberSegment(
  entry: GroceryActivityEntry,
  currentUserId?: string | null,
): ActivitySegment {
  if (entry.entityId && entry.entityId === entry.actorId) {
    return { text: currentUserId === entry.actorId ? "yourself" : "themselves", emphasis: true };
  }
  if (currentUserId && entry.entityId === currentUserId) return { text: "you", emphasis: true };

  const name = entry.payload?.member_name;
  return { text: typeof name === "string" && name ? name : "a member", emphasis: true };
}

const SETTLEMENT_SUFFIX: Record<string, string> = {
  "settlement.updated": " (updated)",
  "settlement.deleted": " (deleted)",
};

function partySegment(
  entry: GroceryActivityEntry,
  role: "payer" | "payee",
  currentUserId?: string | null,
): ActivitySegment {
  if (currentUserId && entry.payload?.[`${role}_id`] === currentUserId) {
    return { text: role === "payer" ? "You" : "you", emphasis: true };
  }
  const name = entry.payload?.[`${role}_name`];
  return { text: typeof name === "string" && name ? name : "Someone", emphasis: true };
}

function memberParts(
  entry: GroceryActivityEntry,
  actor: ActivitySegment,
  currentUserId?: string | null,
): ActivitySegment[] | null {
  switch (entry.type) {
    case "member_removed":
      return [actor, { text: " removed ", emphasis: false }, memberSegment(entry, currentUserId)];
    case "role_changed": {
      const role = entry.payload?.to === "admin" ? "an admin" : "a member";
      return [
        actor,
        { text: " made ", emphasis: false },
        memberSegment(entry, currentUserId),
        { text: ` ${role}`, emphasis: false },
      ];
    }
    case "settlement.recorded":
    case "settlement.updated":
    case "settlement.deleted": {
      const amount = entry.payload?.amount_paise;
      const suffix = SETTLEMENT_SUFFIX[entry.type];
      return [
        partySegment(entry, "payer", currentUserId),
        { text: " paid ", emphasis: false },
        partySegment(entry, "payee", currentUserId),
        ...(typeof amount === "number"
          ? [{ text: ` ${formatPaise(amount)}`, emphasis: false }]
          : []),
        ...(suffix ? [{ text: suffix, emphasis: false }] : []),
      ];
    }
    case "simplify_debts_changed":
      return [
        actor,
        { text: ` turned ${entry.payload?.enabled === true ? "on" : "off"} `, emphasis: false },
        { text: "simplify debts", emphasis: true },
      ];
    case "invite_created": {
      const phrase = entry.payload?.regenerated === true ? "regenerated" : "created";
      return [actor, { text: ` ${phrase} the invite code`, emphasis: false }];
    }
    default:
      return null;
  }
}

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
    const isExpense = entry.type.startsWith("expense.");
    const fallback = entry.type.startsWith("grocery_list.")
      ? "a list"
      : isBatch
        ? "some items"
        : isExpense
          ? "an expense"
          : "an item";
    const rawName = isBatch
      ? entry.payload?.label
      : isExpense
        ? entry.payload?.title
        : entry.payload?.name;
    const name = typeof rawName === "string" && rawName ? rawName : fallback;
    const parts: ActivitySegment[] = [
      actor,
      { text: ` ${verb} `, emphasis: false },
      { text: name, emphasis: true },
    ];

    if (entry.type === "grocery_item.assigned") {
      parts.push({ text: " to ", emphasis: false }, assigneeSegment(entry, currentUserId));
    }

    const totalPaise = isExpense
      ? entry.payload?.amount_paise
      : (entry.payload?.total_paise ?? linkedExpense(entry)?.amount_paise);
    const amountPreposition = AMOUNT_PREPOSITIONS[entry.type];
    if (amountPreposition && typeof totalPaise === "number") {
      parts.push({ text: ` ${amountPreposition} ${formatPaise(totalPaise)}`, emphasis: false });
    }

    const preposition = LIST_PREPOSITIONS[entry.type];
    const listName = entry.payload?.list_name;
    if (preposition && typeof listName === "string" && listName) {
      parts.push({ text: ` ${preposition} `, emphasis: false }, { text: listName, emphasis: true });
    }
    return parts;
  }

  const member = memberParts(entry, actor, currentUserId);
  if (member) return member;

  const phrase = PLAIN_PHRASES[entry.type] ?? "performed an action";
  return [actor, { text: ` ${phrase}`, emphasis: false }];
}

function linkedExpenseKey(entry: GroceryActivityEntry): string | null {
  if (entry.type === "expense.created") {
    const { source, batch_id: batchId, item_id: itemId } = entry.payload ?? {};
    const target = source === "batch" ? batchId : source === "purchase" ? itemId : null;
    return typeof target === "string" ? `${target}|${entry.createdAt}` : null;
  }
  if (
    (entry.type === "grocery_item.bought" || entry.type === "grocery_batch.bought") &&
    entry.entityId
  ) {
    return `${entry.entityId}|${entry.createdAt}`;
  }
  return null;
}

/**
 * Folds the expense recorded alongside a purchase into the purchase's own entry, so one
 * purchase reads as one row. Both rows are logged in a single transaction, hence share a
 * timestamp. An expense whose purchase entry is not loaded stays as its own row.
 */
export function mergeLinkedExpenses(
  entries: readonly GroceryActivityEntry[],
): GroceryActivityEntry[] {
  const expenses = new Map<string, GroceryActivityEntry>();
  for (const entry of entries) {
    if (entry.type !== "expense.created") continue;
    const key = linkedExpenseKey(entry);
    if (key) expenses.set(key, entry);
  }

  const merged = new Set<string>();
  const result: GroceryActivityEntry[] = [];
  for (const entry of entries) {
    const key = entry.type === "expense.created" ? null : linkedExpenseKey(entry);
    const expense = key ? expenses.get(key) : undefined;
    if (!expense) {
      result.push(entry);
      continue;
    }
    merged.add(expense.id);
    const { amount_paise, payers, shares } = expense.payload;
    result.push({
      ...entry,
      payload: {
        ...entry.payload,
        [LINKED_EXPENSE_KEY]: { id: expense.entityId, amount_paise, payers, shares },
      },
    });
  }

  return result.filter((entry) => !merged.has(entry.id));
}

/** The expense an entry is about, or null when the entry is not an expense one. */
export function activityExpenseId(entry: GroceryActivityEntry): string | null {
  const id = entry.type.startsWith("expense.") ? entry.entityId : linkedExpense(entry)?.id;
  return typeof id === "string" ? id : null;
}

/** The payment an entry is about, or null when it is not one or the payment was deleted. */
export function activitySettlementId(entry: GroceryActivityEntry): string | null {
  const live = entry.type === "settlement.recorded" || entry.type === "settlement.updated";
  return live && typeof entry.entityId === "string" ? entry.entityId : null;
}

function sumForUser(value: unknown, field: string, userId: string): number | null {
  if (!Array.isArray(value)) return null;
  let total: number | null = null;
  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    if (record.user_id !== userId) continue;
    const amount = record[field];
    if (typeof amount === "number") total = (total ?? 0) + amount;
  }
  return total;
}

export type ActivityDetail = { text: string; tone: "lent" | "borrowed"; struck: boolean };

/** The viewer's own stake in an expense entry, or null when they are not involved. */
export function formatActivityDetail(
  entry: GroceryActivityEntry,
  currentUserId?: string | null,
): ActivityDetail | null {
  if (!currentUserId) return null;

  const parts =
    entry.type === "expense.created" ||
    entry.type === "expense.updated" ||
    entry.type === "expense.deleted"
      ? entry.payload
      : linkedExpense(entry);
  if (!parts) return null;

  const paid = sumForUser(parts.payers, "amount_paise", currentUserId) ?? 0;
  const share = sumForUser(parts.shares, "share_paise", currentUserId) ?? 0;

  const struck = entry.type === "expense.deleted";
  const difference = paid - share;
  if (difference > 0) {
    return { text: `You get back ${formatPaise(difference)}`, tone: "lent", struck };
  }
  if (difference < 0) {
    return { text: `You owe ${formatPaise(-difference)}`, tone: "borrowed", struck };
  }
  return null;
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
