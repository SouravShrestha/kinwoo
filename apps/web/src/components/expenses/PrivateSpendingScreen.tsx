"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { ArrowRightIcon } from "@kinwoo/icons";
import { useEffect, useState, type AnimationEvent } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

import { PrivateSpending } from "./PrivateSpending";

export function PrivateSpendingScreen() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  return (
    <main
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-10">
        <header className="px-2 pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <h1 className="sr-only">Private spending</h1>
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={() => setClosing(true)}
            className="-ml-2 flex size-10 items-center justify-center hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
        </header>
        {houseId ? <PrivateSpending houseId={houseId} /> : null}
      </div>
    </main>
  );
}
