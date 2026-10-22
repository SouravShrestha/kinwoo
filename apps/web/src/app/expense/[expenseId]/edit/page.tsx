import { EditExpenseScreen } from "@/components/expenses/EditExpenseScreen";

export const metadata = { title: "Edit expense" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  return <EditExpenseScreen expenseId={expenseId} />;
}
