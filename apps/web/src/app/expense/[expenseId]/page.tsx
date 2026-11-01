import { ExpenseDetailScreen } from "@/components/expenses/ExpenseDetailScreen";

export const metadata = { title: "Expense" };

export default async function ExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ private?: string }>;
}) {
  const { expenseId } = await params;
  const { private: isPrivate } = await searchParams;
  return <ExpenseDetailScreen expenseId={expenseId} isPrivate={isPrivate === "1"} />;
}
