import { ArrowRightIcon } from "@kinwoo/icons";
import type { ReactNode } from "react";

type InviteFriendsCardProps = {
  canInvite: boolean;
  onPress: () => void;
};

const CARD =
  "flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card text-left";

export function InviteFriendsCard({ canInvite, onPress }: InviteFriendsCardProps) {
  const content: ReactNode = (
    <>
      <div
        role="img"
        aria-label="Friends high-fiving"
        style={{ aspectRatio: 900 / 575, maskImage: "url(/images/invite-friends.webp)" }}
        className="-mb-2 -ml-3 w-[45%] shrink-0 self-end bg-foreground mask-contain mask-bottom-left mask-no-repeat"
      />
      <div className="flex flex-1 flex-col justify-between gap-6 py-5 pr-5 pl-3 text-right -ml-10">
        <p className="font-display text-sm leading-5 font-normal">
          Solo mode is fine, but it&apos;s better with friends
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="font-display text-base font-medium">Invite friends</span>
          {canInvite ? <ArrowRightIcon size={16} /> : null}
        </div>
      </div>
    </>
  );

  if (!canInvite) {
    return <div className={CARD}>{content}</div>;
  }

  return (
    <button
      type="button"
      aria-label="Invite friends. Solo mode is fine, but it's better with friends"
      onClick={onPress}
      className={`${CARD} hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
    >
      {content}
    </button>
  );
}
