import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import Image from "next/image";
import Link from "next/link";

import { BalanceLine } from "@/components/expenses/BalanceSummary";
import { cn } from "@/lib/utils";

const LEAD = {
  owed: "Across all your shared bills, you're owed",
  owe: "Across all your shared bills, you owe",
} as const;

export function BalanceCard({ balances }: { balances: HouseBalances }) {
  const text = balanceHeadlineParts(balances);
  const lead = text.tone === "neutral" ? text.before.trim() : LEAD[text.tone];
  return (
    <Link
      href="/bills"
      aria-label={`${balanceHeadline(balances)}. Open bills`}
      className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card text-left hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <Image
        src="/images/shared-bill.webp"
        alt=""
        width={600}
        height={318}
        loading="eager"
        className="h-auto w-[45%] shrink-0 self-end -ml-2 -mb-2"
      />
      <div className="flex flex-1 flex-col justify-between gap-4 py-6 pr-5 pl-2 -ml-12 text-right">
        {/* Two lead lines and an amount row are always reserved, so a settled card keeps the
            height of one with a balance. */}
        <p className="min-h-[2lh] font-display text-sm font-normal text-muted-foreground">{lead}</p>
        <p
          aria-hidden={!text.amount}
          className={cn(
            "font-display text-xl font-normal text-foreground",
            !text.amount && "invisible",
          )}
        >
          {text.amount ? <BalanceLine text={{ ...text, before: "", after: "" }} /> : "\u00a0"}
        </p>
      </div>
    </Link>
  );
}
