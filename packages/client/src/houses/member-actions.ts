import type { HouseRole } from "@kinwoo/core/houses";
import { useState } from "react";

import { houseErrorFromCause } from "./errors";
import { useLeaveHouse, useRemoveMember, useSetMemberRole } from "./mutations";

export type MemberActions = {
  busy: boolean;
  error: string | null;
  clearError: () => void;
  setRole: (userId: string, role: HouseRole) => Promise<boolean>;
  remove: (userId: string, options?: { keepDebt?: boolean }) => Promise<boolean>;
  leave: (options?: { acknowledgeDebt?: boolean }) => Promise<boolean>;
};

// Each action resolves to whether it worked, so a screen can close its confirmation on success
// and keep it open, showing the message, on failure.
export function useMemberActions(houseId: string): MemberActions {
  const setRoleMutation = useSetMemberRole(houseId);
  const removeMutation = useRemoveMember(houseId);
  const leaveMutation = useLeaveHouse(houseId);

  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(houseErrorFromCause(cause));
      return false;
    }
  };

  return {
    busy: setRoleMutation.isPending || removeMutation.isPending || leaveMutation.isPending,
    error,
    clearError: () => setError(null),
    setRole: (userId, role) => run(() => setRoleMutation.mutateAsync({ userId, role })),
    remove: (userId, options) =>
      run(() => removeMutation.mutateAsync({ userId, keepDebt: options?.keepDebt })),
    leave: (options) => run(() => leaveMutation.mutateAsync(options ?? {})),
  };
}
