import { useLocalSearchParams } from "expo-router";

import { ExpenseDetailScreen } from "@/components/expenses/ExpenseDetailScreen";

export default function ExpenseRoute() {
  const { expenseId, private: isPrivate } = useLocalSearchParams<{
    expenseId?: string;
    private?: string;
  }>();
  return <ExpenseDetailScreen expenseId={expenseId ?? null} isPrivate={isPrivate === "1"} />;
}
