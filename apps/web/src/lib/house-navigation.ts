import { useRouter } from "@/lib/router";
import { useMemo } from "react";

export function markBoughtPath(listId: string, itemId: string) {
  return `/item/bought?listId=${encodeURIComponent(listId)}&itemId=${encodeURIComponent(itemId)}`;
}

export function batchMarkBoughtPath(listId: string, itemIds: readonly string[]) {
  const ids = itemIds.map(encodeURIComponent).join(",");
  return `/item/bought-batch?listId=${encodeURIComponent(listId)}&itemIds=${ids}`;
}

export const NEW_EXPENSE_PATH = "/expense/new";

export const PRIVATE_SPENDING_PATH = "/expenses/private";

export const BALANCES_PATH = "/expenses/balances";

export const TOTALS_PATH = "/expenses/totals";

export const SETTLE_UP_PATH = "/expenses/settle-up";

export function paymentPath(settlementId: string) {
  return `/expenses/payment/${encodeURIComponent(settlementId)}`;
}

export function recordPaymentPath(payerId: string, payeeId: string, amountPaise: number) {
  return `/expenses/record-payment/${encodeURIComponent(payerId)}/${encodeURIComponent(payeeId)}?amountPaise=${amountPaise}`;
}

// A private purchase has no expense; the same screens show it, keyed by its item id.
export function expensePath(expenseId: string, isPrivate = false) {
  return `/expense/${encodeURIComponent(expenseId)}${isPrivate ? "?private=1" : ""}`;
}

export function editExpensePath(expenseId: string, isPrivate = false) {
  return `/expense/${encodeURIComponent(expenseId)}/edit${isPrivate ? "?private=1" : ""}`;
}

export function useHouseNavigation() {
  const router = useRouter();

  return useMemo(
    () => ({
      goHome: () => router.replace("/"),
      goToExpenses: () => router.replace("/bills"),
      // A direct visit or a shared link has nothing behind it to go back to.
      goBack: () => (window.history.length > 1 ? router.back() : router.replace("/")),
    }),
    [router],
  );
}
