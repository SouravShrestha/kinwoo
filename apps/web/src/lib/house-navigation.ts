import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function markBoughtPath(listId: string, itemId: string) {
  return `/item/bought?listId=${encodeURIComponent(listId)}&itemId=${encodeURIComponent(itemId)}`;
}

export function batchMarkBoughtPath(listId: string, itemIds: readonly string[]) {
  const ids = itemIds.map(encodeURIComponent).join(",");
  return `/item/bought-batch?listId=${encodeURIComponent(listId)}&itemIds=${ids}`;
}

export const NEW_EXPENSE_PATH = "/expense/new";

export function expensePath(expenseId: string) {
  return `/expense/${encodeURIComponent(expenseId)}`;
}

export function editExpensePath(expenseId: string) {
  return `${expensePath(expenseId)}/edit`;
}

export function useHouseNavigation() {
  const router = useRouter();

  return useMemo(
    () => ({
      goHome: () => router.replace("/"),
      // A direct visit or a shared link has nothing behind it to go back to.
      goBack: () => (window.history.length > 1 ? router.back() : router.replace("/")),
    }),
    [router],
  );
}
