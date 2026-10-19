import { itemBuyer, type ItemAssignee } from "./tabs";
import type { GroceryItem } from "./types";

export type BoughtGroup = {
  kind: "group";
  batchId: string;
  label: string;
  totalPaise: number;
  store: string | null;
  boughtAt: string;
  buyer: ItemAssignee | null;
  items: GroceryItem[];
};

export type BoughtEntry = { kind: "item"; item: GroceryItem } | BoughtGroup;

export function boughtGroupLabel(names: readonly string[]): string {
  const [first, ...rest] = names;
  if (first === undefined) return "";
  if (rest.length === 0) return first;
  return `${first} + ${rest.length} ${rest.length === 1 ? "other" : "others"}`;
}

function batchPosition(item: GroceryItem): number {
  return item.purchase?.batch?.position ?? 0;
}

// Groups take their label, total and members from `allItems`, so filtering the visible items
// never changes what a group says; it only decides whether and where the group appears.
export function groupBoughtItems(
  visibleItems: readonly GroceryItem[],
  allItems: readonly GroceryItem[],
): BoughtEntry[] {
  const membersByBatch = new Map<string, GroceryItem[]>();
  for (const item of allItems) {
    const batchId = item.status === "bought" ? item.purchase?.batch?.id : undefined;
    if (!batchId) continue;
    const members = membersByBatch.get(batchId);
    if (members) members.push(item);
    else membersByBatch.set(batchId, [item]);
  }

  const entries: BoughtEntry[] = [];
  const emitted = new Set<string>();
  for (const item of visibleItems) {
    const batch = item.purchase?.batch;
    if (!batch) {
      entries.push({ kind: "item", item });
      continue;
    }
    if (emitted.has(batch.id)) continue;
    emitted.add(batch.id);

    const members = [...(membersByBatch.get(batch.id) ?? [item])].sort(
      (a, b) => batchPosition(a) - batchPosition(b),
    );
    const lead = members[0] ?? item;
    entries.push({
      kind: "group",
      batchId: batch.id,
      label: batch.name ?? boughtGroupLabel(members.map((member) => member.name)),
      totalPaise: batch.totalPaise,
      store: lead.purchase?.store ?? null,
      boughtAt: lead.purchase?.boughtAt ?? lead.updatedAt,
      buyer: itemBuyer(lead),
      items: members,
    });
  }
  return entries;
}

export function findBoughtGroup(
  allItems: readonly GroceryItem[],
  batchId: string,
): BoughtGroup | null {
  const members = allItems.filter((item) => item.purchase?.batch?.id === batchId);
  const [entry] = groupBoughtItems(members.slice(0, 1), allItems);
  return entry?.kind === "group" ? entry : null;
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${lastThree}`;
}

// Hand-rolled instead of Intl.NumberFormat so output is identical on Hermes, browsers and Workers.
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(paise));
  const rupees = groupIndian(String(Math.floor(absolute / 100)));
  const fraction = absolute % 100;
  return `${sign}₹${rupees}${fraction === 0 ? "" : `.${String(fraction).padStart(2, "0")}`}`;
}

export const SHORT_MONTHS = [
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

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatBoughtDate(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const dayMonth = `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date(now).getFullYear()
    ? dayMonth
    : `${dayMonth} ${date.getFullYear()}`;
}

export function formatFullDate(time: number): string {
  const date = new Date(time);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

export function formatPickedDate(date: Date, now: number = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatFullDate(date.getTime());
}

export function itemCountLabel(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

export function boughtGroupAccessibleLabel(group: BoughtGroup, buyerName: string | null): string {
  return `${group.label}, ${formatPaise(group.totalPaise)}, ${itemCountLabel(group.items.length)}, bought by ${buyerName ?? "a housemate"}`;
}
