import { useLocalSearchParams } from "expo-router";

import { ExpenseDetailScreen } from "@/components/expenses/ExpenseDetailScreen";

export default function ExpenseRoute() {
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();
  return <ExpenseDetailScreen expenseId={expenseId ?? null} />;
}
