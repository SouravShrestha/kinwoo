import { RecordPaymentScreen } from "@/components/expenses/RecordPaymentScreen";

export const metadata = { title: "Record a payment" };

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <RecordPaymentScreen userId={userId} />;
}
