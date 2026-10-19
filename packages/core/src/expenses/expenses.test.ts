import { describe, expect, it } from "vitest";

import {
  balanceHeadline,
  buildExpenseParts,
  canManageExpense,
  computeSplit,
  expenseFormSeed,
  expenseYourShare,
  groupExpensesByMonth,
  isSpentOn,
  pairBalanceLabel,
  parseExpenseRpcError,
  shareWeightLabel,
  spentOnFor,
  validateExpenseNote,
  validateExpenseParts,
  validateExpenseTitle,
  type Expense,
} from "./index";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "e1",
    houseId: "h1",
    title: "Electricity",
    amountPaise: 30000,
    category: "utilities",
    note: null,
    spentOn: "2026-10-12",
    splitMethod: "equal",
    createdBy: "a",
    createdByName: "Asha",
    source: null,
    payers: [{ userId: "a", name: "Asha", amountPaise: 30000 }],
    shares: [
      { userId: "a", name: "Asha", sharePaise: 10000, weight: null },
      { userId: "b", name: "Rohan", sharePaise: 10000, weight: null },
      { userId: "c", name: "Meera", sharePaise: 10000, weight: null },
    ],
    createdAt: "2026-10-12T10:00:00Z",
    updatedAt: "2026-10-12T10:00:00Z",
    ...overrides,
  };
}

describe("buildExpenseParts", () => {
  it("keeps equal shares for included members only", () => {
    const split = computeSplit(1000, ["a", "b", "c"], { method: "equal", included: ["a", "b"] });
    const parts = buildExpenseParts({
      splitMethod: "equal",
      payerAmounts: { a: "10" },
      sharesPaise: split.sharesPaise,
      values: {},
    });
    expect(parts).toEqual({
      splitMethod: "equal",
      payers: [{ userId: "a", amountPaise: 1000 }],
      shares: [
        { userId: "a", sharePaise: 500, weight: null },
        { userId: "b", sharePaise: 500, weight: null },
      ],
    });
    expect(validateExpenseParts(1000, parts)).toBe(true);
  });

  it("drops payers left at zero and keeps multiple payers", () => {
    const parts = buildExpenseParts({
      splitMethod: "equal",
      payerAmounts: { a: "6", b: "4", c: "" },
      sharesPaise: { a: 500, b: 500 },
      values: {},
    });
    expect(parts.payers).toEqual([
      { userId: "a", amountPaise: 600 },
      { userId: "b", amountPaise: 400 },
    ]);
  });

  it("records the typed weights for percent splits and rounds to the total", () => {
    const values = { a: "33.33", b: "33.33", c: "33.34" };
    const split = computeSplit(100, ["a", "b", "c"], { method: "percent", values });
    const parts = buildExpenseParts({
      splitMethod: "percent",
      payerAmounts: { a: "1" },
      sharesPaise: split.sharesPaise,
      values,
    });
    expect(parts.shares.map((share) => share.weight)).toEqual([3333, 3333, 3334]);
    expect(parts.shares.reduce((sum, share) => sum + share.sharePaise, 0)).toBe(100);
    expect(validateExpenseParts(100, parts)).toBe(true);
  });

  it("leaves out members with no shares", () => {
    const values = { a: "2", b: "1", c: "" };
    const split = computeSplit(900, ["a", "b", "c"], { method: "shares", values });
    const parts = buildExpenseParts({
      splitMethod: "shares",
      payerAmounts: { b: "9" },
      sharesPaise: split.sharesPaise,
      values,
    });
    expect(parts.shares).toEqual([
      { userId: "a", sharePaise: 600, weight: 200 },
      { userId: "b", sharePaise: 300, weight: 100 },
    ]);
  });

  it("keeps exact amounts as entered", () => {
    const values = { a: "2.50", b: "7.50" };
    const split = computeSplit(1000, ["a", "b"], { method: "exact", values });
    const parts = buildExpenseParts({
      splitMethod: "exact",
      payerAmounts: { a: "10" },
      sharesPaise: split.sharesPaise,
      values,
    });
    expect(parts.shares).toEqual([
      { userId: "a", sharePaise: 250, weight: 250 },
      { userId: "b", sharePaise: 750, weight: 750 },
    ]);
  });
});

describe("validateExpenseParts", () => {
  const good = {
    splitMethod: "equal" as const,
    payers: [{ userId: "a", amountPaise: 1000 }],
    shares: [
      { userId: "a", sharePaise: 500, weight: null },
      { userId: "b", sharePaise: 500, weight: null },
    ],
  };

  it("rejects sums that do not match the amount", () => {
    expect(validateExpenseParts(1200, good)).toBe(false);
    expect(
      validateExpenseParts(1000, { ...good, payers: [{ userId: "a", amountPaise: 900 }] }),
    ).toBe(false);
  });

  it("rejects duplicates, empty sides and a zero amount", () => {
    expect(validateExpenseParts(0, good)).toBe(false);
    expect(validateExpenseParts(1000, { ...good, payers: [] })).toBe(false);
    expect(
      validateExpenseParts(1000, {
        ...good,
        shares: [
          { userId: "a", sharePaise: 500, weight: null },
          { userId: "a", sharePaise: 500, weight: null },
        ],
      }),
    ).toBe(false);
  });

  it("requires weights only for non-equal splits", () => {
    expect(validateExpenseParts(1000, { ...good, splitMethod: "shares" })).toBe(false);
  });
});

describe("expenseFormSeed", () => {
  it("restores excluded members for equal splits", () => {
    const seed = expenseFormSeed(
      expense({ shares: [{ userId: "a", name: "Asha", sharePaise: 30000, weight: null }] }),
      ["a", "b", "c"],
    );
    expect(seed).toEqual({
      payerAmounts: { a: "300" },
      splitMethod: "equal",
      excluded: ["b", "c"],
      values: {},
    });
  });

  it("restores typed values for other splits", () => {
    const seed = expenseFormSeed(
      expense({
        splitMethod: "percent",
        shares: [
          { userId: "a", name: "Asha", sharePaise: 7500, weight: 2500 },
          { userId: "b", name: "Rohan", sharePaise: 22500, weight: 7500 },
        ],
      }),
      ["a", "b"],
    );
    expect(seed.values).toEqual({ a: "25", b: "75" });
    expect(seed.excluded).toEqual([]);
  });
});

describe("ledger labels", () => {
  it("groups by month, keeping order", () => {
    const months = groupExpensesByMonth([
      expense({ id: "1", spentOn: "2026-10-12" }),
      expense({ id: "2", spentOn: "2026-10-01" }),
      expense({ id: "3", spentOn: "2026-09-30" }),
    ]);
    expect(months.map((month) => [month.label, month.expenses.map((e) => e.id)])).toEqual([
      ["October 2026", ["1", "2"]],
      ["September 2026", ["3"]],
    ]);
  });

  it("describes your share", () => {
    expect(expenseYourShare(expense(), "a")).toEqual({ label: "You lent ₹200", tone: "lent" });
    expect(expenseYourShare(expense(), "b")).toEqual({
      label: "You borrowed ₹100",
      tone: "borrowed",
    });
    expect(expenseYourShare(expense(), "z").label).toBe("Not involved");
  });

  it("labels typed weights", () => {
    expect(shareWeightLabel(expense({ splitMethod: "percent" }), 3333)).toBe("33.33%");
    expect(shareWeightLabel(expense({ splitMethod: "shares" }), 100)).toBe("1 share");
    expect(shareWeightLabel(expense({ splitMethod: "shares" }), 150)).toBe("1.5 shares");
    expect(shareWeightLabel(expense({ splitMethod: "exact" }), 150)).toBeNull();
  });

  it("lets the creator, admins and participants manage", () => {
    const item = expense({ createdBy: "x" });
    expect(canManageExpense(item, "x", false)).toBe(true);
    expect(canManageExpense(item, "b", false)).toBe(true);
    expect(canManageExpense(item, "z", true)).toBe(true);
    expect(canManageExpense(item, "z", false)).toBe(false);
    expect(canManageExpense(item, null, true)).toBe(false);
  });

  it("summarises balances", () => {
    expect(
      balanceHeadline({
        netPaise: 57000,
        pairs: [
          { userId: "b", name: "Asha", avatarUrl: null, netPaise: 72000 },
          { userId: "c", name: "Rohan", avatarUrl: null, netPaise: -15000 },
        ],
      }),
    ).toBe("You're owed ₹570 overall");
    expect(balanceHeadline({ netPaise: -100, pairs: [] })).toBe("You owe ₹1 overall");
    expect(balanceHeadline({ netPaise: 0, pairs: [] })).toBe("All settled up");
    expect(pairBalanceLabel({ userId: "b", name: "Asha", avatarUrl: null, netPaise: 42000 })).toBe(
      "Asha owes you ₹420",
    );
    expect(pairBalanceLabel({ userId: "c", name: null, avatarUrl: null, netPaise: -15000 })).toBe(
      "You owe Housemate ₹150",
    );
  });
});

describe("expense validation", () => {
  it("collapses titles and rejects empty ones", () => {
    expect(validateExpenseTitle("  Gas   bill ")).toEqual({ ok: true, value: "Gas bill" });
    expect(validateExpenseTitle("  ")).toEqual({ ok: false, error: "empty" });
    expect(validateExpenseTitle("x".repeat(81))).toEqual({ ok: false, error: "too-long" });
  });

  it("treats a blank note as none", () => {
    expect(validateExpenseNote("  ")).toEqual({ ok: true, value: null });
    expect(validateExpenseNote("x".repeat(501))).toEqual({ ok: false });
  });

  it("checks calendar dates", () => {
    expect(isSpentOn("2026-02-28")).toBe(true);
    expect(isSpentOn("2026-02-30")).toBe(false);
    expect(isSpentOn("2026-2-3")).toBe(false);
    expect(spentOnFor(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("reads RPC error codes", () => {
    expect(parseExpenseRpcError(" PRIVATE_LIST ")).toBe("PRIVATE_LIST");
    expect(parseExpenseRpcError("boom")).toBeNull();
  });
});
