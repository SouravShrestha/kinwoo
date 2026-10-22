"use client";

import {
  settlementSummary,
  spentOnFor,
  spentOnParts,
  type Settlement,
} from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { PaymentIcon } from "@kinwoo/icons";

export function PaymentRow({
  settlement,
  currentUserId,
  onOpen,
}: {
  settlement: Settlement;
  currentUserId: string | null;
  onOpen: () => void;
}) {
  const summary = settlementSummary(settlement, currentUserId);
  const amount = formatPaise(summary.amountPaise);
  const { month, day } = spentOnParts(spentOnFor(new Date(settlement.createdAt)));
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${summary.title} ${amount}, ${month} ${day}`}
      className="flex w-full items-center px-4 py-5 text-left transition-colors hover:cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden className="flex w-8 shrink-0 flex-col items-center font-display">
        <span className="text-xs text-muted-foreground">{month}</span>
        <span className="text-lg leading-6 text-muted-foreground">{day}</span>
      </span>
      <span
        aria-hidden
        className="ml-3 mr-4 flex size-10 shrink-0 items-center justify-center text-accent"
      >
        <PaymentIcon size={26} />
      </span>
      <span className="min-w-0 flex-1 font-display text-sm text-foreground">
        {summary.title} <span className="font-medium">{amount}</span>
      </span>
    </button>
  );
}
