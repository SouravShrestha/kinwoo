"use client";

import {
  balanceHeadlineParts,
  pairBalanceParts,
  unsettledPairs,
  type BalanceText,
  type HouseBalances,
} from "@kinwoo/core/expenses";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const AMOUNT_TONE = {
  owed: "text-accent",
  owe: "text-destructive",
  neutral: "text-foreground",
} as const;

function BalanceLine({ text }: { text: BalanceText }) {
  return (
    <>
      {text.before}
      {text.amount ? (
        <span className={cn("font-medium", AMOUNT_TONE[text.tone])}>{text.amount}</span>
      ) : null}
      {text.after}
    </>
  );
}

export function BalanceSummary({ balances }: { balances: HouseBalances }) {
  const pairs = unsettledPairs(balances);
  return (
    <section aria-labelledby="balance-headline">
      <h2 id="balance-headline" className="font-display text-xl font-normal text-foreground">
        <BalanceLine text={balanceHeadlineParts(balances)} />
      </h2>
      {pairs.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {pairs.map((pair) => (
            <li key={pair.userId} className="flex items-center gap-3">
              <Avatar name={pair.name} url={pair.avatarUrl} size={20} />
              <span className="font-display text-sm text-foreground">
                <BalanceLine text={pairBalanceParts(pair)} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
