"use client";

import { ArrowRightIcon } from "@kinwoo/icons";

import { HeroCard } from "@/components/home/BalanceCard";

type InviteFriendsCardProps = {
  canInvite: boolean;
  onPress: () => void;
  onReplay?: () => void;
};

const TEXT = "flex flex-col items-center gap-1.5 text-center font-display font-medium";

export function InviteFriendsCard({ canInvite, onPress, onReplay }: InviteFriendsCardProps) {
  const content = (
    <>
      <span className="text-sm leading-[18px]">Solo mode is fine,</span>
      <span className="text-sm leading-[18px]">but it&apos;s better with friends</span>
      <span className="mt-2 flex items-center gap-2 text-lg">
        Invite friends
        {canInvite ? <ArrowRightIcon size={16} /> : null}
      </span>
    </>
  );

  return (
    <HeroCard onReplay={onReplay}>
      {canInvite ? (
        <button
          type="button"
          aria-label="Invite friends. Solo mode is fine, but it's better with friends"
          onClick={onPress}
          className={`${TEXT} hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
        >
          {content}
        </button>
      ) : (
        <div className={TEXT}>{content}</div>
      )}
    </HeroCard>
  );
}
