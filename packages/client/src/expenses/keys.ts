export const expenseKeys = {
  all: (houseId: string) => ["expenses", houseId] as const,
  list: (houseId: string) => ["expenses", houseId, "list"] as const,
  detail: (houseId: string, expenseId: string) =>
    ["expenses", houseId, "detail", expenseId] as const,
  balances: (houseId: string) => ["expenses", houseId, "balances"] as const,
};
