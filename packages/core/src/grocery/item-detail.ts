import { activityActorLabel, batchBoughtTimelinePhrase, formatRelativeTime } from "./activity";
import { itemUrgencyLabel, itemUrgencyTone } from "./add-item";
import { formatBoughtDate, formatPaise } from "./bought-groups";
import type { GroceryActivityEntry, GroceryItem } from "./types";

export type ItemDetailFactTone = "destructive" | "warning";

export type ItemDetailFact = { label: string; value: string; tone?: ItemDetailFactTone };

const EMPTY_VALUE = "—";

export function itemQuantityLabel(item: Pick<GroceryItem, "quantity" | "unit">): string {
  return [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");
}

function personLabel(
  userId: string | null,
  name: string | null,
  currentUserId: string | null | undefined,
): string {
  if (currentUserId && userId === currentUserId) return "You";
  return name ?? "A housemate";
}

function statusFact(item: GroceryItem, currentUserId: string | null | undefined): ItemDetailFact {
  switch (item.status) {
    case "claimed":
      return {
        label: "Claimed by",
        value: personLabel(item.claimedBy, item.claimedByName, currentUserId),
      };
    case "assigned": {
      const assignee = personLabel(item.assignedTo, item.assignedToName, currentUserId);
      return {
        label: "Assigned to",
        value: item.assignmentResponse ? `${assignee} (${item.assignmentResponse})` : assignee,
      };
    }
    case "bought":
      return {
        label: "Bought by",
        value: personLabel(
          item.boughtBy ?? item.claimedBy,
          item.boughtByName ?? item.claimedByName,
          currentUserId,
        ),
      };
    default:
      return { label: "Status", value: "Waiting for a buyer" };
  }
}

/** The label/value pairs summarising an item, laid out two per row in the detail sheet. */
export function itemDetailFacts(
  item: GroceryItem,
  currentUserId?: string | null,
  now: number = Date.now(),
): ItemDetailFact[] {
  const quantity = itemQuantityLabel(item) || EMPTY_VALUE;
  const added = formatRelativeTime(item.createdAt, now);

  if (item.status === "bought") {
    const purchase = item.purchase;
    return [
      statusFact(item, currentUserId),
      {
        label: "Date",
        value: (purchase && formatBoughtDate(purchase.boughtAt, now)) || EMPTY_VALUE,
      },
      {
        label: "Paid",
        value: purchase?.pricePaise != null ? formatPaise(purchase.pricePaise) : EMPTY_VALUE,
      },
      { label: "Store", value: purchase?.store ?? EMPTY_VALUE },
      { label: "Quantity", value: quantity },
      { label: "Added", value: added },
    ];
  }

  const tone = itemUrgencyTone(item.urgency);
  return [
    statusFact(item, currentUserId),
    {
      label: "Needed",
      value: itemUrgencyLabel(item.urgency),
      tone: tone === "high" ? "destructive" : tone === "medium" ? "warning" : undefined,
    },
    { label: "Quantity", value: quantity },
    { label: "Added", value: added },
  ];
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

export function itemTimelineSentence(
  entry: GroceryActivityEntry,
  currentUserId?: string | null,
): string {
  const actor = activityActorLabel(entry, currentUserId);

  switch (entry.type) {
    case "grocery_item.added":
      return `${actor} added this item`;
    case "grocery_item.claimed":
      return `${actor} claimed this item`;
    case "grocery_item.unclaimed":
      return `${actor} unclaimed this item`;
    case "grocery_item.unassigned":
      return `${actor} unassigned this item`;
    case "grocery_item.assigned":
      return `${actor} assigned this item`;
    case "grocery_item.assignment_accepted":
      return `${actor} accepted the assignment`;
    case "grocery_item.assignment_declined":
      return `${actor} declined the assignment`;
    case "grocery_item.bought":
      return `${actor} marked this item as bought`;
    case "grocery_batch.bought":
      return `${actor} ${batchBoughtTimelinePhrase(entry)}`;
    case "grocery_item.cancelled":
      return `${actor} cancelled this item`;
    case "grocery_item.moved":
      return `${actor} moved this item to another list`;
    default:
      return `${actor} updated this item`;
  }
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
