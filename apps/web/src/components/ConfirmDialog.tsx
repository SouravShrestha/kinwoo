"use client";

import { isTop, push, remove } from "@kinwoo/client/sheets";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { Button } from "./Button";

// A centred card over a dimmed backdrop. It interrupts the current flow rather than being part of
// it, so it is a dialog and not a bottom sheet. Portalled because a sheet panel's transform would
// otherwise become the containing block of its fixed positioning.
export function ConfirmDialog({
  open,
  title,
  description,
  error,
  confirmLabel,
  confirmVariant = "destructive",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isPending = false,
  zClassName = "z-90",
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  error?: string | null;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  cancelLabel?: string;
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

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className={cn("fixed inset-0 flex items-center justify-center bg-black/60 px-6", zClassName)}
    >
      <div
        ref={panelRef}
        className="flex w-full max-w-xs flex-col gap-5 rounded-2xl border border-border bg-sheet p-6"
      >
        <div className="text-center">
          <h2 className="font-display text-lg font-medium">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Button label={cancelLabel} variant="outline" disabled={isPending} onClick={onCancel} />
          </div>
          <div className="flex-1">
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              loading={isPending}
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
