import { PaymentDetailScreen } from "@/components/expenses/PaymentDetailScreen";

export const metadata = { title: "Payment" };

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ settlementId: string }>;
}) {
  const { settlementId } = await params;
  return <PaymentDetailScreen settlementId={settlementId} />;
}
