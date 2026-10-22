import { describe, expect, it } from "vitest";

import { expenseKeys } from "./keys";

describe("expenseKeys.balancesView", () => {
  it("sits under the balances key so invalidating balances refreshes both views", () => {
    expect(expenseKeys.balancesView("h1", true).slice(0, 3)).toEqual(expenseKeys.balances("h1"));
    expect(expenseKeys.balancesView("h1", false)).not.toEqual(expenseKeys.balancesView("h1", true));
  });
});
