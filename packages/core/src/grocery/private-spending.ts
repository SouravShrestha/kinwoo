import {
  formatBoughtDate,
  formatPaise,
  groupBoughtItems,
  itemCountLabel,
  type BoughtEntry,
} from "./bought-groups";
import { monthLabel } from "./purchase-date";
import type { GroceryItem, GroceryOverviewItem } from "./types";

export type PrivateSpendEntry = {
  key: string;
  entry: BoughtEntry;
  label: string;
  categoryName: string | null;
  itemCount: number;
  amountPaise: number | null;
  boughtAt: string;
  listName: string;
  listIcon: string;
};

export type PrivateSpendMonth = {
  key: string;
  label: string;
  totalPaise: number;
  entries: PrivateSpendEntry[];
};

export type PrivateSpending = { totalPaise: number; months: PrivateSpendMonth[] };

function boughtAtOf(item: GroceryItem): string {
  return item.purchase?.boughtAt ?? item.updatedAt;
}

function toSpendEntry(
  entry: BoughtEntry,
  listOf: (item: GroceryItem) => GroceryOverviewItem | undefined,
): PrivateSpendEntry {
  if (entry.kind === "group") {
    const lead = entry.items[0];
    const list = lead ? listOf(lead) : undefined;
    return {
      key: `batch:${entry.batchId}`,
      entry,
      label: entry.label,
      categoryName: lead?.categoryName ?? null,
      itemCount: entry.items.length,
      amountPaise: entry.totalPaise,
      boughtAt: entry.boughtAt,
      listName: list?.listName ?? "",
      listIcon: list?.listIcon ?? "",
    };
  }
  const list = listOf(entry.item);
  return {
    key: entry.item.id,
    entry,
    label: entry.item.name,
    categoryName: entry.item.categoryName,
    itemCount: 1,
    amountPaise: entry.item.purchase?.pricePaise ?? null,
    boughtAt: boughtAtOf(entry.item),
    listName: list?.listName ?? "",
    listIcon: list?.listIcon ?? "",
  };
}

// Groups by the local month of purchase, newest first. Unpriced purchases are listed but add nothing.
export function summarizePrivateSpending(items: readonly GroceryOverviewItem[]): PrivateSpending {
  const bought = items.filter((item) => item.status === "bought");
  const byId = new Map(bought.map((item) => [item.id, item]));
  const entries = groupBoughtItems(bought, bought)
    .map((entry) => toSpendEntry(entry, (item) => byId.get(item.id)))
    .sort((a, b) => Date.parse(b.boughtAt) - Date.parse(a.boughtAt));

  const months: PrivateSpendMonth[] = [];
  let totalPaise = 0;
  for (const entry of entries) {
    const date = new Date(entry.boughtAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    let month = months.find((candidate) => candidate.key === key);
    if (!month) {
      month = {
        key,
        label: monthLabel(date.getFullYear(), date.getMonth()),
        totalPaise: 0,
        entries: [],
      };
      months.push(month);
    }
    month.entries.push(entry);
    month.totalPaise += entry.amountPaise ?? 0;
    totalPaise += entry.amountPaise ?? 0;
  }
  return { totalPaise, months };
}

export function privateSpendAmountLabel(entry: PrivateSpendEntry): string {
  return entry.amountPaise === null ? "No price" : formatPaise(entry.amountPaise);
}

export function privateSpendSubtitle(entry: PrivateSpendEntry, now: number = Date.now()): string {
  const list = [entry.listIcon, entry.listName].filter(Boolean).join(" ");
  return [
    formatBoughtDate(entry.boughtAt, now),
    entry.itemCount > 1 ? itemCountLabel(entry.itemCount) : null,
    list || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function privateSpendAccessibleLabel(entry: PrivateSpendEntry, now: number = Date.now()) {
  return `${entry.label}, ${privateSpendAmountLabel(entry)}, ${privateSpendSubtitle(entry, now)}. Private, not split`;
}

export const PRIVATE_SPENDING_NOTE =
  "Only you can see this. It isn't split or counted in balances.";
