import { router } from "expo-router";

export function goHome() {
  router.dismissTo("/");
}

export function openMarkBought(listId: string, itemId: string) {
  router.push({ pathname: "/item/bought", params: { listId, itemId } });
}

export function openBatchMarkBought(listId: string, itemIds: readonly string[]) {
  router.push({ pathname: "/item/bought-batch", params: { listId, itemIds: itemIds.join(",") } });
}

export function openNewExpense() {
  router.push("/expense/new");
}

// A private purchase has no expense; the same screens show it, keyed by its item id.
export function openExpense(expenseId: string, isPrivate = false) {
  router.push({
    pathname: "/expense/[expenseId]",
    params: isPrivate ? { expenseId, private: "1" } : { expenseId },
  });
}

export function openEditExpense(expenseId: string, isPrivate = false) {
  router.push({
    pathname: "/expense/edit",
    params: isPrivate ? { expenseId, private: "1" } : { expenseId },
  });
}

export function openPrivateSpending() {
  router.push("/expenses/private");
}

export function openBalances() {
  router.push("/expenses/balances");
}

export function openSettleUp() {
  router.push("/expenses/settle-up");
}

export function openRecordPayment(payerId: string, payeeId: string, amountPaise: number) {
  router.push({
    pathname: "/expenses/record-payment",
    params: { payerId, payeeId, amountPaise: String(amountPaise) },
  });
}

// Pops the settle-up screens and lands on the expenses tab.
export function goToExpenses() {
  router.dismissTo("/bills");
}

export function openPayment(settlementId: string) {
  router.push({ pathname: "/expenses/payment", params: { settlementId } });
}

export function openTotals() {
  router.push("/expenses/totals");
}

// A deep link can land on a house screen with nothing underneath it to go back to.
export function goBack() {
  if (router.canGoBack()) router.back();
  else goHome();
}
