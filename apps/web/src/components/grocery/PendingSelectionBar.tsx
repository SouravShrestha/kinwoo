"use client";

import { CaretDownIcon } from "@kinwoo/icons";
import { useId, useState } from "react";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

import { AssignMemberStrip } from "./AssignMemberStrip";
import { useAssignToMember } from "./useAssignToMember";
import { useSelectionBarTransition } from "./useSelectionBarTransition";

const BUTTON_AVATAR_SIZE = 24;

type BarProps = {
  houseId: string;
  listId: string;
  itemIds: string[];
  isPrivateList: boolean;
  onAssigned: () => void;
  onAssignToMe: () => void;
};

// Stays mounted through the exit transition, then unmounts so the expanded state resets.
export function PendingSelectionBar({ visible, ...props }: BarProps & { visible: boolean }) {
  const { mounted, shown } = useSelectionBarTransition(visible);
  return mounted ? <Bar shown={shown} {...props} /> : null;
}

function Bar({
  shown,
  houseId,
  listId,
  itemIds,
  isPrivateList,
  onAssigned,
  onAssignToMe,
}: BarProps & { shown: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const stripId = useId();

  const { members, self, isLoading, assign, assigningId } = useAssignToMember({
    houseId,
    listId,
    itemIds,
    onAssigned,
  });

  return (
    <div
      inert={!shown}
      className={cn(
        "fixed bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-background lg:border-x",
        "transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      {isPrivateList ? null : (
        <AssignMemberStrip
          id={stripId}
          expanded={expanded}
          members={members}
          isLoading={isLoading}
          assigningId={assigningId}
          onPick={(memberId, name) => void assign(memberId, name)}
          className="px-5 pt-4"
        />
      )}

      <div className="flex gap-3 px-5 pb-5 pt-5">
        {isPrivateList ? null : (
          <Button
            label="Someone else"
            variant="outline"
            aria-label="Assign to others"
            aria-expanded={expanded}
            aria-controls={stripId}
            iconEnd={
              <CaretDownIcon
                size={8}
                className={cn(
                  "transition-transform duration-200 motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            }
            onClick={() => setExpanded((value) => !value)}
            className="min-h-12 flex-1"
          />
        )}
        <Button
          label="Assign to me"
          onClick={onAssignToMe}
          icon={
            self ? (
              <Avatar name={self.displayName} url={self.avatarUrl} size={BUTTON_AVATAR_SIZE} />
            ) : undefined
          }
          className="min-h-12 flex-1"
        />
      </div>
    </div>
  );
}
