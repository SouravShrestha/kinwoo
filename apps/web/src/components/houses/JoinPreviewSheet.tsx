"use client";

import { useActiveHouse, useJoinFlow } from "@kinwoo/client/houses";
import { inviteFailureCopy, memberCountLabel, memberDisplayName } from "@kinwoo/core/houses";
import { HousePinIcon } from "@kinwoo/icons";
import { useEffect, type ReactNode } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { Avatar } from "./Avatar";
import { AvatarStack } from "./AvatarStack";

export function JoinPreviewSheet({
  code,
  open,
  onClose,
}: {
  code: string;
  open: boolean;
  onClose: () => void;
}) {
  const { goHome } = useHouseNavigation();
  const { setActiveHouse } = useActiveHouse();
  const flow = useJoinFlow(code, goHome);

  const alreadyMemberOf = flow.preview?.status === "already_member" ? flow.preview.houseId : null;

  // Already in this house: there is nothing to confirm, so go straight to it.
  useEffect(() => {
    if (!alreadyMemberOf) return;
    setActiveHouse(alreadyMemberOf);
    goHome();
  }, [alreadyMemberOf, setActiveHouse, goHome]);

  const visible = open && !flow.loading && !alreadyMemberOf;

  return (
    <BottomSheet open={visible} onClose={onClose} label="Join a house">
      <SheetBody flow={flow} onClose={onClose} onDone={goHome} />
    </BottomSheet>
  );
}

function SheetBody({
  flow,
  onClose,
  onDone,
}: {
  flow: ReturnType<typeof useJoinFlow>;
  onClose: () => void;
  onDone: () => void;
}) {
  if (flow.loadError) {
    return (
      <Notice title="Couldn't check that code" message={flow.loadError}>
        <Button label="Try another code" variant="outline" onClick={onClose} />
      </Notice>
    );
  }

  if (flow.failure) {
    const copy = inviteFailureCopy(flow.failure);

    return (
      <Notice title={copy.title} message={copy.message}>
        <Button label="Try another code" variant="outline" onClick={onClose} />
      </Notice>
    );
  }

  if (flow.requested) {
    return (
      <Notice
        title="Request sent"
        message="An admin needs to approve you before you can see this house."
      >
        <Button label="Done" onClick={onDone} />
      </Notice>
    );
  }

  const preview = flow.preview;
  if (!preview) return null;

  return (
    <div>
      <h2 className="font-display text-xl font-medium">
        <span className="flex items-center gap-1.5">
          <HousePinIcon size={18} className="shrink-0" />
          <span className="truncate">{preview.name}</span>
        </span>
        {preview.address ? (
          <span className="mt-0.5 block truncate font-display text-sm font-normal text-muted-foreground">
            {preview.address}
          </span>
        ) : null}
      </h2>

      <div className="mt-5 flex items-center">
        <AvatarStack members={preview.members} total={preview.memberCount} surface="sheet" />
        <span className="ml-4 text-sm text-muted-foreground">
          {memberCountLabel(preview.memberCount)}
        </span>
      </div>

      {preview.invitedBy ? (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground font-display font-normal">Invited by</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={preview.invitedBy} url={preview.invitedByAvatarUrl} size={44} />
            <span className="min-w-0 truncate text-base font-display font-normal">
              {memberDisplayName(preview.invitedBy)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          label={preview.requiresApproval ? "Request to join" : "Join house"}
          loading={flow.joining}
          onClick={() => void flow.join()}
        />
        <Button
          label="Cancel"
          variant="outline"
          labelWeight="normal"
          disabled={flow.joining}
          onClick={onClose}
        />
      </div>
    </div>
  );
}

function Notice({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <p className="mt-2 text-base text-muted-foreground">{message}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
