import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import { ArrowRightIcon } from "@kinwoo/icons";
import Link from "next/link";

import { BalanceLine } from "@/components/expenses/BalanceSummary";

export function BalanceCard({ balances }: { balances: HouseBalances }) {
  return (
    <Link
      href="/bills"
      aria-label={`${balanceHeadline(balances)}. Open bills`}
      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-foreground/30 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xs font-normal text-muted-foreground">
          Balance
        </span>
        <span className="mt-0.5 block font-display text-base font-normal text-foreground">
          <BalanceLine text={balanceHeadlineParts(balances)} />
        </span>
      </span>
      <ArrowRightIcon size={16} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}
