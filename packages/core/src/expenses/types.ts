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

// One item of a batch purchase; id is the item's id.
export type PurchaseLine = {
  id: string;
  name: string;
  categoryName: string | null;
  pricePaise: number | null;
};

export type ItemPriceInput = { itemId: string; pricePaise: number | null };

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
  updatedBy: string | null;
  updatedByName: string | null;
  source: ExpenseSource | null;
  // The grocery category of the item bought (the first item of a batch), for its icon.
  itemCategoryName: string | null;
  // The items of a batch purchase, on an expense fetched on its own; absent from list pages.
  lines?: PurchaseLine[];
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
  // Batch expenses only: new prices for some of its items.
  itemPrices?: ItemPriceInput[];
};

// The payer handed money to the payee outside the app.
export type SettlementInput = { payerId: string; payeeId: string; amountPaise: number };

export type Settlement = SettlementInput & {
  id: string;
  houseId: string;
  payerName: string | null;
  payerAvatarUrl: string | null;
  payeeName: string | null;
  payeeAvatarUrl: string | null;
  createdBy: string;
  createdAt: string;
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
