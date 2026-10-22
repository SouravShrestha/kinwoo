"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryOverview } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { homeGreeting } from "@kinwoo/core/houses";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { BalanceCard } from "@/components/home/BalanceCard";
import { HomeHeaderActions } from "@/components/home/HomeHeaderActions";
import { HomeLoadError } from "@/components/home/HomeLoadError";
import { HouseHeader } from "@/components/home/HouseHeader";
import { MyToBuySection } from "@/components/home/MyToBuySection";
import { QuickAddBar } from "@/components/home/QuickAddBar";
import { TodayItemsSection } from "@/components/home/TodayItemsSection";
import { WelcomeHeader } from "@/components/home/WelcomeHeader";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { InviteFriendsCard } from "@/components/houses/InviteFriendsCard";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";

export function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
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

  const { data: overview } = useGroceryOverview(house?.id ?? null);
  const { data: balances } = useHouseBalances(house?.id ?? null, house?.simplifyDebts ?? false);

  useBusyWhile(!ready);

  return (
    <main className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col pb-6">
      <header className="flex items-center justify-between px-6 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {!ready ? null : showWelcome ? (
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

      <div className="flex flex-1 flex-col px-6 pt-2">
        {!ready ? null : hasLoadError ? (
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
            <QuickAddBar
              houseId={house.id}
              onPress={(listId) => router.push(`/item/new?listId=${encodeURIComponent(listId)}`)}
            />

            {isOnlyMember ? (
              <InviteFriendsCard canInvite={isAdmin} onPress={() => router.push("/house/invite")} />
            ) : balances ? (
              <BalanceCard balances={balances} />
            ) : null}

            <TodayItemsSection items={overview?.todayItems ?? []} onItemPress={setSelectedItem} />

            <MyToBuySection
              items={overview?.myToBuy ?? []}
              currentUserId={user?.id ?? ""}
              onItemPress={setSelectedItem}
            />
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
