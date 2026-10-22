import type { GroceryActivityEntry, GroceryItem } from "./types";

export function itemQuantityLabel(item: Pick<GroceryItem, "quantity" | "unit">): string {
  return [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");
}

export type BoughtTimelineStep = {
  label: string;
  userId: string | null;
  name: string | null;
  at: string | null;
};

function latestEntry(
  activity: readonly GroceryActivityEntry[],
  type: string,
): GroceryActivityEntry | undefined {
  let latest: GroceryActivityEntry | undefined;
  for (const entry of activity) {
    if (entry.type !== type) continue;
    if (!latest || Date.parse(entry.createdAt) > Date.parse(latest.createdAt)) latest = entry;
  }
  return latest;
}

/** Who bought, held and added a bought item, newest step first. */
export function boughtItemTimeline(
  item: GroceryItem,
  activity: readonly GroceryActivityEntry[] = [],
): BoughtTimelineStep[] {
  const steps: BoughtTimelineStep[] = [
    {
      label: "Closed by",
      userId: item.boughtBy ?? item.claimedBy,
      name: item.boughtByName ?? item.claimedByName,
      at: item.purchase?.boughtAt ?? null,
    },
  ];

  if (item.assignedTo) {
    steps.push({
      label: "Assigned to",
      userId: item.assignedTo,
      name: item.assignedToName,
      at: latestEntry(activity, "grocery_item.assigned")?.createdAt ?? null,
    });
  } else if (item.claimedBy) {
    steps.push({
      label: "Claimed by",
      userId: item.claimedBy,
      name: item.claimedByName,
      at: latestEntry(activity, "grocery_item.claimed")?.createdAt ?? null,
    });
  }

  steps.push({
    label: "Added by",
    userId: item.createdBy,
    name: latestEntry(activity, "grocery_item.added")?.actorName ?? null,
    at: item.createdAt,
  });

  return steps;
}

export type StoreId = "blinkit" | "zepto" | "instamart";

export type StoreSearchLink = { id: StoreId; name: string; url: string };

export function storeSearchLinks(itemName: string): StoreSearchLink[] {
  const query = encodeURIComponent(itemName);
  return [
    { id: "blinkit", name: "Blinkit", url: `https://blinkit.com/s/?q=${query}` },
    { id: "zepto", name: "Zepto", url: `https://www.zeptonow.com/search?query=${query}` },
    {
      id: "instamart",
      name: "Instamart",
      url: `https://www.swiggy.com/instamart/search?query=${query}`,
    },
  ];
}
