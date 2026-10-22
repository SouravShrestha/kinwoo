import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useDeleteSettlement,
  useSettlements,
  useUpdateSettlement,
} from "@kinwoo/client/expenses";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { paiseToAmountDraft, settlementSummary } from "@kinwoo/core/expenses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaymentForm, type PaymentFormData } from "@/components/expenses/PaymentForm";
import { goBack } from "@/lib/house-navigation";

export function PaymentDetailScreen({
  houseId,
  settlementId,
}: {
  houseId: string;
  settlementId: string | null;
}) {
  const { user } = useAuth();
  const { data: settlements } = useSettlements(houseId);
  const { data: members } = useHouseMembers(houseId);
  const update = useUpdateSettlement(houseId, settlementId ?? "");
  const remove = useDeleteSettlement(houseId, settlementId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const finished = useRef(false);
  const settlement = settlements?.find((entry) => entry.id === settlementId);
  const userId = user?.id ?? null;

  useEffect(() => {
    if ((!settlementId || (settlements && !settlement)) && !finished.current) goBack();
  }, [settlementId, settlements, settlement]);

  let data: PaymentFormData | null = null;
  if (settlement) {
    const otherId = settlement.payerId === userId ? settlement.payeeId : settlement.payerId;
    const involved = settlement.payerId === userId || settlement.payeeId === userId;
    data = {
      payer: { name: settlement.payerName, url: settlement.payerAvatarUrl },
      payee: { name: settlement.payeeName, url: settlement.payeeAvatarUrl },
      heading: settlementSummary(settlement, userId).title,
      email: involved
        ? (members?.find((member) => member.userId === otherId)?.email ?? null)
        : null,
      initialAmount: paiseToAmountDraft(settlement.amountPaise),
    };
  }

  const save = async (amountPaise: number) => {
    try {
      await update.mutateAsync(amountPaise);
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't update that payment. Try again."));
      return;
    }
    finished.current = true;
    toast.success(TOAST_MESSAGES.paymentUpdated);
    goBack();
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync();
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't delete that payment. Try again."));
      return;
    }
    finished.current = true;
    setConfirmDelete(false);
    toast.success(TOAST_MESSAGES.paymentDeleted);
    goBack();
  };

  return (
    <PaymentForm
      data={data}
      note="This payment happened outside Kinwoo. Changing it only updates the balances."
      submitLabel="Update payment"
      submitting={update.isPending}
      onSubmit={(amountPaise) => void save(amountPaise)}
      requireChange
      onDelete={() => setConfirmDelete(true)}
    >
      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deletePayment}
        isPending={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </PaymentForm>
  );
}
