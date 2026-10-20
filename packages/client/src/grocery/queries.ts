"use client";

import { mergeLinkedExpenses, recentBoughtSince, type GroceryItem } from "@kinwoo/core/grocery";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  fetchBoughtItems,
  fetchCategories,
  fetchItem,
  fetchItemActivity,
  fetchItems,
  fetchList,
  fetchLists,
  fetchOverview,
  fetchPrivatePurchases,
  fetchRecentActivity,
} from "./api";
import { groceryKeys } from "./keys";

export function useGroceryLists(houseId: string | null) {
  return useQuery({
    queryKey: groceryKeys.lists(houseId ?? ""),
    queryFn: () => fetchLists(houseId as string),
    enabled: houseId !== null,
  });
}

export function useGroceryList(houseId: string | null, listId: string | null) {
  return useQuery({
    queryKey: groceryKeys.list(houseId ?? "", listId ?? ""),
    queryFn: () => fetchList(houseId as string, listId as string),
    enabled: houseId !== null && listId !== null,
  });
}

// Open items plus recent purchases; useListItemsWithHistory adds older purchases on request.
export function useGroceryItems(houseId: string | null, listId: string | null) {
  return useQuery({
    queryKey: groceryKeys.items(houseId ?? "", listId ?? ""),
    queryFn: () =>
      fetchItems(houseId as string, listId as string, { boughtSince: recentBoughtSince() }),
    enabled: houseId !== null && listId !== null,
  });
}

export function useBoughtHistory(houseId: string | null, listId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: groceryKeys.boughtHistory(houseId ?? "", listId ?? ""),
    queryFn: ({ pageParam }) => fetchBoughtItems(houseId as string, listId as string, pageParam),
    // Starts at the items query's cutoff; any overlap is removed when the pages are merged.
    initialPageParam: recentBoughtSince(),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && houseId !== null && listId !== null,
  });
}

// The items query wins for an item in both: it is refreshed far more often.
export function mergeBoughtHistory(
  items: GroceryItem[],
  pages: readonly { items: GroceryItem[] }[],
): GroceryItem[] {
  if (pages.length === 0) return items;
  const seen = new Set(items.map((item) => item.id));
  const older: GroceryItem[] = [];
  for (const item of pages.flatMap((page) => page.items)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    older.push(item);
  }
  return [...items, ...older];
}

export type ListItemsWithHistory = {
  items: GroceryItem[] | undefined;
  // True until the history has been read to the end.
  hasOlder: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
};

// The Bought tab's view of a list: the items query plus whichever older pages were asked for.
export function useListItemsWithHistory(
  houseId: string | null,
  listId: string | null,
): ListItemsWithHistory {
  const { data: items } = useGroceryItems(houseId, listId);
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const requested = listId !== null && requestedFor === listId;
  const history = useBoughtHistory(houseId, listId, requested);

  const merged = useMemo(
    () => (items ? mergeBoughtHistory(items, history.data?.pages ?? []) : undefined),
    [items, history.data],
  );

  return {
    items: merged,
    hasOlder: !requested || history.hasNextPage || history.isPending,
    loadingOlder: requested && (history.isFetching || history.isPending),
    loadOlder: () => {
      if (!requested) setRequestedFor(listId);
      else if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
    },
  };
}

export function useGroceryItem(
  houseId: string | null,
  listId: string | null,
  itemId: string | null,
) {
  return useQuery({
    queryKey: groceryKeys.item(houseId ?? "", listId ?? "", itemId ?? ""),
    queryFn: () => fetchItem(houseId as string, listId as string, itemId as string),
    enabled: houseId !== null && listId !== null && itemId !== null,
  });
}

export function useGroceryCategories(houseId: string | null) {
  return useQuery({
    queryKey: groceryKeys.categories(houseId ?? ""),
    queryFn: () => fetchCategories(houseId as string),
    enabled: houseId !== null,
    staleTime: 5 * 60 * 1000, // categories don't change often
  });
}

export function useGroceryOverview(houseId: string | null) {
  return useQuery({
    queryKey: groceryKeys.overview(houseId ?? ""),
    queryFn: () => fetchOverview(houseId as string),
    enabled: houseId !== null,
  });
}

export function usePrivatePurchases(houseId: string | null) {
  return useQuery({
    queryKey: groceryKeys.privatePurchases(houseId ?? ""),
    queryFn: () => fetchPrivatePurchases(houseId as string),
    enabled: houseId !== null,
  });
}

export function useRecentActivity(houseId: string | null) {
  return useInfiniteQuery({
    queryKey: groceryKeys.recentActivity(houseId ?? ""),
    queryFn: ({ pageParam }) => fetchRecentActivity(houseId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => mergeLinkedExpenses(data.pages.flatMap((page) => page.entries)),
    enabled: houseId !== null,
  });
}

export function useGroceryItemActivity(
  houseId: string | null,
  listId: string | null,
  itemId: string | null,
) {
  return useQuery({
    queryKey: groceryKeys.activity(houseId ?? "", listId ?? "", itemId ?? ""),
    queryFn: () => fetchItemActivity(houseId as string, listId as string, itemId as string),
    enabled: houseId !== null && listId !== null && itemId !== null,
  });
}
