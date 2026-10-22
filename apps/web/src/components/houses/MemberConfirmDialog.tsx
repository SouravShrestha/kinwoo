"use client";

import type { MemberConfirm, MemberConfirmRequest } from "@kinwoo/client/houses";
import { leaveConfirmCopy, removeConfirmCopy, roleConfirmCopy } from "@kinwoo/core/confirm";
import type { LeaveState } from "@kinwoo/core/houses";

import { ConfirmDialog } from "../ConfirmDialog";

function confirmCopy(request: MemberConfirmRequest | null, houseName: string, leave: LeaveState) {
  if (request?.kind === "remove") return removeConfirmCopy(request.name);
  if (request?.kind === "role") return roleConfirmCopy(request.name, request.role);
  return leaveConfirmCopy(leave, houseName);
}

export function MemberConfirmDialog({
  confirm,
  houseName,
  leave,
}: {
  confirm: MemberConfirm;
  houseName: string;
  leave: LeaveState;
}) {
  const copy = confirmCopy(confirm.request, houseName, leave);

  return (
    <ConfirmDialog
      open={confirm.open}
      copy={copy}
      error={confirm.actions.error}
      isPending={confirm.actions.busy}
      onConfirm={() => void confirm.confirm()}
      onCancel={confirm.cancel}
    />
  );
}
