import { BalancesIcon, SettleUpIcon, TotalsIcon } from "@kinwoo/icons";
import Link from "next/link";

import { BALANCES_PATH, SETTLE_UP_PATH, TOTALS_PATH } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { label: "Settle up", primary: true, Icon: SettleUpIcon, iconSize: 16, href: SETTLE_UP_PATH },
  { label: "Balances", primary: false, Icon: BalancesIcon, iconSize: 16, href: BALANCES_PATH },
  { label: "Totals", primary: false, Icon: TotalsIcon, iconSize: 13, href: TOTALS_PATH },
] as const;

export function ExpenseActions() {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-6">
      {ACTIONS.map((action) => {
        const { label, primary, Icon, iconSize } = action;
        const className = cn(
          "flex min-w-28 shrink-0 items-center justify-center gap-2 rounded-xl border px-5 py-2 font-display text-sm font-medium transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          primary
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-foreground",
        );
        return (
          <Link key={label} href={action.href} className={className}>
            <Icon size={iconSize} className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
