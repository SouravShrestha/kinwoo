import { describe, expect, it } from "vitest";

import { suggestExpenseCategory } from "./suggest-category";

describe("suggestExpenseCategory", () => {
  it.each([
    ["March rent", "rent"],
    ["Electricity bill", "utilities"],
    ["Vegetables and fruits", "groceries"],
    ["Airtel broadband", "internet"],
    ["Dinner at Zomato", "food_dining"],
    ["Uber to airport", "transport"],
  ])("%s -> %s", (title, category) => {
    expect(suggestExpenseCategory(title)).toBe(category);
  });

  it("returns null when nothing matches and ignores partial words", () => {
    expect(suggestExpenseCategory("Birthday gift")).toBeNull();
    expect(suggestExpenseCategory("Melonade")).toBeNull();
  });
});
