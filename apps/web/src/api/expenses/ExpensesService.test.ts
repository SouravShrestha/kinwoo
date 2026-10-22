import type { ExpenseInput } from "@kinwoo/core/expenses";
import { describe, expect, it, vi } from "vitest";

import { ExpensesService } from "./ExpensesService";
import {
  ExpensesRepositoryError,
  type Expense,
  type IExpensesRepository,
} from "./IExpensesRepository";

const STORED = { id: "e1" } as Expense;

function serviceWith(overrides: Partial<IExpensesRepository> = {}) {
  const repository = {
    listExpenses: vi.fn().mockResolvedValue([]),
    findExpense: vi.fn().mockResolvedValue(STORED),
    createExpense: vi.fn().mockResolvedValue("e1"),
    updateExpense: vi.fn().mockResolvedValue(undefined),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    getBalances: vi.fn().mockResolvedValue({ netPaise: 0, pairs: [] }),
    getMemberNets: vi.fn().mockResolvedValue([]),
    getTotals: vi.fn().mockResolvedValue([]),
    setSimplifyDebts: vi.fn().mockResolvedValue(undefined),
    recordSettlement: vi.fn().mockResolvedValue("s1"),
    listSettlements: vi.fn().mockResolvedValue([]),
    updateSettlement: vi.fn().mockResolvedValue(undefined),
    deleteSettlement: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies IExpensesRepository;
  return { service: new ExpensesService(repository), repository };
}

function input(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    title: "  Electricity   bill ",
    amountPaise: 240000,
    category: "utilities",
    note: "  ",
    spentOn: "2026-10-12",
    parts: {
      splitMethod: "equal",
      payers: [{ userId: "a", amountPaise: 240000 }],
      shares: [
        { userId: "a", sharePaise: 120000, weight: null },
        { userId: "b", sharePaise: 120000, weight: null },
      ],
    },
    ...overrides,
  };
}

describe("createExpense", () => {
  it("normalises the title and note, then returns the stored expense", async () => {
    const { service, repository } = serviceWith();

    const result = await service.createExpense("h1", input());

    expect(result).toEqual({ ok: true, data: STORED });
    expect(repository.createExpense).toHaveBeenCalledWith(
      "h1",
      expect.objectContaining({ title: "Electricity bill", note: null }),
    );
    expect(repository.findExpense).toHaveBeenCalledWith("h1", "e1");
  });

  it("rejects parts that do not add up", async () => {
    const { service, repository } = serviceWith();

    const result = await service.createExpense("h1", input({ amountPaise: 100 }));

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(repository.createExpense).not.toHaveBeenCalled();
  });

  it("rejects unknown categories and bad dates", async () => {
    const { service } = serviceWith();

    expect(
      await service.createExpense("h1", input({ category: "bogus" as ExpenseInput["category"] })),
    ).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(await service.createExpense("h1", input({ spentOn: "2026-13-01" }))).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
  });

  it("maps RPC errors", async () => {
    const { service } = serviceWith({
      createExpense: vi
        .fn()
        .mockRejectedValue(new ExpensesRepositoryError("NOT_A_MEMBER", "NOT_A_MEMBER")),
    });

    expect(await service.createExpense("h1", input())).toMatchObject({
      ok: false,
      code: "NOT_A_MEMBER",
    });
  });
});

describe("updateExpense and deleteExpense", () => {
  it("passes permission errors through", async () => {
    const forbidden = new ExpensesRepositoryError("FORBIDDEN", "FORBIDDEN");
    const { service } = serviceWith({
      updateExpense: vi.fn().mockRejectedValue(forbidden),
      deleteExpense: vi.fn().mockRejectedValue(forbidden),
    });

    expect(await service.updateExpense("h1", "e1", input())).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(await service.deleteExpense("e1")).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("returns the updated expense", async () => {
    const { service, repository } = serviceWith();

    expect(await service.updateExpense("h1", "e1", input())).toEqual({ ok: true, data: STORED });
    expect(repository.updateExpense).toHaveBeenCalledWith("e1", expect.anything());
  });
});

describe("listExpenses", () => {
  it("returns a cursor only when there is another page", async () => {
    const rows = Array.from({ length: 31 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      spentOn: "2026-10-01",
      createdAt: "2026-10-01T10:00:00Z",
    })) as Expense[];
    const { service } = serviceWith({ listExpenses: vi.fn().mockResolvedValue(rows) });

    const result = await service.listExpenses("h1", null);

    expect(result.ok && result.data.expenses).toHaveLength(30);
    expect(result.ok && result.data.nextCursor).toBe(
      `2026-10-01|2026-10-01T10:00:00Z|${rows[29]?.id}`,
    );
  });
});

describe("setSimplifyDebts", () => {
  it("saves the setting through the repository", async () => {
    const { service, repository } = serviceWith();

    expect(await service.setSimplifyDebts("h1", true)).toEqual({ ok: true, data: null });
    expect(repository.setSimplifyDebts).toHaveBeenCalledWith("h1", true);
  });

  it("reports a refusal from the database", async () => {
    const { service } = serviceWith({
      setSimplifyDebts: vi
        .fn()
        .mockRejectedValue(new ExpensesRepositoryError("FORBIDDEN", "FORBIDDEN")),
    });

    expect(await service.setSimplifyDebts("h1", true)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});

describe("getBalances", () => {
  it("returns the repository balances", async () => {
    const balances = { netPaise: 100, pairs: [] };
    const { service } = serviceWith({ getBalances: vi.fn().mockResolvedValue(balances) });

    expect(await service.getBalances("h1", false)).toEqual({ ok: true, data: balances });
  });

  it("simplifies from every member's net when asked", async () => {
    const { service, repository } = serviceWith({
      getMemberNets: vi.fn().mockResolvedValue([
        { userId: "a", name: "Asha", avatarUrl: null, netPaise: 10000, isSelf: false },
        { userId: "b", name: "Rohan", avatarUrl: null, netPaise: 0, isSelf: false },
        { userId: "c", name: "Meera", avatarUrl: null, netPaise: -10000, isSelf: true },
      ]),
    });

    expect(await service.getBalances("h1", true)).toEqual({
      ok: true,
      data: {
        netPaise: -10000,
        pairs: [{ userId: "a", name: "Asha", avatarUrl: null, netPaise: -10000 }],
      },
    });
    expect(repository.getBalances).not.toHaveBeenCalled();
  });
});

describe("listSettlements", () => {
  it("returns the house's payments", async () => {
    const rows = [{ id: "s1" }];
    const { service, repository } = serviceWith({
      listSettlements: vi.fn().mockResolvedValue(rows),
    });
    expect(await service.listSettlements("h1")).toEqual({ ok: true, data: rows });
    expect(repository.listSettlements).toHaveBeenCalledWith("h1", expect.any(Number));
  });
});

describe("updating and deleting payments", () => {
  it("passes the new amount through and rejects empty ones", async () => {
    const { service, repository } = serviceWith();
    expect(await service.updateSettlement("s1", 5000)).toEqual({ ok: true, data: null });
    expect(repository.updateSettlement).toHaveBeenCalledWith("s1", 5000);
    expect(await service.updateSettlement("s1", 0)).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(repository.updateSettlement).toHaveBeenCalledTimes(1);
  });

  it("deletes a payment and maps refusals", async () => {
    const { service } = serviceWith();
    expect(await service.deleteSettlement("s1")).toEqual({ ok: true, data: null });
    const refused = serviceWith({
      deleteSettlement: vi
        .fn()
        .mockRejectedValue(new ExpensesRepositoryError("FORBIDDEN", "FORBIDDEN")),
    });
    expect(await refused.service.deleteSettlement("s1")).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});

describe("recordSettlement", () => {
  const settlement = { payerId: "a", payeeId: "b", amountPaise: 4000 };

  it("records the payment and returns its id", async () => {
    const { service, repository } = serviceWith();
    expect(await service.recordSettlement("h1", settlement)).toEqual({
      ok: true,
      data: { id: "s1" },
    });
    expect(repository.recordSettlement).toHaveBeenCalledWith("h1", settlement);
  });

  it("rejects empty amounts and paying yourself before reaching the database", async () => {
    const { service, repository } = serviceWith();
    expect(await service.recordSettlement("h1", { ...settlement, amountPaise: 0 })).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(await service.recordSettlement("h1", { ...settlement, payeeId: "a" })).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(repository.recordSettlement).not.toHaveBeenCalled();
  });

  it("maps database refusals", async () => {
    const { service } = serviceWith({
      recordSettlement: vi
        .fn()
        .mockRejectedValue(new ExpensesRepositoryError("FORBIDDEN", "FORBIDDEN")),
    });
    expect(await service.recordSettlement("h1", settlement)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});
