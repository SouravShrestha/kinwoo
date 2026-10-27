"use client";

import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useRecordSettlement } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { paiseToAmountDraft, paymentHeading } from "@kinwoo/core/expenses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useEffect, useState } from "react";

import { PaymentForm, type PaymentFormData } from "@/components/expenses/PaymentForm";
import { useHouseNavigation } from "@/lib/house-navigation";

type Payment = { payerId: string; payeeId: string; amountPaise: number };

function Recorder({
  houseId,
  payerId,
  payeeId,
  amountPaise: suggestedPaise,
}: Payment & { houseId: string }) {
  const { user } = useAuth();
  const { goBack, goToExpenses } = useHouseNavigation();
  const { data: members } = useHouseMembers(houseId);
  const recordSettlement = useRecordSettlement(houseId);
  const [closing, setClosing] = useState(false);

  let data: PaymentFormData | null = null;
  if (members && payerId !== payeeId) {
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

  useEffect(() => {
    if (payerId === payeeId) goBack();
  }, [payerId, payeeId, goBack]);

  const record = async (amountPaise: number) => {
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
      title="Record a payment"
      data={data}
      closing={closing}
      onClose={() => setClosing(true)}
      onClosed={goBack}
      note="You are recording a payment that happened outside Kinwoo. No money will be moved."
      submitLabel="Record payment"
      submitting={recordSettlement.isPending}
      onSubmit={(amountPaise) => void record(amountPaise)}
    />
  );
}

export function RecordPaymentScreen(payment: Payment) {
  const { activeHouse, ready } = useActiveHouse();
  const { goHome } = useHouseNavigation();

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  return activeHouse ? <Recorder houseId={activeHouse.house.id} {...payment} /> : null;
}
