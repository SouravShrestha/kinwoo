export const groceryKeys = {
  all: (houseId: string) => ["grocery", houseId] as const,
  lists: (houseId: string) => ["grocery", houseId, "lists"] as const,
  list: (houseId: string, listId: string) => ["grocery", houseId, "lists", listId] as const,
  items: (houseId: string, listId: string) =>
    ["grocery", houseId, "lists", listId, "items"] as const,
  item: (houseId: string, listId: string, itemId: string) =>
    ["grocery", houseId, "lists", listId, "items", itemId] as const,
  // Outside items(): realtime item changes should not refetch every loaded history page.
  boughtHistory: (houseId: string, listId: string) =>
    ["grocery", houseId, "lists", listId, "bought-history"] as const,
  categories: (houseId: string) => ["grocery", houseId, "categories"] as const,
  overview: (houseId: string) => ["grocery", houseId, "overview"] as const,
  // Nested under overview so every existing overview invalidation also refreshes the feed.
  recentActivity: (houseId: string) => ["grocery", houseId, "overview", "activity"] as const,
  privatePurchases: (houseId: string) =>
    ["grocery", houseId, "overview", "private-purchases"] as const,
  activity: (houseId: string, listId: string, itemId: string) =>
    ["grocery", houseId, "lists", listId, "items", itemId, "activity"] as const,
};
