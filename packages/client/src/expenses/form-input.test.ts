import { computeSplit } from "@kinwoo/core/expenses";
import { describe, expect, it } from "vitest";

import { expenseInputFromForm, expensePartsFromForms } from "./form-input";

const members = ["a", "b"];

function equalParts(total: number, payers: Record<string, string> = { a: "24" }) {
  const split = computeSplit(total, members, { method: "equal", included: members });
  return expensePartsFromForms(
    { amounts: payers },
    { method: "equal", sharesPaise: split.sharesPaise, values: {} },
  );
}

describe("expenseInputFromForm", () => {
  it("maps the form into an expense input", () => {
    const result = expenseInputFromForm({
      title: " Electricity ",
      amount: "24",
      category: "utilities",
      note: "  October ",
      date: new Date(2026, 9, 12),
      parts: equalParts(2400),
    });

    expect(result).toEqual({
      ok: true,
      input: {
        title: "Electricity",
        amountPaise: 2400,
        category: "utilities",
        note: "October",
        spentOn: "2026-10-12",
        parts: {
          splitMethod: "equal",
          payers: [{ userId: "a", amountPaise: 2400 }],
          shares: [
            { userId: "a", sharePaise: 1200, weight: null },
            { userId: "b", sharePaise: 1200, weight: null },
          ],
        },
      },
    });
  });

  it("points at the first invalid field", () => {
    const base = {
      title: "Gas",
      amount: "24",
      category: "utilities" as const,
      note: "",
      date: new Date(2026, 9, 12),
      parts: equalParts(2400),
    };

    expect(expenseInputFromForm({ ...base, title: " " })).toMatchObject({ field: "title" });
    expect(expenseInputFromForm({ ...base, amount: "" })).toMatchObject({ field: "amount" });
    expect(expenseInputFromForm({ ...base, amount: "abc" })).toMatchObject({ field: "amount" });
    expect(expenseInputFromForm({ ...base, note: "x".repeat(501) })).toMatchObject({
      field: "note",
    });
    expect(expenseInputFromForm({ ...base, parts: equalParts(2400, { a: "20" }) })).toMatchObject({
      field: "split",
    });
  });
});
