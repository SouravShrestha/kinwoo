import { RecordPaymentScreen } from "@/components/expenses/RecordPaymentScreen";

export const metadata = { title: "Record a payment" };

export default async function RecordPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ payerId: string; payeeId: string }>;
  searchParams: Promise<{ amountPaise?: string }>;
}) {
  const { payerId, payeeId } = await params;
  const suggested = Number.parseInt((await searchParams).amountPaise ?? "", 10);
  return (
    <RecordPaymentScreen
      payerId={payerId}
      payeeId={payeeId}
      amountPaise={Number.isSafeInteger(suggested) ? suggested : 0}
    />
  );
}
