"use client";

import { BagDollarIcon, BalancesIcon, PendingActiveIcon, SettleUpIcon } from "@kinwoo/icons";
import { useRouter } from "@/lib/router";
import type { ReactNode } from "react";

import { BALANCES_PATH, NEW_EXPENSE_PATH, SETTLE_UP_PATH } from "@/lib/house-navigation";

export function ShortcutCards() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <ShortcutCard
        icon={<SettleUpIcon size={16} />}
        title="Settle up"
        onClick={() => router.push(SETTLE_UP_PATH)}
      />
      <ShortcutCard
        icon={<BagDollarIcon size={12.5} />}
        title="New expense"
        onClick={() => router.push(NEW_EXPENSE_PATH)}
      />
      <ShortcutCard
        icon={<PendingActiveIcon size={16} />}
        title="Pending"
        onClick={() => router.push("/tasks")}
      />
      <ShortcutCard
        icon={<BalancesIcon size={16} />}
        title="Balances"
        onClick={() => router.push(BALANCES_PATH)}
      />
    </div>
  );
}

function ShortcutCard({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-3.5 rounded-lg border border-border bg-card px-4 py-4 text-left hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate font-display text-sm font-normal">{title}</span>
    </button>
  );
}
