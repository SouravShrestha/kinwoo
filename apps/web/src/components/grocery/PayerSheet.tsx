"use client";

import type { PayerMember, PayerSplitForm } from "@kinwoo/client/grocery";
import { formatPaise, payerRemainingLabel } from "@kinwoo/core/grocery";
import { splitMemberName } from "@kinwoo/core/houses";
import { ArrowRightIcon, CheckCircleIcon, CheckIcon } from "@kinwoo/icons";

import { BottomSheet } from "@/components/BottomSheet";
import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const TITLE = "Who paid for the expense?";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

function nameLines(member: PayerMember): { first: string; rest: string } {
  return member.isYou ? { first: "You", rest: "" } : splitMemberName(member.name);
}

export function PayerSheet({
  open,
  onClose,
  payers,
}: {
  open: boolean;
  onClose: () => void;
  payers: PayerSplitForm;
}) {
  const { split } = payers;
  const cancel = () => {
    payers.discard();
    onClose();
  };
  const done = () => {
    if (payers.commit()) onClose();
  };

  return (
    // The panel is capped at the viewport height; only the list shrinks (and scrolls) to fit it.
    <BottomSheet
      open={open}
      onClose={cancel}
      label={TITLE}
      className="flex flex-col overflow-y-hidden [&>*:not(:last-child)]:shrink-0"
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            aria-label="Discard changes"
            onClick={cancel}
            className={cn(
              "flex size-10 items-center justify-start text-foreground transition-opacity hover:cursor-pointer hover:opacity-70",
              FOCUS_RING,
            )}
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
          <button
            type="button"
            aria-label="Save who paid"
            disabled={!payers.canCommit}
            onClick={done}
            className={cn(
              "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40",
              FOCUS_RING,
            )}
          >
            <CheckCircleIcon size={26} />
          </button>
        </div>
        <h2 className="mt-2 shrink-0 font-display text-xl font-medium text-foreground">{TITLE}</h2>

        {/* The list scrolls, which clips its children; the padding leaves room for focus outlines. */}
        <ul className="-mx-1 mt-7 min-h-0 overflow-y-auto overscroll-contain px-1">
          {payers.members.map((member) => {
            const selected = payers.isSelected(member.userId);
            const { first, rest } = nameLines(member);
            const label = member.isYou ? "You" : member.name;

            return (
              <li key={member.userId} className="flex min-h-16 items-center gap-4 py-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  aria-label={label}
                  onClick={() => payers.toggle(member.userId)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-4 self-stretch text-left font-display text-base text-foreground hover:cursor-pointer",
                    FOCUS_RING,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[6px]",
                      selected ? "bg-foreground text-background" : "border border-border",
                    )}
                  >
                    {selected ? <CheckIcon size={10} /> : null}
                  </span>
                  <Avatar name={member.name} url={member.avatarUrl} size={36} />
                  <span aria-hidden className="min-w-0 flex-1">
                    <span className="block truncate">{first}</span>
                    {rest ? <span className="block truncate">{rest}</span> : null}
                  </span>
                </button>

                <label className="flex h-11 w-24 shrink-0 items-center rounded-xl bg-muted px-3 font-display text-base text-muted-foreground focus-within:outline-2 focus-within:outline-foreground">
                  ₹
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="done"
                    aria-label={`Amount paid by ${label}`}
                    placeholder="0"
                    value={payers.amountText(member.userId)}
                    onChange={(event) => payers.setAmount(member.userId, event.target.value)}
                    className="min-w-0 flex-1 bg-transparent pl-1 text-right text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </li>
            );
          })}
        </ul>

        <div
          aria-live="polite"
          className="ml-auto mt-6 flex w-fit shrink-0 flex-col items-center font-display"
        >
          <p className="text-lg font-medium text-foreground">
            {formatPaise(split.assignedPaise)} of {formatPaise(payers.totalPaise)}
          </p>
          <p
            className={cn(
              "text-base",
              split.state === "over" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {payerRemainingLabel(split)}
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
