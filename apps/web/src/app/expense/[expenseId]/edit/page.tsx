import { EditExpenseScreen } from "@/components/expenses/EditExpenseScreen";

export const metadata = { title: "Edit expense" };

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ private?: string }>;
}) {
  const { expenseId } = await params;
  const { private: isPrivate } = await searchParams;
  return <EditExpenseScreen expenseId={expenseId} isPrivate={isPrivate === "1"} />;
}
