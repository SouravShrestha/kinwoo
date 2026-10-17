"use client";

import { splitMemberName, type HouseMember } from "@kinwoo/core/houses";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

export function AssignMemberStrip({
  id,
  expanded,
  members,
  isLoading,
  assigningId,
  onPick,
  className = "px-5 pt-4",
}: {
  id: string;
  expanded: boolean;
  members: readonly HouseMember[];
  isLoading: boolean;
  assigningId: string | null;
  onPick: (memberId: string, memberName: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div
        id={id}
        role="group"
        aria-label="Assign to a housemate"
        inert={!expanded}
        className="min-h-0 overflow-hidden"
      >
        <div
          className={cn(
            "overflow-x-auto overscroll-x-contain scrollbar-none [&::-webkit-scrollbar]:hidden",
            className,
          )}
        >
          {isLoading ? null : members.length === 0 ? (
            <p className="text-center font-display text-sm text-muted-foreground">
              No other housemates yet
            </p>
          ) : (
            <ul className="flex w-max gap-2">
              {members.map((m) => {
                const name = m.displayName ?? m.email ?? "Member";
                const { first, rest } = splitMemberName(name);

                return (
                  <li key={m.userId}>
                    <button
                      type="button"
                      aria-label={`Assign to ${name}`}
                      disabled={assigningId !== null}
                      onClick={() => onPick(m.userId, name)}
                      className={cn(
                        "flex w-18 flex-col items-center gap-2 rounded-xl transition-opacity",
                        "hover:cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50",
                        assigningId === m.userId && "opacity-50",
                      )}
                    >
                      <Avatar name={m.displayName} url={m.avatarUrl} size={48} />
                      <span className="w-full text-center font-display text-xs font-medium leading-4 text-foreground">
                        <span className="block h-4 truncate">{first}</span>
                        <span className="block h-4 truncate">{rest}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
