"use client";

import type { ExpenseSplitForm, PayerMember } from "@kinwoo/client/expenses";
import { SPLIT_METHOD_TITLES, SPLIT_METHODS, type SplitMethod } from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { ArrowRightIcon, CheckCircleIcon, CheckIcon, SharesIcon } from "@kinwoo/icons";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const LABEL = "How was it split?";
const PANEL_ID = "split-sheet-panel";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const TAB_CONTENT: Record<SplitMethod, ReactNode> = {
  equal: "=",
  exact: "1.23",
  percent: "%",
  shares: <SharesIcon size={15} />,
};

const INPUT_AFFIX: Record<Exclude<SplitMethod, "equal">, { prefix?: string; suffix?: string }> = {
  exact: { prefix: "₹" },
  percent: { suffix: "%" },
  shares: {},
};

// Matches the tablist's `gap-2`.
const TAB_GAP = "0.5rem";

const tabId = (method: SplitMethod) => `split-tab-${method}`;

function memberLabel(member: PayerMember): string {
  return member.isYou ? "You" : member.name;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[6px]",
        checked ? "bg-foreground text-background" : "border border-border",
      )}
    >
      {checked ? <CheckIcon size={10} /> : null}
    </span>
  );
}

export function SplitSheet({
  open,
  onClose,
  split,
}: {
  open: boolean;
  onClose: () => void;
  split: ExpenseSplitForm;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { method } = split;
  const showsShare = method === "percent" || method === "shares";

  const cancel = () => {
    split.discard();
    onClose();
  };
  const done = () => {
    if (split.commit()) onClose();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = SPLIT_METHODS.indexOf(method);
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    let next: number;
    if (event.key in offsets) {
      next = (current + offsets[event.key] + SPLIT_METHODS.length) % SPLIT_METHODS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = SPLIT_METHODS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    split.setMethod(SPLIT_METHODS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    // The panel is capped at the viewport height; only the list shrinks (and scrolls) to fit it.
    <BottomSheet
      open={open}
      onClose={cancel}
      label={LABEL}
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
            aria-label="Save split"
            disabled={!split.canCommit}
            onClick={done}
            className={cn(
              "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40",
              FOCUS_RING,
            )}
          >
            <CheckCircleIcon size={26} />
          </button>
        </div>
        <h2 className="mt-2 shrink-0 font-display text-xl font-medium text-foreground">
          {SPLIT_METHOD_TITLES[method]}
        </h2>

        <div
          role="tablist"
          aria-label="Split method"
          onKeyDown={onTabKeyDown}
          className="relative mt-5 grid shrink-0 grid-cols-4 gap-2"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 z-10 rounded-xl bg-foreground transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - ${TAB_GAP} * ${SPLIT_METHODS.length - 1}) / ${SPLIT_METHODS.length})`,
              transform: `translateX(calc(${SPLIT_METHODS.indexOf(method)} * (100% + ${TAB_GAP})))`,
            }}
          />
          {SPLIT_METHODS.map((tab, index) => {
            const active = tab === method;
            return (
              <button
                key={tab}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={tabId(tab)}
                aria-selected={active}
                aria-controls={PANEL_ID}
                aria-label={SPLIT_METHOD_TITLES[tab]}
                tabIndex={active ? 0 : -1}
                onClick={() => split.setMethod(tab)}
                // The sliding highlight sits above this background and below the label.
                className={cn(
                  "flex h-9 items-center justify-center rounded-xl bg-muted font-display text-sm font-medium hover:cursor-pointer",
                  FOCUS_RING,
                )}
              >
                <span
                  className={cn(
                    "relative z-20 flex transition-colors duration-200 motion-reduce:transition-none",
                    active ? "text-background" : "text-foreground",
                  )}
                >
                  {TAB_CONTENT[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <ul
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(method)}
          // The list scrolls, which clips its children; the padding leaves room for focus outlines.
          className="-mx-1 mt-5 min-h-0 overflow-y-auto overscroll-contain px-1"
        >
          {split.members.map((member) => {
            const label = memberLabel(member);
            const name = (
              <span className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
                {showsShare ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    {formatPaise(split.shareOf(member.userId))}
                  </span>
                ) : null}
              </span>
            );

            if (method === "equal") {
              const included = split.isIncluded(member.userId);
              return (
                <li key={member.userId}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={included}
                    aria-label={label}
                    onClick={() => split.toggle(member.userId)}
                    className={cn(
                      "flex min-h-16 w-full items-center gap-4 py-2 text-left font-display text-base text-foreground hover:cursor-pointer",
                      FOCUS_RING,
                    )}
                  >
                    <Avatar name={member.name} url={member.avatarUrl} size={36} />
                    {name}
                    <Checkbox checked={included} />
                  </button>
                </li>
              );
            }

            const { prefix, suffix } = INPUT_AFFIX[method];
            return (
              <li
                key={member.userId}
                className="flex min-h-16 items-center gap-4 py-2 font-display text-base text-foreground"
              >
                <Avatar name={member.name} url={member.avatarUrl} size={36} />
                {name}
                <label className="flex h-11 w-28 shrink-0 items-center rounded-xl bg-muted px-3 font-display text-base text-muted-foreground focus-within:outline-2 focus-within:outline-foreground">
                  {prefix}
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="done"
                    aria-label={`${SPLIT_METHOD_TITLES[method]} for ${label}`}
                    placeholder="0"
                    value={split.valueText(member.userId)}
                    onChange={(event) => split.setValue(member.userId, event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-1 text-right text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {suffix}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex shrink-0 items-center gap-4 border-t border-border pt-4 font-display">
          <div aria-live="polite" className="flex flex-1 flex-col items-center text-center">
            <p className="text-base font-medium text-foreground">{split.summary.primary}</p>
            {split.summary.secondary ? (
              <p
                className={cn(
                  "text-sm",
                  split.summary.error ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {split.summary.secondary}
              </p>
            ) : null}
          </div>
          {method === "equal" ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={split.allIncluded}
              onClick={split.toggleAll}
              className={cn(
                "flex items-center gap-3 self-stretch border-l border-border pl-4 text-sm text-foreground hover:cursor-pointer",
                FOCUS_RING,
              )}
            >
              All
              <Checkbox checked={split.allIncluded} />
            </button>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
