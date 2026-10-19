import { ExpenseDetailScreen } from "@/components/expenses/ExpenseDetailScreen";

export const metadata = { title: "Expense" };

export default async function ExpensePage({ params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;
  return <ExpenseDetailScreen expenseId={expenseId} />;
}
