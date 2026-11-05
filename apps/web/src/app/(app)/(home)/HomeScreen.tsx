"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryOverview } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { homeGreeting } from "@kinwoo/core/houses";
import { useRouter } from "@/lib/router";
import { useEffect, useState } from "react";

import { AndroidInstallBanner } from "@/components/AndroidInstallBanner";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { BalanceCard, HeroCard } from "@/components/home/BalanceCard";
import { HomeHeaderActions } from "@/components/home/HomeHeaderActions";
import { HomeDecor } from "@/components/home/HomeDecor";
import { HomeLoadError } from "@/components/home/HomeLoadError";
import { HouseHeader } from "@/components/home/HouseHeader";
import { MyToBuySection } from "@/components/home/MyToBuySection";
import { ShortcutCards } from "@/components/home/ShortcutCards";
import { TodayItemsSection } from "@/components/home/TodayItemsSection";
import { WelcomeHeader } from "@/components/home/WelcomeHeader";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { InviteFriendsCard } from "@/components/houses/InviteFriendsCard";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import { SwitchHouseSheet } from "@/components/houses/SwitchHouseSheet";
import {
  BalanceCardSkeleton,
  HouseHeaderSkeleton,
  ItemCarouselSkeleton,
} from "@/components/skeleton/skeletons";

// Decor falls in once per app open; later Home visits show it settled until the Santa is tapped.
let decorSeen = false;

export function HomeScreen() {
  const router = useRouter();
  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
  // Bumped when the Santa is tapped; remounting HomeDecor replays its fall-in.
  const [decorPlays, setDecorPlays] = useState(0);
  const [decorStill] = useState(decorSeen);
  useEffect(() => {
    decorSeen = true;
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryOverviewItem | null>(null);

  const { profile } = useProfile();

  const house = activeHouse?.house ?? null;
  const isAdmin = activeHouse?.role === "admin";
  const members = useHouseMembers(house?.id ?? null);
  const isOnlyMember = members.data?.length === 1;
  const hasLoadError = loadFailed && houses.length === 0;
  const showWelcome = ready && !house && !hasLoadError;
  const greeting = homeGreeting(profile?.displayName);

  const { data: overview, isPending: overviewPending } = useGroceryOverview(house?.id ?? null);
  const todayItems = overview?.todayItems ?? [];
  const mineItems = overview?.myToBuy ?? [];
  const mineFirst = mineItems.length > 0 && todayItems.length === 0;
  const todayRow = (
    <TodayItemsSection
      key="today"
      houseId={house?.id ?? ""}
      items={todayItems}
      onItemPress={setSelectedItem}
    />
  );
  const mineRow = (
    <MyToBuySection
      key="mine"
      houseId={house?.id ?? ""}
      items={mineItems}
      onItemPress={setSelectedItem}
    />
  );
  const { data: balances, isPending: balancesPending } = useHouseBalances(
    house?.id ?? null,
    house?.simplifyDebts ?? false,
  );
  const balanceLoading = !!house && (members.isPending || (!isOnlyMember && balancesPending));

  useBusyWhile(!ready);

  return (
    <main className="flex min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] flex-col pb-6">
      <AndroidInstallBanner dismissable />
      {/* Fills the iOS rubber-band and pull-to-refresh gap above the page with the header colour. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full h-dvh bg-muted"
      />
      <section
        data-status-tint="muted"
        className="relative overflow-hidden rounded-b-[28px] bg-muted px-6 pt-[calc(0.75rem+env(safe-area-inset-top))]"
      >
        <HomeDecor key={decorPlays} animate={!decorStill || decorPlays > 0} />
        <header className="relative flex items-center justify-between pb-1">
          {!ready ? (
            <HouseHeaderSkeleton />
          ) : showWelcome ? (
            <WelcomeHeader salutation={greeting.salutation} message={greeting.message} />
          ) : (
            <HouseHeader
              name={house?.name ?? null}
              address={house?.address ?? null}
              onPressHouse={() => setMenuOpen(true)}
            />
          )}
          {ready ? <HomeHeaderActions showNotifications={!showWelcome} /> : null}
        </header>
        <div className="relative mt-2">
          {!ready || balanceLoading ? (
            <BalanceCardSkeleton />
          ) : house && !isOnlyMember && balances ? (
            <BalanceCard balances={balances} onReplay={() => setDecorPlays((n) => n + 1)} />
          ) : house && isOnlyMember ? (
            <InviteFriendsCard
              canInvite={isAdmin}
              onPress={() => router.push("/house/invite")}
              onReplay={() => setDecorPlays((n) => n + 1)}
            />
          ) : showWelcome ? (
            <HeroCard onReplay={() => setDecorPlays((n) => n + 1)}>
              <div className="flex flex-col items-end gap-1.5 text-right font-display font-medium">
                <span className="text-base whitespace-nowrap">
                  Every home starts
                  <br />
                  somewhere
                </span>
                <span className="text-base whitespace-nowrap text-muted-foreground">
                  Set yours up to share
                </span>
              </div>
            </HeroCard>
          ) : (
            <div className="pb-6" />
          )}
        </div>
      </section>

      <div className="flex flex-1 flex-col">
        {!ready ? (
          <div className="space-y-8 pt-8">
            <div className="px-6">
              <ShortcutCards />
            </div>
            <div className="space-y-10 px-6">
              <ItemCarouselSkeleton />
              <ItemCarouselSkeleton />
            </div>
          </div>
        ) : hasLoadError ? (
          <div className="flex flex-col items-center px-6 pt-8 text-center">
            <HomeLoadError onRetry={() => void refetchHouses()} />
          </div>
        ) : !house ? (
          <div className="flex flex-1 flex-col items-center px-6 pt-8 text-center">
            <SetupHousePrompt
              onCreate={() => router.push("/house/create")}
              onJoin={() => router.push("/house/join")}
            />
          </div>
        ) : (
          <div className="space-y-8 pt-8">
            <div className="space-y-5 px-6">
              <ShortcutCards />
            </div>
            <div className="space-y-10 px-6">
              {overviewPending ? (
                <>
                  <ItemCarouselSkeleton />
                  <ItemCarouselSkeleton />
                </>
              ) : mineFirst ? (
                [mineRow, todayRow]
              ) : (
                [todayRow, mineRow]
              )}
            </div>
          </div>
        )}
      </div>

      {house && selectedItem ? (
        <ItemDetailSheet
          open={selectedItem !== null}
          onClose={() => setSelectedItem(null)}
          houseId={house.id}
          listId={selectedItem.listId}
          itemId={selectedItem.id}
        />
      ) : null}

      <HouseSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSwitch={() => {
          setMenuOpen(false);
          setSwitchOpen(true);
        }}
      />
      <SwitchHouseSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </main>
  );
}
