import { describe, expect, it } from "vitest";

import { suggestExpenseCategory } from "./suggest-category";

describe("suggestExpenseCategory", () => {
  it.each([
    ["March rent", "rent"],
    ["Electricity bill", "utilities"],
    ["Vegetables and fruits", "groceries"],
    ["Airtel broadband", "internet"],
    ["Dinner at Zomato", "food"],
    ["Uber to airport", "transport"],
    ["Myntra order", "shopping"],
    ["Movie tickets at PVR", "entertainment"],
    ["Netflix subscription", "subscriptions"],
    ["MakeMyTrip flight booking", "travel"],
    ["Apollo Pharmacy medicines", "health"],
    ["Haircut at salon", "personal_care"],
    ["New shoes from Bata", "clothing"],
    ["AC servicing", "maintenance"],
    ["LIC premium payment", "insurance"],
    ["Personal loan EMI", "loan_emi"],
    ["School fees", "education"],
    ["Gym membership", "fitness"],
    ["Dog food", "pets"],
    ["Daycare fees", "childcare"],
    ["IKEA furniture", "furniture"],
    ["Birthday gift", "gifts"],
    ["Income tax filing", "taxes"],
  ])("%s -> %s", (title, category) => {
    expect(suggestExpenseCategory(title)).toBe(category);
  });

  it("returns null when nothing matches and ignores partial words", () => {
    expect(suggestExpenseCategory("Own thing")).toBeNull();
    expect(suggestExpenseCategory("Melonade")).toBeNull();
  });
});
