import { BalancesIcon, SettleUpIcon, TotalsIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

// Placeholders until settle up, balances and totals exist; they render but do nothing yet.
const ACTIONS = [
  { label: "Settle up", primary: true, Icon: SettleUpIcon, iconSize: 16 },
  { label: "Balances", primary: false, Icon: BalancesIcon, iconSize: 16 },
  { label: "Totals", primary: false, Icon: TotalsIcon, iconSize: 13 },
] as const;

export function ExpenseActions() {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-6">
      {ACTIONS.map(({ label, primary, Icon, iconSize }) => (
        <button
          key={label}
          type="button"
          title="Coming soon"
          className={cn(
            "flex min-w-28 shrink-0 items-center justify-center gap-2 rounded-xl border px-5 py-2 font-display text-sm font-medium transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
            primary
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-foreground",
          )}
        >
          <Icon size={iconSize} className="shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}
