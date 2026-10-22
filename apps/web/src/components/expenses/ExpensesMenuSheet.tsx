"use client";

import { ArrowRightIcon, CloudLockFilledIcon, SimplifyIcon } from "@kinwoo/icons";

import { BottomSheet } from "@/components/BottomSheet";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { Switch } from "@/components/Switch";

export function ExpensesMenuSheet({
  open,
  onClose,
  simplifyDebts,
  onSimplifyDebtsChange,
  onViewPrivate,
}: {
  open: boolean;
  onClose: () => void;
  simplifyDebts: boolean;
  onSimplifyDebtsChange: (next: boolean) => void;
  onViewPrivate: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Expense options" showClose>
      <SheetHeader />
      <div className="mt-16 flex items-center gap-3">
        <SimplifyIcon size={20} className="shrink-0 text-foreground" />
        <div className="flex-1">
          <p className="font-display text-base text-foreground">Simplify debts</p>
          <p className="mt-1 font-display text-sm text-muted-foreground">
            Combine debts across the house so everyone settles up in fewer payments
          </p>
        </div>
        <Switch checked={simplifyDebts} onChange={onSimplifyDebtsChange} label="Simplify debts" />
      </div>
      <button
        type="button"
        onClick={onViewPrivate}
        className="mt-6 flex min-h-12 w-full items-center gap-3 text-left text-foreground transition-opacity hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <CloudLockFilledIcon size={20} />
        <span className="flex-1 font-display text-base">View private spending</span>
        <ArrowRightIcon size={20} className="text-muted-foreground" />
      </button>
    </BottomSheet>
  );
}
