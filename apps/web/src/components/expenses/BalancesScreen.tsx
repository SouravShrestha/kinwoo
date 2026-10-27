"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { ArrowRightIcon } from "@kinwoo/icons";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

import { MemberBalances } from "./MemberBalances";

export function BalancesScreen() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, !closing, () => setClosing(true));

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  return (
    <main
      ref={screenRef}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <header className="px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={() => setClosing(true)}
            className="flex size-10 items-center justify-start hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
          <h1 className="mt-4 font-display text-xl font-normal text-foreground">Balance Summary</h1>
        </header>
        {houseId ? <MemberBalances houseId={houseId} /> : null}
      </div>
    </main>
  );
}
