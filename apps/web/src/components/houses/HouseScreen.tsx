"use client";

import { ArrowRightIcon } from "@kinwoo/icons";
import { useRef, useState, type AnimationEvent, type ReactNode } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

const ICON_BUTTON =
  "flex size-9 shrink-0 items-center justify-start hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function HouseScreen({
  title,
  dismissible = false,
  hiddenTitle = false,
  noBack = false,
  children,
}: {
  title: string;
  // Presents the screen as a sheet that slides up on open and down on close.
  dismissible?: boolean;
  hiddenTitle?: boolean;
  noBack?: boolean;
  children: ReactNode;
}) {
  const { goBack } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, dismissible && !closing, () => setClosing(true), true);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  return (
    <main
      ref={screenRef}
      onAnimationEnd={dismissible ? onAnimationEnd : undefined}
      className={cn(
        "flex min-h-dvh flex-col bg-background",
        dismissible && (closing ? "sheet-panel-out" : "sheet-panel-in"),
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2 pb-4",
          noBack ? "px-6" : "px-5",
          noBack
            ? "pt-[calc(2.5rem+env(safe-area-inset-top))]"
            : dismissible
              ? "pt-[calc(1.25rem+env(safe-area-inset-top))]"
              : "pt-[calc(0.75rem+env(safe-area-inset-top))]",
        )}
      >
        {noBack ? null : dismissible ? (
          <button
            type="button"
            aria-label="Close"
            disabled={closing}
            onClick={() => setClosing(true)}
            className={ICON_BUTTON}
          >
            <ArrowRightIcon size={26} className="rotate-90" />
          </button>
        ) : (
          <button type="button" aria-label="Back" onClick={goBack} className={ICON_BUTTON}>
            <ArrowRightIcon size={26} className="rotate-180" />
          </button>
        )}
        <h1
          className={cn(
            "min-w-0 flex-1 truncate font-display text-2xl font-medium",
            hiddenTitle && "invisible",
          )}
        >
          {title}
        </h1>
      </header>
      <div className="flex-1 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {children}
      </div>
    </main>
  );
}
