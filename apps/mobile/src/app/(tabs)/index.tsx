import { useBusyWhile } from "@kinwoo/client/activity";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryOverview } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { homeGreeting } from "@kinwoo/core/houses";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryOverviewItem | null>(null);

  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
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
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
      >
        <View
          className="flex-row items-center justify-between px-6 pb-6"
          style={{ paddingTop: insets.top + 12 }}
        >
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
        </View>

        <View className="flex-1">
          {!ready ? (
            <View className="gap-5 px-6 pt-4">
              <BalanceCardSkeleton />
              <ShortcutCards />
              <QuickAddBarSkeleton />
              <View className="mb-8 mt-3 gap-10">
                <ItemCarouselSkeleton />
                <ItemCarouselSkeleton />
              </View>
            </View>
          ) : hasLoadError ? (
            <View className="flex-1 items-center px-6 pt-5">
              <HomeLoadError onRetry={() => void refetchHouses()} />
            </View>
          ) : !house ? (
            <View className="flex-1 items-center px-6 pt-5">
              <SetupHousePrompt
                onCreate={() => router.push("/house/create")}
                onJoin={() => router.push("/house/join")}
              />
            </View>
          ) : (
            <View className="gap-5 px-6 pt-4">
              {isOnlyMember ? (
                <InviteFriendsCard
                  canInvite={isAdmin}
                  onPress={() => router.push("/house/invite")}
                />
              ) : null}

              {balanceLoading ? (
                <BalanceCardSkeleton />
              ) : !isOnlyMember && balances ? (
                <BalanceCard balances={balances} />
              ) : null}

              <ShortcutCards />

              <QuickAddBar
                houseId={house.id}
                onPress={(listId) => router.push({ pathname: "/item/new", params: { listId } })}
              />

              <View className="mb-8 mt-3 gap-10">
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
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <ItemDetailSheet
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        houseId={house?.id ?? ""}
        listId={selectedItem?.listId ?? ""}
        itemId={selectedItem?.id ?? null}
      />

      <HouseSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}
