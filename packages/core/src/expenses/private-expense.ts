import type { PrivateTransaction } from "../grocery/private-spending";
import { spentOnFor } from "./ledger";
import type { Expense } from "./types";

// A private purchase shown through the expense screens: you paid all of it and nobody shares it.
export function privateExpenseOf(
  transaction: PrivateTransaction,
  houseId: string,
  userId: string,
  userName: string | null,
): Expense {
  const amountPaise = transaction.amountPaise ?? 0;
  return {
    id: transaction.itemId,
    houseId,
    title: transaction.title,
    amountPaise,
    category: "groceries",
    note: null,
    spentOn: spentOnFor(new Date(transaction.boughtAt)),
    splitMethod: "equal",
    createdBy: userId,
    createdByName: userName,
    updatedBy: null,
    updatedByName: null,
    source: null,
    payers: [{ userId, name: userName, amountPaise }],
    shares: [],
    createdAt: transaction.boughtAt,
    updatedAt: transaction.boughtAt,
  };
}
