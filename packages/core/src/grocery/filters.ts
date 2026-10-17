import { applyFilters, type FilterGroup, type FilterSelection } from "../filters";
import type { GroceryTabKey } from "./tabs";
import type { GroceryItem } from "./types";

const UNCATEGORISED = "uncategorised";

const ADDED_BY_ME = { id: "added_by_me", label: "Added by me" } as const;

// Pending items have no claimer or assignee to filter on; bought items are filtered by buyer.
const PEOPLE_OPTIONS: Record<GroceryTabKey, readonly { id: string; label: string }[]> = {
  pending: [ADDED_BY_ME],
  assigned: [
    { id: "claimed_by_me", label: "Claimed by me" },
    { id: "assigned_to_me", label: "Assigned to me" },
    ADDED_BY_ME,
  ],
  bought: [{ id: "bought_by_me", label: "Bought by me" }],
};

const URGENCY_OPTIONS = [
  { id: "now", label: "Now" },
  { id: "soon", label: "Soon" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This week" },
  { id: "whenever", label: "Anytime" },
] as const;

function categoryId(item: GroceryItem): string {
  return item.categoryId ?? UNCATEGORISED;
}

function matchesGroceryOption(
  item: GroceryItem,
  groupId: string,
  optionId: string,
  userId: string,
): boolean {
  switch (groupId) {
    case "people":
      if (optionId === "claimed_by_me") return item.claimedBy === userId;
      if (optionId === "assigned_to_me") return item.assignedTo === userId;
      if (optionId === "added_by_me") return item.createdBy === userId;
      if (optionId === "bought_by_me") return item.boughtBy === userId;
      return false;
    case "urgency":
      return item.urgency === optionId;
    case "category":
      return categoryId(item) === optionId;
    default:
      return false;
  }
}

export function filterGroceryItems(
  items: readonly GroceryItem[],
  selection: FilterSelection,
  userId: string,
): GroceryItem[] {
  return applyFilters(items, selection, (item, groupId, optionId) =>
    matchesGroceryOption(item, groupId, optionId, userId),
  );
}

// Options come from `allItems` so a selected category stays visible (and clearable) on a tab
// where it has no items; counts come from `items`, the ones currently on screen.
export function groceryFilterGroups(
  tab: GroceryTabKey,
  items: readonly GroceryItem[],
  userId: string,
  allItems: readonly GroceryItem[] = items,
): FilterGroup[] {
  const count = (groupId: string, optionId: string) =>
    items.filter((item) => matchesGroceryOption(item, groupId, optionId, userId)).length;

  const withCounts = (groupId: string, options: readonly { id: string; label: string }[]) =>
    options.map((option) => ({ ...option, count: count(groupId, option.id) }));

  const categories = new Map<string, string>();
  for (const item of allItems) {
    categories.set(categoryId(item), item.categoryName ?? "Uncategorised");
  }
  const categoryOptions = [...categories]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const peopleLabel: Record<GroceryTabKey, string> = {
    pending: "Added by",
    assigned: "Assigned to",
    bought: "Bought by",
  };

  const groups: FilterGroup[] = [
    {
      id: "people",
      label: peopleLabel[tab],
      options: withCounts("people", PEOPLE_OPTIONS[tab]),
    },
  ];
  if (tab !== "bought") {
    groups.push({
      id: "urgency",
      label: "Needed by",
      options: withCounts("urgency", URGENCY_OPTIONS),
    });
  }
  if (categoryOptions.length > 0) {
    groups.push({
      id: "category",
      label: "Category",
      options: withCounts("category", categoryOptions),
    });
  }
  return groups;
}
