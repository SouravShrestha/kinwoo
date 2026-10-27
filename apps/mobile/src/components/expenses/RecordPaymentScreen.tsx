import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useRecordSettlement } from "@kinwoo/client/expenses";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { paiseToAmountDraft, paymentHeading } from "@kinwoo/core/expenses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useEffect } from "react";

import { PaymentForm, type PaymentFormData } from "@/components/expenses/PaymentForm";
import { goBack, goToExpenses } from "@/lib/house-navigation";

export function RecordPaymentScreen({
  houseId,
  payerId,
  payeeId,
  amountPaise: suggestedPaise,
}: {
  houseId: string;
  payerId: string | null;
  payeeId: string | null;
  amountPaise: number;
}) {
  const { user } = useAuth();
  const { data: members } = useHouseMembers(houseId);
  const recordSettlement = useRecordSettlement(houseId);
  const valid = payerId !== null && payeeId !== null && payerId !== payeeId;

  useEffect(() => {
    if (!valid) goBack();
  }, [valid]);

  let data: PaymentFormData | null = null;
  if (valid && members) {
    const payer = members.find((member) => member.userId === payerId);
    const payee = members.find((member) => member.userId === payeeId);
    const other = payerId === user?.id ? payee : payeeId === user?.id ? payer : undefined;
    data = {
      payer: { name: payer?.displayName ?? null, url: payer?.avatarUrl ?? null },
      payee: { name: payee?.displayName ?? null, url: payee?.avatarUrl ?? null },
      heading: paymentHeading(
        { id: payerId, name: payer?.displayName ?? null },
        { id: payeeId, name: payee?.displayName ?? null },
        user?.id ?? null,
      ),
      email: other?.email ?? null,
      initialAmount: paiseToAmountDraft(suggestedPaise),
    };
  }

  const record = async (amountPaise: number) => {
    if (!valid) return;
    try {
      await recordSettlement.mutateAsync({ payerId, payeeId, amountPaise });
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't record that payment. Try again."));
      return;
    }
    toast.success(TOAST_MESSAGES.paymentRecorded);
    goToExpenses();
  };

  return (
    <PaymentForm
      data={data}
      note="You are recording a payment that happened outside Kinwoo. No money will be moved."
      submitLabel="Record payment"
      submitting={recordSettlement.isPending}
      onSubmit={(amountPaise) => void record(amountPaise)}
    />
  );
}
