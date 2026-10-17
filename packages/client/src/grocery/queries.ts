"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  fetchCategories,
  fetchItem,
  fetchItemActivity,
  fetchItems,
  fetchList,
  fetchLists,
  fetchOverview,
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

export function useGroceryItems(houseId: string | null, listId: string | null) {
  return useQuery({
    queryKey: groceryKeys.items(houseId ?? "", listId ?? ""),
    queryFn: () => fetchItems(houseId as string, listId as string),
    enabled: houseId !== null && listId !== null,
  });
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

export function useRecentActivity(houseId: string | null) {
  return useInfiniteQuery({
    queryKey: groceryKeys.recentActivity(houseId ?? ""),
    queryFn: ({ pageParam }) => fetchRecentActivity(houseId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.entries),
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
