import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { groceryKeys } from "../grocery/keys";
import { refreshHouseMoney } from "./ExpensesRealtime";
import { expenseKeys } from "./keys";

describe("refreshHouseMoney", () => {
  it("refreshes the house's money screens and home feed, not other houses", () => {
    const queryClient = new QueryClient();
    const keys = [
      expenseKeys.list("h1"),
      expenseKeys.balancesView("h1", true),
      expenseKeys.totals("h1"),
      groceryKeys.recentActivity("h1"),
      expenseKeys.list("h2"),
    ];
    for (const key of keys) queryClient.setQueryData(key, []);

    refreshHouseMoney(queryClient, "h1");

    const stale = keys.map((key) => queryClient.getQueryState(key)?.isInvalidated);
    expect(stale).toEqual([true, true, true, true, false]);
  });
});
