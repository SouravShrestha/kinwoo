"use client";

import { BagDollarIcon, BalancesIcon, PendingActiveIcon, SettleUpIcon } from "@kinwoo/icons";
import { useRouter } from "@/lib/router";
import type { ReactNode } from "react";

import { BALANCES_PATH, NEW_EXPENSE_PATH, SETTLE_UP_PATH } from "@/lib/house-navigation";

export function ShortcutCards() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <ShortcutCard
        icon={<SettleUpIcon size={20} />}
        title={"Settle\nup"}
        onClick={() => router.push(SETTLE_UP_PATH)}
      />
      <ShortcutCard
        icon={<BagDollarIcon size={16} />}
        title={"Add\nexpense"}
        onClick={() => router.push(NEW_EXPENSE_PATH)}
      />
      <ShortcutCard
        icon={<PendingActiveIcon size={20} />}
        title={"Pending\nitems"}
        onClick={() => router.push("/tasks")}
      />
      <ShortcutCard
        icon={<BalancesIcon size={20} />}
        title={"Balance\nsummary"}
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
      className="flex min-w-0 flex-col items-center gap-2.5 py-1 hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex size-[60px] items-center justify-center rounded-full bg-card text-primary shadow-[0_2px_8px_var(--shadow)]">
        {icon}
      </span>
      <span className="max-w-full whitespace-pre-line text-center font-display text-xs leading-tight font-medium">
        {title}
      </span>
    </button>
  );
}
