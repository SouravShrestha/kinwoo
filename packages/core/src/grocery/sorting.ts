import type { SortOption } from "../filters";
import type { GroceryItem, ItemUrgency } from "./types";

export const DEFAULT_GROCERY_SORT = "newest";

export const GROCERY_SORT_OPTIONS: readonly SortOption[] = [
  { id: DEFAULT_GROCERY_SORT, label: "Newest first" },
  { id: "urgency", label: "Needed by" },
  { id: "oldest", label: "Oldest first" },
  { id: "name_asc", label: "Name A to Z" },
  { id: "name_desc", label: "Name Z to A" },
];

const URGENCY_RANK: Record<ItemUrgency, number> = {
  now: 0,
  soon: 1,
  today: 2,
  tomorrow: 3,
  this_week: 4,
  whenever: 5,
};

const COMPARATORS: Record<string, (a: GroceryItem, b: GroceryItem) => number> = {
  urgency: (a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency],
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
};

// Array.prototype.sort is stable, so ties keep the incoming order.
export function sortGroceryItems(items: readonly GroceryItem[], sortId: string): GroceryItem[] {
  const compare = COMPARATORS[sortId];
  return compare ? [...items].sort(compare) : [...items];
}
