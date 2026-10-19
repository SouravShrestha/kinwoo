"use client";

import {
  balanceHeadline,
  pairBalanceLabel,
  unsettledPairs,
  type HouseBalances,
} from "@kinwoo/core/expenses";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

export function BalanceSummary({ balances }: { balances: HouseBalances }) {
  const pairs = unsettledPairs(balances);
  return (
    <section
      aria-labelledby="balance-headline"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <h2
        id="balance-headline"
        className={cn(
          "font-display text-lg font-medium",
          balances.netPaise > 0
            ? "text-accent"
            : balances.netPaise < 0
              ? "text-destructive"
              : "text-foreground",
        )}
      >
        {balanceHeadline(balances)}
      </h2>
      {pairs.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {pairs.map((pair) => (
            <li key={pair.userId} className="flex items-center gap-3">
              <Avatar name={pair.name} url={pair.avatarUrl} size={28} />
              <span
                className={cn(
                  "font-display text-sm",
                  pair.netPaise > 0 ? "text-foreground" : "text-destructive",
                )}
              >
                {pairBalanceLabel(pair)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
