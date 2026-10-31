"use client";

import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { useAuth } from "@kinwoo/client/auth";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { SETTLED_UP_HINT, unsettledPairs } from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon } from "@kinwoo/icons";
import Link from "next/link";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { EmptyItems } from "@/components/grocery/EmptyItems";
import { Avatar } from "@/components/houses/Avatar";

import { SettleUpSkeleton } from "@/components/skeleton/skeletons";
import { recordPaymentPath, useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

function Balances({ houseId, simplifyDebts }: { houseId: string; simplifyDebts: boolean }) {
  const { user } = useAuth();
  const { data: balances, isError } = useHouseBalances(houseId, simplifyDebts);
  const { data: members } = useHouseMembers(houseId);
  if (!balances || !user) {
    return isError ? (
      <div className="flex flex-1 flex-col">
        <EmptyItems image="expense" title={LOAD_FAILED_MESSAGE} />
      </div>
    ) : (
      <SettleUpSkeleton />
    );
  }
  const pairs = unsettledPairs(balances);
  if (pairs.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <EmptyItems image="expense" title="You are settled up" hint={SETTLED_UP_HINT} />
      </div>
    );
  }

  return (
    <>
      <h2 className="mt-4 px-6 font-display text-xl font-normal text-foreground">
        Which balance do you want to settle?
      </h2>
      <ul className="mt-8">
        {pairs.map((pair, index) => {
          const owes = pair.netPaise < 0;
          const email = members?.find((member) => member.userId === pair.userId)?.email;
          const tone = owes ? "text-destructive" : "text-accent";
          return (
            <li
              key={pair.userId}
              className={cn(index < pairs.length - 1 && "border-b border-border")}
            >
              <Link
                href={recordPaymentPath(
                  owes ? user.id : pair.userId,
                  owes ? pair.userId : user.id,
                  Math.abs(pair.netPaise),
                )}
                className="flex w-full items-center gap-4 px-6 py-5 text-left transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
              >
                <Avatar name={pair.name} url={pair.avatarUrl} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base text-foreground">
                    {memberDisplayName(pair.name)}
                  </span>
                  {email ? (
                    <span className="mt-0.5 block truncate font-display text-xs text-muted-foreground">
                      {email}
                    </span>
                  ) : null}
                </span>
                <span className={cn("flex flex-col items-end font-display", tone)}>
                  <span className="text-xs">{owes ? "you owe" : "owes you"}</span>
                  <span className="text-base font-medium">
                    {formatPaise(Math.abs(pair.netPaise))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function SettleUpScreen() {
  const { activeHouse, ready } = useActiveHouse();
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
          <h1 className="sr-only">Settle up</h1>
        </header>
        {activeHouse ? (
          <Balances
            houseId={activeHouse.house.id}
            simplifyDebts={activeHouse.house.simplifyDebts}
          />
        ) : null}
      </div>
    </main>
  );
}
