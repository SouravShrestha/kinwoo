import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth";
import {
  fetchHouses,
  fetchInvitedEmails,
  fetchInvite,
  fetchInvitePreview,
  fetchMembers,
} from "./api";
import { houseKeys } from "./keys";

const HOUSE_LIST_REFRESH_MS = 60_000;

// The polling interval is the safety net for a missed realtime event: a removed user still
// notices within a minute even if the socket was down.
export function useMyHouses() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: houseKeys.list(),
    queryFn: fetchHouses,
    enabled: userId !== null,
    refetchInterval: HOUSE_LIST_REFRESH_MS,
  });
}

export function useHouseMembers(houseId: string | null, enabled = true) {
  return useQuery({
    queryKey: houseKeys.members(houseId ?? ""),
    queryFn: () => fetchMembers(houseId as string),
    enabled: houseId !== null && enabled,
  });
}

export function useHouseInvite(houseId: string | null, enabled = true) {
  return useQuery({
    queryKey: houseKeys.invite(houseId ?? ""),
    queryFn: () => fetchInvite(houseId as string),
    enabled: houseId !== null && enabled,
  });
}

export function useInvitedEmails(houseId: string | null, enabled = true) {
  return useQuery({
    queryKey: houseKeys.invitedEmails(houseId ?? ""),
    queryFn: () => fetchInvitedEmails(houseId as string),
    enabled: houseId !== null && enabled,
  });
}

// Never refetched or retried: each call spends one of the user's rate-limited code guesses.
export function invitePreviewOptions(code: string) {
  return {
    queryKey: houseKeys.invitePreview(code),
    queryFn: () => fetchInvitePreview(code),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };
}

export function useInvitePreview(code: string | null) {
  return useQuery({ ...invitePreviewOptions(code ?? ""), enabled: code !== null });
}
