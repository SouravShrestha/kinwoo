export const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "groceries",
  "internet",
  "household",
  "food_dining",
  "transport",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  groceries: "Groceries",
  internet: "Internet",
  household: "Household",
  food_dining: "Food & dining",
  transport: "Transport",
  other: "Other",
};

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "other";
export const DEFAULT_GROCERY_EXPENSE_CATEGORY: ExpenseCategory = "groceries";

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly unknown[]).includes(value);
}
