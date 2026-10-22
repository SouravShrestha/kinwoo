export const expenseKeys = {
  all: (houseId: string) => ["expenses", houseId] as const,
  list: (houseId: string) => ["expenses", houseId, "list"] as const,
  detail: (houseId: string, expenseId: string) =>
    ["expenses", houseId, "detail", expenseId] as const,
  settlements: (houseId: string) => ["expenses", houseId, "settlements"] as const,
  totals: (houseId: string) => ["expenses", houseId, "totals"] as const,
  balances: (houseId: string) => ["expenses", houseId, "balances"] as const,
  memberNets: (houseId: string) => ["expenses", houseId, "balances", "members"] as const,
  balancesView: (houseId: string, simplify: boolean) =>
    ["expenses", houseId, "balances", simplify ? "simplified" : "direct"] as const,
};
