"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PlusIcon } from "@kinwoo/icons";
import { cn } from "@/lib/utils";

// Ease-out tween, no spring: the menu settles without overshooting.
const EASE = "duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";
const STAGGER_MS = 50;

export type FabAction = { label: string; icon: ReactNode; onSelect: () => void };

// Actions stack straight up above the + and it turns into a ×. They stay mounted (inert while
// closed) so CSS transitions animate both the opening and the closing.
export function FloatingActionButton({
  actions,
  label = "Add",
  className,
}: {
  actions: readonly FabAction[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after mount
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      // Swallow the click that follows so the outside tap only closes the menu.
      const swallow = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, true), 500);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Portaled: the tab bar's transform would make "fixed" relative to it. Sits under its z-50. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden
            className={cn(
              "pointer-events-none fixed inset-0 z-40 bg-background/20 backdrop-blur-[2px] transition-opacity",
              EASE,
              open ? "opacity-100" : "opacity-0",
            )}
          />,
          document.body,
        )}
      <div
        id={menuId}
        inert={!open}
        className="absolute right-0 bottom-full mb-5 flex flex-col items-end gap-2.5"
      >
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              setOpen(false);
              action.onSelect();
            }}
            // The action nearest the button comes in first; closing runs together.
            style={{
              transitionDelay: open ? `${(actions.length - 1 - index) * STAGGER_MS}ms` : "0ms",
            }}
            className={cn(
              "flex origin-bottom-right items-center gap-2.5 rounded-full border border-border bg-card py-3.5 pr-5 pl-4 font-display text-sm font-medium whitespace-nowrap text-foreground shadow-[0_10px_28px_#00000026] transition-[opacity,translate,scale] hover:cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:shadow-[0_10px_28px_#00000080]",
              EASE,
              open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
            )}
          >
            <span aria-hidden className="flex text-primary">
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close add menu" : label}
        aria-expanded={open}
        aria-controls={menuId}
        className="pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_17px_#00000040] transition-[scale] hover:cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 dark:shadow-[0_6px_17px_#00000080]"
      >
        <span
          aria-hidden
          className={cn("flex transition-[rotate]", EASE, open ? "rotate-45" : "rotate-0")}
        >
          <PlusIcon />
        </span>
      </button>
    </div>
  );
}
