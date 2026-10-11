import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateHouseInput,
  HouseJoinMode,
  HouseMembership,
  HouseRole,
  UpdateHouseInput,
} from "@kinwoo/core/houses";

import { useActiveHouse } from "./active-house-provider";
import {
  addInvitedEmail,
  createHouse,
  joinHouse,
  leaveHouse,
  removeInvitedEmail,
  removeMember,
  setMemberRole,
  updateHouse,
} from "./api";
import { addHouseToCache, patchHouseInCache, updateHouseInCache } from "./cache";
import { houseKeys } from "./keys";

export function useCreateHouse() {
  const queryClient = useQueryClient();
  const { setActiveHouse } = useActiveHouse();

  return useMutation({
    mutationFn: (input: CreateHouseInput) => createHouse(input),
    onSuccess: (house) => {
      // Written to the cache first so the new house resolves as active on the same render.
      addHouseToCache(queryClient, house);
      setActiveHouse(house.id);
      void queryClient.invalidateQueries({ queryKey: houseKeys.list() });
    },
  });
}

export function useUpdateHouse(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateHouseInput) => updateHouse(houseId, input),
    onSuccess: (house) => {
      updateHouseInCache(queryClient, house);
      void queryClient.invalidateQueries({ queryKey: houseKeys.detail(houseId), exact: true });
    },
  });
}

export function useJoinHouse() {
  const queryClient = useQueryClient();
  const { setActiveHouse } = useActiveHouse();

  return useMutation({
    mutationFn: (code: string) => joinHouse(code),
    onSuccess: async (result) => {
      if (result.status !== "joined" && result.status !== "already_member") return;

      // The list has to include the house before it is made active, or the choice falls back.
      await queryClient.invalidateQueries({ queryKey: houseKeys.list() });
      setActiveHouse(result.houseId);
    },
  });
}

export function useSetMemberRole(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: HouseRole }) =>
      setMemberRole(houseId, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: houseKeys.members(houseId) }),
  });
}

export function useRemoveMember(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, keepDebt = false }: { userId: string; keepDebt?: boolean }) =>
      removeMember(houseId, userId, keepDebt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: houseKeys.members(houseId) }),
  });
}

export function useLeaveHouse(houseId: string) {
  const { dropHouse } = useActiveHouse();

  return useMutation({
    mutationFn: (options: { acknowledgeDebt?: boolean } = {}) =>
      leaveHouse(houseId, options.acknowledgeDebt ?? false),
    onSuccess: () => dropHouse(houseId),
  });
}

// Optimistic so the choice sticks the moment it is tapped. The server re-reads the setting on every
// join, so the change applies to all live codes without regenerating them.
export function useSetJoinMode(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (joinMode: HouseJoinMode) => updateHouse(houseId, { joinMode }),
    onMutate: async (joinMode) => {
      await queryClient.cancelQueries({ queryKey: houseKeys.list() });
      await queryClient.cancelQueries({ queryKey: houseKeys.detail(houseId), exact: true });
      const list = queryClient.getQueryData<HouseMembership[]>(houseKeys.list());
      const detail = queryClient.getQueryData<HouseMembership>(houseKeys.detail(houseId));
      patchHouseInCache(queryClient, houseId, { joinMode });
      return { list, detail };
    },
    onError: (_error, _joinMode, context) => {
      queryClient.setQueryData(houseKeys.list(), context?.list);
      queryClient.setQueryData(houseKeys.detail(houseId), context?.detail);
    },
    onSuccess: (house) => updateHouseInCache(queryClient, house),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: houseKeys.list() });
      void queryClient.invalidateQueries({ queryKey: houseKeys.detail(houseId), exact: true });
    },
  });
}

export function useAddInvitedEmail(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => addInvitedEmail(houseId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: houseKeys.invitedEmails(houseId) }),
  });
}

export function useRemoveInvitedEmail(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitedEmailId: string) => removeInvitedEmail(houseId, invitedEmailId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: houseKeys.invitedEmails(houseId) }),
  });
}
