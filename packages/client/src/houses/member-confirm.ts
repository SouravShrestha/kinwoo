import type { HouseRole } from "@kinwoo/core/houses";
import { useState } from "react";

import { useMemberActions, type MemberActions } from "./member-actions";

export type MemberConfirmRequest =
  | { kind: "leave" }
  | { kind: "remove"; userId: string; name: string }
  | { kind: "role"; userId: string; name: string; role: HouseRole };

export type MemberConfirm = {
  actions: MemberActions;
  request: MemberConfirmRequest | null;
  open: boolean;
  askLeave: () => void;
  askRemove: (userId: string, name: string) => void;
  askRole: (userId: string, name: string, role: HouseRole) => void;
  cancel: () => void;
  confirm: () => Promise<void>;
};

// The request outlives `open` so the confirmation's copy doesn't change while it animates away.
export function useMemberConfirm(
  houseId: string,
  { onLeft, onRemoved }: { onLeft?: () => void; onRemoved?: () => void } = {},
): MemberConfirm {
  const actions = useMemberActions(houseId);
  const [request, setRequest] = useState<MemberConfirmRequest | null>(null);
  const [open, setOpen] = useState(false);

  const ask = (next: MemberConfirmRequest) => {
    actions.clearError();
    setRequest(next);
    setOpen(true);
  };

  const cancel = () => {
    setOpen(false);
    actions.clearError();
  };

  const confirm = async () => {
    if (!request) return;

    if (request.kind === "leave") {
      if (await actions.leave()) {
        setOpen(false);
        onLeft?.();
      }
      return;
    }

    if (request.kind === "role") {
      if (await actions.setRole(request.userId, request.role)) setOpen(false);
      return;
    }

    if (await actions.remove(request.userId)) {
      setOpen(false);
      onRemoved?.();
    }
  };

  return {
    actions,
    request,
    open,
    askLeave: () => ask({ kind: "leave" }),
    askRemove: (userId, name) => ask({ kind: "remove", userId, name }),
    askRole: (userId, name, role) => ask({ kind: "role", userId, name, role }),
    cancel,
    confirm,
  };
}
