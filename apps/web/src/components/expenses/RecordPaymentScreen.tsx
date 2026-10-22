"use client";

import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useHouseBalances,
  useRecordSettlement,
} from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { paiseToAmountDraft } from "@kinwoo/core/expenses";
import { memberDisplayName } from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useEffect, useRef, useState } from "react";

import { PaymentForm, type PaymentFormData } from "@/components/expenses/PaymentForm";
import { useHouseNavigation } from "@/lib/house-navigation";

function useRecordPayment(
  houseId: string,
  simplifyDebts: boolean,
  userId: string,
  onMissing: () => void,
  onRecorded: () => void,
) {
  const { user } = useAuth();
  const { data: balances } = useHouseBalances(houseId, simplifyDebts);
  const { data: members } = useHouseMembers(houseId);
  const recordSettlement = useRecordSettlement(houseId);
  const recorded = useRef(false);
  const pair = balances?.pairs.find((entry) => entry.userId === userId && entry.netPaise !== 0);

  useEffect(() => {
    if (balances && !pair && !recorded.current) onMissing();
  }, [balances, pair, onMissing]);

  let data: PaymentFormData | null = null;
  if (pair) {
    const self = members?.find((member) => member.userId === user?.id);
    const youPay = pair.netPaise < 0;
    const me = { name: self?.displayName ?? null, url: self?.avatarUrl ?? null };
    const them = { name: pair.name, url: pair.avatarUrl };
    const name = memberDisplayName(pair.name);
    data = {
      payer: youPay ? me : them,
      payee: youPay ? them : me,
      heading: youPay ? `You paid ${name}` : `${name} paid you`,
      email: members?.find((member) => member.userId === userId)?.email ?? null,
      initialAmount: paiseToAmountDraft(Math.abs(pair.netPaise)),
    };
  }

  const record = async (amountPaise: number) => {
    if (!pair || !user) return;
    const youPay = pair.netPaise < 0;
    try {
      await recordSettlement.mutateAsync({
        payerId: youPay ? user.id : pair.userId,
        payeeId: youPay ? pair.userId : user.id,
        amountPaise,
      });
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't record that payment. Try again."));
      return;
    }
    // Set before the refreshed balances land, so the effect above does not also navigate.
    recorded.current = true;
    toast.success(TOAST_MESSAGES.paymentRecorded);
    onRecorded();
  };

  return { data, record, submitting: recordSettlement.isPending };
}

function Recorder({
  houseId,
  simplifyDebts,
  userId,
}: {
  houseId: string;
  simplifyDebts: boolean;
  userId: string;
}) {
  const { goBack, goToExpenses } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const { data, record, submitting } = useRecordPayment(
    houseId,
    simplifyDebts,
    userId,
    goBack,
    goToExpenses,
  );

  return (
    <PaymentForm
      title="Record a payment"
      data={data}
      closing={closing}
      onClose={() => setClosing(true)}
      onClosed={goBack}
      note="You are recording a payment that happened outside Kinwoo. No money will be moved."
      submitLabel="Record payment"
      submitting={submitting}
      onSubmit={(amountPaise) => void record(amountPaise)}
    />
  );
}

export function RecordPaymentScreen({ userId }: { userId: string }) {
  const { activeHouse, ready } = useActiveHouse();
  const { goHome } = useHouseNavigation();

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  return activeHouse ? (
    <Recorder
      houseId={activeHouse.house.id}
      simplifyDebts={activeHouse.house.simplifyDebts}
      userId={userId}
    />
  ) : null;
}
