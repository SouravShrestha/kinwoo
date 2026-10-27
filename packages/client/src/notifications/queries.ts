import type { GroceryActivityEntry } from "@kinwoo/core/grocery";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "./api";

export const notificationsKey = (userId: string) => ["notifications", userId] as const;

export function useNotifications(userId: string | null) {
  return useQuery({
    queryKey: notificationsKey(userId ?? ""),
    queryFn: fetchNotifications,
    enabled: userId !== null,
    // New ones arrive while the app is closed, so every visit starts from the server.
    refetchOnMount: "always",
  });
}

// Greys rows out straight away and restores them if the server refuses.
function useMarkRead<Variables>(
  userId: string | null,
  mutationFn: (variables: Variables) => Promise<void>,
  applies: (entry: GroceryActivityEntry, variables: Variables) => boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = notificationsKey(userId ?? "");

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GroceryActivityEntry[]>(queryKey);
      queryClient.setQueryData<GroceryActivityEntry[]>(queryKey, (entries) =>
        entries?.map((entry) =>
          !entry.readAt && applies(entry, variables)
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useMarkNotificationRead(userId: string | null) {
  return useMarkRead(userId, markNotificationRead, (entry, id: string) => entry.id === id);
}

export function useMarkAllNotificationsRead(userId: string | null) {
  return useMarkRead(userId, markAllNotificationsRead, () => true);
}
