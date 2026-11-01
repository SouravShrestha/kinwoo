import { privateExpenseOf } from "@kinwoo/core/expenses";
import { findPrivateTransaction } from "@kinwoo/core/grocery";
import { useMemo } from "react";

import { useAuth } from "../auth/use-auth";
import { usePrivatePurchases } from "./queries";

// A private purchase, as the expense screens expect it. Pass null to stay idle.
export function usePrivateExpense(houseId: string | null, itemId: string | null) {
  const { user } = useAuth();
  const query = usePrivatePurchases(itemId ? houseId : null);
  const userId = user?.id ?? null;
  const userName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const transaction = useMemo(
    () => (query.data && itemId ? findPrivateTransaction(query.data, itemId) : null),
    [query.data, itemId],
  );
  const expense = useMemo(
    () =>
      transaction && houseId && userId
        ? privateExpenseOf(transaction, houseId, userId, userName)
        : undefined,
    [transaction, houseId, userId, userName],
  );

  return {
    expense,
    transaction,
    isError: query.isError || (query.isSuccess && !transaction),
  };
}
