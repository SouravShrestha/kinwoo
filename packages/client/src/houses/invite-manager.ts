import {
  inviteEmailErrorMessage,
  inviteShareMessage,
  inviteWebUrl,
  sortMembers,
  validateInviteEmail,
  type House,
  type HouseJoinMode,
  type HouseMember,
  type InvitedEmail,
} from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useMemo, useState } from "react";

import { toast } from "../toast";
import { houseErrorFromCause } from "./errors";
import { useAddInvitedEmail, useRemoveInvitedEmail, useSetJoinMode } from "./mutations";
import { useHouseInvite, useHouseMembers, useInvitedEmails } from "./queries";

export type InviteManager = {
  loading: boolean;
  loadError: boolean;
  code: string | null;
  shareUrl: string | null;
  shareMessage: string | null;
  joinMode: HouseJoinMode;
  setJoinMode: (joinMode: HouseJoinMode) => void;
  members: HouseMember[];
  invitedEmails: InvitedEmail[];
  emailDraft: string;
  setEmailDraft: (value: string) => void;
  emailError: string | null;
  emailBusy: boolean;
  addEmail: () => Promise<void>;
  removeEmail: (invitedEmailId: string) => Promise<void>;
};

export function useInviteManager(input: { house: House; origin: string }): InviteManager {
  const { house, origin } = input;

  const inviteQuery = useHouseInvite(house.id);
  const membersQuery = useHouseMembers(house.id);
  const invitedEmailsQuery = useInvitedEmails(house.id);
  const setJoinMode = useSetJoinMode(house.id);
  const addInvitedEmail = useAddInvitedEmail(house.id);
  const removeInvitedEmail = useRemoveInvitedEmail(house.id);

  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const members = useMemo(() => sortMembers(membersQuery.data ?? []), [membersQuery.data]);

  const code = inviteQuery.data?.code ?? null;
  const shareUrl = code ? inviteWebUrl(origin, code) : null;
  const shareMessage =
    code && shareUrl ? inviteShareMessage({ houseName: house.name, code, url: shareUrl }) : null;

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (cause) {
      toast.error(houseErrorFromCause(cause));
      return false;
    }
  };

  const addEmail = async () => {
    const parsed = validateInviteEmail(emailDraft);
    if (!parsed.ok) {
      setEmailError(inviteEmailErrorMessage(parsed.error));
      return;
    }
    const added = await run(async () => {
      await addInvitedEmail.mutateAsync(parsed.value);
      setEmailDraft("");
    });
    if (added) toast.success(TOAST_MESSAGES.inviteEmailAdded);
  };

  const removeEmail = async (invitedEmailId: string) => {
    const removed = await run(() => removeInvitedEmail.mutateAsync(invitedEmailId));
    if (removed) toast.info(TOAST_MESSAGES.inviteEmailRemoved);
  };

  return {
    loading: inviteQuery.isPending || membersQuery.isPending || invitedEmailsQuery.isPending,
    loadError: inviteQuery.isError,
    code,
    shareUrl,
    shareMessage,
    joinMode: house.joinMode,
    setJoinMode: (joinMode) => {
      if (joinMode === house.joinMode) return;
      void run(() => setJoinMode.mutateAsync(joinMode));
    },
    members,
    invitedEmails: invitedEmailsQuery.data ?? [],
    emailDraft,
    setEmailDraft: (value) => {
      setEmailDraft(value);
      setEmailError(null);
    },
    emailError,
    emailBusy: addInvitedEmail.isPending || removeInvitedEmail.isPending,
    addEmail,
    removeEmail,
  };
}
