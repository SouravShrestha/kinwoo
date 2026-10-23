"use client";

import { isTop, push, remove } from "@kinwoo/client/sheets";
import { CONFIRM_CANCEL_LABEL, type ConfirmCopy, type ConfirmIconName } from "@kinwoo/core/confirm";
import {
  ArchiveIcon,
  LeaveHouseIcon,
  LockFilledIcon,
  LogoutIcon,
  TrashIcon,
  UserCheckIcon,
  UnlinkIcon,
  UserCrossIcon,
  WorldIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import { useEffect, useRef, type ComponentType } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { Button } from "./Button";

const ICONS: Record<ConfirmIconName, ComponentType<WebIconProps>> = {
  trash: TrashIcon,
  archive: ArchiveIcon,
  logout: LogoutIcon,
  lock: LockFilledIcon,
  world: WorldIcon,
  leaveHouse: LeaveHouseIcon,
  userCheck: UserCheckIcon,
  userCross: UserCrossIcon,
  unlink: UnlinkIcon,
};

// A centred card over a dimmed backdrop. It interrupts the current flow rather than being part of
// it, so it is a dialog and not a bottom sheet. Portalled because a sheet panel's transform would
// otherwise become the containing block of its fixed positioning.
export function ConfirmDialog({
  open,
  copy,
  error,
  onConfirm,
  onCancel,
  isPending = false,
  zClassName = "z-90",
}: {
  open: boolean;
  copy: ConfirmCopy;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  zClassName?: string;
}) {
  const stackId = useRef(Symbol("dialog"));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = stackId.current;
    push(id);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => remove(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (!isTop(stackId.current)) return;

      if (event.key === "Escape" && !isPending) {
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;
      const buttons = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [],
      );
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending, onCancel]);

  if (!open) return null;

  const Icon = ICONS[copy.icon];

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={copy.title}
      className={cn("fixed inset-0 flex items-center justify-center bg-backdrop px-6", zClassName)}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-dialog-border bg-dialog"
      >
        <div
          className={cn(
            "flex justify-center py-6",
            copy.tone === "destructive" ? "text-destructive" : "text-foreground",
          )}
        >
          <Icon size={24} />
        </div>

        <h2 className="bg-dialog-header px-6 py-3 mt-1 text-center font-display text-lg font-medium">
          {copy.title}
        </h2>

        <div className="px-6 pt-5 text-center my-2">
          <p className="whitespace-pre-line font-display text-base text-foreground">
            {copy.message}
          </p>
          {error ? (
            <p role="alert" className="mt-3 text-center text-base text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-4 px-6 pt-6 pb-5">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="flex h-14 flex-1 items-center justify-center font-display text-base font-medium text-foreground hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-block border-b-[1.4px] border-foreground">
              {CONFIRM_CANCEL_LABEL}
            </span>
          </button>
          <div className="flex-1">
            <Button label={copy.confirmLabel} loading={isPending} onClick={onConfirm} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
