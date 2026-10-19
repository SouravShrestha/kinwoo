import type { ExpenseCategory } from "./categories";
import type { SplitMethod } from "./splits";

export type ExpensePayerPart = { userId: string; amountPaise: number };

// `weight` is what the user typed for exact, percent and shares splits, in hundredths, so the
// split can be reopened as entered. Equal splits have no weight.
export type ExpenseSharePart = { userId: string; sharePaise: number; weight: number | null };

export type ExpenseParts = {
  splitMethod: SplitMethod;
  payers: ExpensePayerPart[];
  shares: ExpenseSharePart[];
};

// The split recorded alongside a grocery purchase; title and amount come from the purchase.
export type LinkedExpenseInput = ExpenseParts & { spentOn: string };

export type ExpensePayer = ExpensePayerPart & { name: string | null };

export type ExpenseShare = ExpenseSharePart & { name: string | null };

export type ExpenseSource = { kind: "purchase" | "batch"; id: string };

export type Expense = {
  id: string;
  houseId: string;
  title: string;
  amountPaise: number;
  category: ExpenseCategory;
  note: string | null;
  spentOn: string;
  splitMethod: SplitMethod;
  createdBy: string;
  createdByName: string | null;
  source: ExpenseSource | null;
  payers: ExpensePayer[];
  shares: ExpenseShare[];
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  title: string;
  amountPaise: number;
  category: ExpenseCategory;
  note: string | null;
  spentOn: string;
  parts: ExpenseParts;
};

export type ExpensePage = {
  expenses: Expense[];
  nextCursor: string | null;
};

// Positive `netPaise` means they owe you; negative means you owe them.
export type PairBalance = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  netPaise: number;
};

export type HouseBalances = {
  netPaise: number;
  pairs: PairBalance[];
};

// Positive `netPaise` means the house owes this member overall.
export type MemberNet = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  netPaise: number;
  isSelf: boolean;
};
