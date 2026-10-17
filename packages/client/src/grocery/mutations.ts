"use client";

import type {
  AddItemInput,
  CreateListInput,
  GroceryItem,
  MarkBoughtInput,
  MarkItemsBoughtInput,
  UpdateItemInput,
  UpdateListInput,
} from "@kinwoo/core/grocery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addCategory,
  addItem,
  assignItem,
  assignItems,
  claimItem,
  claimItems,
  createList,
  deleteItem,
  deleteList,
  markBought,
  markItemsBought,
  moveItem,
  respondToAssignment,
  unassignItem,
  unclaimItem,
  updateItem,
  updateList,
} from "./api";
import { groceryKeys } from "./keys";

export function useCreateList(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateListInput) => createList(houseId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.lists(houseId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}

export function useUpdateList(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateListInput) => updateList(houseId, listId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.list(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.lists(houseId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}

export function useDeleteList(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deleteList(houseId, listId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.lists(houseId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}

export function useAddItem(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<AddItemInput, "listId"> | AddItemInput) =>
      addItem(houseId, { ...input, listId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}

export function useUpdateItem(houseId: string, listId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem(houseId, listId, itemId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.item(houseId, listId, itemId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}

export function useClaimItem(
  houseId: string,
  listId: string,
  currentUserId: string,
  currentUserName: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => claimItem(houseId, listId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: groceryKeys.items(houseId, listId) });
      const previous = queryClient.getQueryData<GroceryItem[]>(groceryKeys.items(houseId, listId));
      queryClient.setQueryData<GroceryItem[]>(
        groceryKeys.items(houseId, listId),
        (old) =>
          old?.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "claimed" as const,
                  claimedBy: currentUserId,
                  claimedByName: currentUserName,
                }
              : item,
          ) ?? old,
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groceryKeys.items(houseId, listId), context.previous);
      }
    },
    onSuccess: (result) => {
      if (!result.claimed) {
        void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
        void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      }
    },
    onSettled: (_data, _error, itemId) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, itemId),
      });
    },
  });
}

export function useUnclaimItem(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => unclaimItem(houseId, listId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: groceryKeys.items(houseId, listId) });
      const previous = queryClient.getQueryData<GroceryItem[]>(groceryKeys.items(houseId, listId));
      queryClient.setQueryData<GroceryItem[]>(
        groceryKeys.items(houseId, listId),
        (old) =>
          old?.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "pending" as const,
                  claimedBy: null,
                  claimedByName: null,
                }
              : item,
          ) ?? old,
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groceryKeys.items(houseId, listId), context.previous);
      }
    },
    onSettled: (_data, _error, itemId) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, itemId),
      });
    },
  });
}

export function useUnassignItem(houseId: string, listId: string) {
  const queryClient = useQueryClient();
  const itemsKey = groceryKeys.items(houseId, listId);
  return useMutation({
    mutationFn: (itemId: string) => unassignItem(houseId, listId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<GroceryItem[]>(itemsKey);
      queryClient.setQueryData<GroceryItem[]>(
        itemsKey,
        (old) =>
          old?.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "pending" as const,
                  claimedBy: null,
                  claimedByName: null,
                  assignedTo: null,
                  assignedToName: null,
                  assignedBy: null,
                  assignmentResponse: null,
                }
              : item,
          ) ?? old,
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(itemsKey, context.previous);
    },
    onSettled: (_data, _error, itemId) => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, itemId),
      });
    },
  });
}

export function useAssignItem(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, assignedTo }: { itemId: string; assignedTo: string }) =>
      assignItem(houseId, listId, itemId, assignedTo),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, variables.itemId),
      });
    },
  });
}

export type AssignItemsVariables = {
  itemIds: string[];
  assignedTo: string;
  assignedToName: string | null;
};

export function useAssignItems(houseId: string, listId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const itemsKey = groceryKeys.items(houseId, listId);

  return useMutation({
    mutationFn: ({ itemIds, assignedTo }: AssignItemsVariables) =>
      assignItems(houseId, listId, itemIds, assignedTo),
    onMutate: async ({ itemIds, assignedTo, assignedToName }) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<GroceryItem[]>(itemsKey);
      const targets = new Set(itemIds);
      queryClient.setQueryData<GroceryItem[]>(
        itemsKey,
        (old) =>
          old?.map((item) =>
            targets.has(item.id) && item.status === "pending"
              ? {
                  ...item,
                  status: "assigned" as const,
                  assignedTo,
                  assignedToName,
                  assignedBy: currentUserId,
                  assignmentResponse: null,
                }
              : item,
          ) ?? old,
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(itemsKey, context.previous);
    },
    onSettled: (_data, _error, { itemIds }) => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      for (const itemId of itemIds) {
        void queryClient.invalidateQueries({
          queryKey: groceryKeys.activity(houseId, listId, itemId),
        });
      }
    },
  });
}

export function useClaimItems(
  houseId: string,
  listId: string,
  currentUserId: string,
  currentUserName: string | null,
) {
  const queryClient = useQueryClient();
  const itemsKey = groceryKeys.items(houseId, listId);

  return useMutation({
    mutationFn: (itemIds: string[]) => claimItems(houseId, listId, itemIds),
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<GroceryItem[]>(itemsKey);
      const targets = new Set(itemIds);
      queryClient.setQueryData<GroceryItem[]>(
        itemsKey,
        (old) =>
          old?.map((item) =>
            targets.has(item.id) && item.status === "pending"
              ? {
                  ...item,
                  status: "claimed" as const,
                  claimedBy: currentUserId,
                  claimedByName: currentUserName,
                }
              : item,
          ) ?? old,
      );
      return { previous };
    },
    onError: (_err, _itemIds, context) => {
      if (context?.previous) queryClient.setQueryData(itemsKey, context.previous);
    },
    onSettled: (_data, _error, itemIds) => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      for (const itemId of itemIds) {
        void queryClient.invalidateQueries({
          queryKey: groceryKeys.activity(houseId, listId, itemId),
        });
      }
    },
  });
}

export function useRespondToAssignment(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, accept }: { itemId: string; accept: boolean }) =>
      respondToAssignment(houseId, listId, itemId, accept),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, variables.itemId),
      });
    },
  });
}

export function useMarkBought(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: MarkBoughtInput }) =>
      markBought(houseId, listId, itemId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.item(houseId, listId, variables.itemId),
      });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, variables.itemId),
      });
    },
  });
}

export function useMarkItemsBought(
  houseId: string,
  listId: string,
  currentUserId: string,
  currentUserName: string | null,
) {
  const queryClient = useQueryClient();
  const itemsKey = groceryKeys.items(houseId, listId);

  return useMutation({
    mutationFn: (input: MarkItemsBoughtInput) => markItemsBought(houseId, listId, input),
    onMutate: async ({ itemIds, totalPaise, name, store, itemPricesPaise }) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<GroceryItem[]>(itemsKey);
      const positions = new Map(itemIds.map((id, index) => [id, index]));
      const boughtAt = new Date().toISOString();
      // A placeholder batch keeps the items grouped on the Bought tab until the refetch lands.
      const batch = { id: `optimistic:${itemIds[0]}`, name: name?.trim() || null, totalPaise };
      queryClient.setQueryData<GroceryItem[]>(
        itemsKey,
        (old) =>
          old?.map((item) => {
            const position = positions.get(item.id);
            if (position === undefined || item.status === "bought") return item;
            return {
              ...item,
              status: "bought" as const,
              boughtBy: currentUserId,
              boughtByName: currentUserName,
              purchase: {
                pricePaise: itemPricesPaise?.[position] ?? null,
                store: store?.trim() || null,
                boughtAt,
                batch: { ...batch, position },
              },
            };
          }) ?? old,
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(itemsKey, context.previous);
    },
    onSettled: (_data, _error, { itemIds }) => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      for (const itemId of itemIds) {
        void queryClient.invalidateQueries({
          queryKey: groceryKeys.item(houseId, listId, itemId),
        });
        void queryClient.invalidateQueries({
          queryKey: groceryKeys.activity(houseId, listId, itemId),
        });
      }
    },
  });
}

export function useDeleteItem(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItem(houseId, listId, itemId),
    onSuccess: (_data, itemId) => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.activity(houseId, listId, itemId),
      });
    },
  });
}

export function useMoveItem(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      listId,
      targetListId,
    }: {
      itemId: string;
      listId: string;
      targetListId: string;
    }) => moveItem(houseId, listId, itemId, targetListId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.items(houseId, variables.listId),
      });
      void queryClient.invalidateQueries({
        queryKey: groceryKeys.items(houseId, variables.targetListId),
      });
    },
  });
}

export function useAddCategory(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => addCategory(houseId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.categories(houseId) });
    },
  });
}
