"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryOverview } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { homeGreeting } from "@kinwoo/core/houses";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AndroidInstallBanner } from "@/components/AndroidInstallBanner";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { BalanceCard } from "@/components/home/BalanceCard";
import { HomeHeaderActions } from "@/components/home/HomeHeaderActions";
import { HomeLoadError } from "@/components/home/HomeLoadError";
import { HouseHeader } from "@/components/home/HouseHeader";
import { MyToBuySection } from "@/components/home/MyToBuySection";
import { QuickAddBar } from "@/components/home/QuickAddBar";
import { ShortcutCards } from "@/components/home/ShortcutCards";
import { TodayItemsSection } from "@/components/home/TodayItemsSection";
import { WelcomeHeader } from "@/components/home/WelcomeHeader";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { InviteFriendsCard } from "@/components/houses/InviteFriendsCard";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import {
  BalanceCardSkeleton,
  HouseHeaderSkeleton,
  ItemCarouselSkeleton,
  QuickAddBarSkeleton,
} from "@/components/skeleton/skeletons";

export function HomeScreen() {
  const router = useRouter();
  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
  const [menuOpen, setMenuOpen] = useState(false);
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
  const balanceLoading = members.isPending || (!isOnlyMember && balancesPending);

  useBusyWhile(!ready);

  return (
    <main className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col pb-6">
      <AndroidInstallBanner dismissable />
      <header className="flex items-center justify-between px-6 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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

      <div className="flex flex-1 flex-col px-6 pt-4">
        {!ready ? (
          <div className="space-y-5">
            <BalanceCardSkeleton />
            <ShortcutCards />
            <div className="mt-4">
              <QuickAddBarSkeleton />
            </div>
            <div className="space-y-10 my-8">
              <ItemCarouselSkeleton />
              <ItemCarouselSkeleton />
            </div>
          </div>
        ) : hasLoadError ? (
          <div className="flex flex-col items-center pt-8 text-center">
            <HomeLoadError onRetry={() => void refetchHouses()} />
          </div>
        ) : !house ? (
          <div className="flex flex-1 flex-col items-center pt-8 text-center">
            <SetupHousePrompt
              onCreate={() => router.push("/house/create")}
              onJoin={() => router.push("/house/join")}
            />
          </div>
        ) : (
          <div className="space-y-5">
            {isOnlyMember ? (
              <InviteFriendsCard canInvite={isAdmin} onPress={() => router.push("/house/invite")} />
            ) : null}

            {balanceLoading ? (
              <BalanceCardSkeleton />
            ) : !isOnlyMember && balances ? (
              <BalanceCard balances={balances} />
            ) : null}

            <ShortcutCards />

            <QuickAddBar
              houseId={house.id}
              onPress={(listId) => router.push(`/item/new?listId=${encodeURIComponent(listId)}`)}
            />

            <div className="space-y-10 my-8">
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

      <HouseSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
