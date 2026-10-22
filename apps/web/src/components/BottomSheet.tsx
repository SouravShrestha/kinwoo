"use client";

import { isTop, push, remove } from "@kinwoo/client/sheets";
import { CloseIcon } from "@kinwoo/icons";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MISFIRE_MS = 300;
const EXIT_FALLBACK_MS = 400;

export function BottomSheet({
  open,
  onClose,
  label,
  className,
  zClassName = "z-80",
  dismissable = true,
  showHandle = true,
  showClose = false,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  className?: string;
  zClassName?: string;
  dismissable?: boolean;
  showHandle?: boolean;
  showClose?: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const stackId = useRef(Symbol("sheet"));
  const openedAt = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Synced during render rather than in an effect so the enter animation starts
  // on the same commit that mounts the panel.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setClosing(false);
    } else {
      setClosing((wasClosing) => wasClosing || rendered);
    }
  }

  useEffect(() => {
    // An SSR-safe "has mounted" flag. createPortal needs document.body, which
    // does not exist during the server render, so this cannot be derived and
    // has to run after the first client commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) openedAt.current = Date.now();
  }, [open]);

  // Only the topmost sheet answers Escape and Tab, so a confirmation stacked on another sheet
  // doesn't also close or trap the sheet underneath.
  useEffect(() => {
    if (!open) return;
    const id = stackId.current;
    push(id);
    return () => remove(id);
  }, [open]);

  const guardedClose = useCallback(() => {
    if (Date.now() - openedAt.current < MISFIRE_MS) return;
    onClose?.();
  }, [onClose]);

  // Belt and braces: unmount even if the animation event never fires.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, EXIT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isTop(stackId.current)) guardedClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, guardedClose]);

  // Without this a keyboard or screen reader user stays anchored to a trigger
  // that is now behind an overlay, or to nothing once the sheet unmounts.
  useEffect(() => {
    if (!open) {
      previousFocus.current?.focus();
      previousFocus.current = null;
      return;
    }

    previousFocus.current = document.activeElement as HTMLElement | null;
    const first =
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
  }, [open]);

  // Runs for non-dismissable sheets too: the login wall has no escape hatch, so
  // letting focus wander behind it would trap the user with no way back.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !isTop(stackId.current)) return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useSwipeToClose(panelRef, mounted && rendered && dismissable && !closing, guardedClose);

  if (!mounted || !rendered) return null;

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={dismissable ? guardedClose : undefined}
        className={cn(
          "fixed inset-0 touch-none bg-black/50",
          !dismissable && "pointer-events-none",
          zClassName,
          closing ? "sheet-backdrop-out" : "sheet-backdrop-in",
        )}
      />

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 flex justify-center",
          zClassName,
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget || !closing) return;
            setRendered(false);
            setClosing(false);
          }}
          className={cn(
            "pointer-events-auto relative w-full max-w-md rounded-t-2xl bg-sheet px-6",
            "pb-[max(2rem,env(safe-area-inset-bottom))]",
            "max-h-[calc(100dvh-1.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain",
            closing ? "sheet-panel-out" : "sheet-panel-in",
            className,
          )}
        >
          <div
            aria-hidden
            className={cn("flex h-6 items-center justify-center", showHandle ? "mb-3.5" : "mb-3")}
          >
            {showHandle && <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />}
          </div>
          {showClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={guardedClose}
              className="absolute right-3 top-8 flex size-9 items-center justify-center rounded-full hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <CloseIcon size={22} />
            </button>
          )}
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
