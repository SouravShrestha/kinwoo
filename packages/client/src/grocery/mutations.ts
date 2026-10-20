"use client";

import {
  DEFAULT_ITEM_URGENCY,
  type AddItemInput,
  type CreateListInput,
  type GroceryItem,
  type MarkBoughtInput,
  type MarkItemsBoughtInput,
  type UpdateItemInput,
  type UpdateListInput,
} from "@kinwoo/core/grocery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addItem,
  assignItem,
  assignItems,
  claimItem,
  claimItems,
  createList,
  deleteItem,
  deleteItems,
  deleteList,
  markBought,
  markItemsBought,
  unassignItem,
  updateItem,
  updateList,
} from "./api";
import { expenseKeys } from "../expenses/keys";
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

// The placeholder row stands in until the server answers; its id is derived from the idempotency
// key so the real row can replace it.
export function optimisticItem(
  input: Omit<AddItemInput, "listId">,
  listId: string,
  createdBy: string,
  now: string = new Date().toISOString(),
): GroceryItem {
  return {
    id: `optimistic:${input.idempotencyKey}`,
    listId,
    name: input.name.trim(),
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    categoryId: input.categoryId ?? null,
    categoryName: null,
    urgency: input.urgency ?? DEFAULT_ITEM_URGENCY,
    status: "pending",
    claimedBy: null,
    claimedByName: null,
    assignedTo: null,
    assignedToName: null,
    assignedBy: null,
    assignmentResponse: null,
    boughtBy: null,
    boughtByName: null,
    purchase: null,
    note: input.note ?? null,
    position: Number.MAX_SAFE_INTEGER,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function useAddItem(houseId: string, listId: string, currentUserId = "") {
  const queryClient = useQueryClient();
  const itemsKey = groceryKeys.items(houseId, listId);

  return useMutation({
    mutationFn: (input: Omit<AddItemInput, "listId"> | AddItemInput) =>
      addItem(houseId, { ...input, listId }),
    // Quick add is the most frequent action, so the item shows before the round trip finishes.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const placeholder = optimisticItem(input, listId, currentUserId);
      queryClient.setQueryData<GroceryItem[]>(itemsKey, (old) =>
        old ? [...old, placeholder] : old,
      );
      return { placeholderId: placeholder.id };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      queryClient.setQueryData<GroceryItem[]>(itemsKey, (old) =>
        old?.filter((item) => item.id !== context.placeholderId),
      );
    },
    onSuccess: (item, _input, context) => {
      queryClient.setQueryData<GroceryItem[]>(itemsKey, (old) =>
        old?.map((entry) => (entry.id === context?.placeholderId ? item : entry)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
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
      if (variables.input.expense) {
        void queryClient.invalidateQueries({ queryKey: expenseKeys.all(houseId) });
      }
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
    onSettled: (_data, _error, { itemIds, expense }) => {
      void queryClient.invalidateQueries({ queryKey: itemsKey });
      if (expense) void queryClient.invalidateQueries({ queryKey: expenseKeys.all(houseId) });
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

export function useDeleteItems(houseId: string, listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemIds: string[]) => deleteItems(houseId, listId, itemIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryKeys.items(houseId, listId) });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
    },
  });
}
