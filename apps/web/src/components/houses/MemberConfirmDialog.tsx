"use client";

import type { MemberConfirm, MemberConfirmRequest } from "@kinwoo/client/houses";
import {
  leaveConfirmCopy,
  removeConfirmCopy,
  roleConfirmCopy,
  type LeaveState,
} from "@kinwoo/core/houses";

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
  const promoting = confirm.request?.kind === "role" && confirm.request.role === "admin";

  return (
    <ConfirmDialog
      open={confirm.open}
      title={copy.title}
      description={copy.message}
      error={confirm.actions.error}
      confirmLabel={copy.confirmLabel}
      confirmVariant={promoting ? "primary" : "destructive"}
      isPending={confirm.actions.busy}
      onConfirm={() => void confirm.confirm()}
      onCancel={confirm.cancel}
    />
  );
}
