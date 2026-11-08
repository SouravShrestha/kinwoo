export const EXPENSE_CATEGORIES = [
  "others",
  "rent",
  "groceries",
  "utilities",
  "food",
  "transport",
  "household",
  "shopping",
  "entertainment",
  "subscriptions",
  "travel",
  "health",
  "personal_care",
  "clothing",
  "maintenance",
  "internet",
  "insurance",
  "loan_emi",
  "education",
  "fitness",
  "pets",
  "childcare",
  "furniture",
  "gifts",
  "taxes",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  others: "Others",
  rent: "Rent",
  groceries: "Groceries",
  utilities: "Utilities",
  food: "Food",
  transport: "Transport",
  household: "Household",
  shopping: "Shopping",
  entertainment: "Entertainment",
  subscriptions: "Subscriptions",
  travel: "Travel",
  health: "Health",
  personal_care: "Personal care",
  clothing: "Clothing",
  maintenance: "Maintenance",
  internet: "Internet",
  insurance: "Insurance",
  loan_emi: "Loan / EMI",
  education: "Education",
  fitness: "Fitness",
  pets: "Pets",
  childcare: "Childcare",
  furniture: "Furniture",
  gifts: "Gifts",
  taxes: "Taxes",
};

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "others";
export const DEFAULT_GROCERY_EXPENSE_CATEGORY: ExpenseCategory = "groceries";

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly unknown[]).includes(value);
}
