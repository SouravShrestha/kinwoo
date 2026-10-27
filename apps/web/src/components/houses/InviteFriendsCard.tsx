import { ArrowRightIcon } from "@kinwoo/icons";
import Image from "next/image";
import type { ReactNode } from "react";

type InviteFriendsCardProps = {
  canInvite: boolean;
  onPress: () => void;
};

const CARD =
  "mt-4 flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card text-left";

export function InviteFriendsCard({ canInvite, onPress }: InviteFriendsCardProps) {
  const content: ReactNode = (
    <>
      <Image
        src="/images/invite.webp"
        alt="Two friends high-fiving"
        width={600}
        height={300}
        loading="eager"
        className="h-auto w-[45%] shrink-0 self-end -mb-2 -ml-2"
      />
      <div className="flex flex-1 flex-col justify-between gap-8 py-4 pr-5 pl-2 -ml-12 text-right">
        <p className="font-display text-sm leading-[calc(1.25rem*var(--font-scale,1))] font-normal">
          Solo mode is fine, but it&apos;s better with friends
        </p>
        <div className="flex items-center justify-end gap-2">
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
