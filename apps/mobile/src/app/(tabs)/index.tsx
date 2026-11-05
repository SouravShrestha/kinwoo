import { useBusyWhile } from "@kinwoo/client/activity";
import { useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryOverview } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { homeGreeting } from "@kinwoo/core/houses";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { useTabBarSpace } from "@/lib/tab-bar";

// Decor falls in once per app open; later Home visits show it settled until the Santa is tapped.
let decorSeen = false;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  // Bumped when the Santa is tapped; remounting HomeDecor replays its fall-in.
  const [decorPlays, setDecorPlays] = useState(0);
  const [decorStill] = useState(decorSeen);
  useEffect(() => {
    decorSeen = true;
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
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
  const balanceLoading = !!house && (members.isPending || (!isOnlyMember && balancesPending));

  useBusyWhile(!ready);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: tabBarSpace + 24 }}
      >
        {/* Fills the iOS overscroll gap above the page with the header colour. */}
        <View pointerEvents="none" className="absolute inset-x-0 bottom-full h-[1000px] bg-muted" />
        <View
          className="overflow-hidden rounded-b-[28px] bg-muted px-6"
          style={{ paddingTop: insets.top + 12 }}
        >
          <HomeDecor key={decorPlays} animate={!decorStill || decorPlays > 0} />
          <View className="flex-row items-center justify-between pb-1">
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
          <View className="mt-2">
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
                <View className="shrink items-end gap-1.5">
                  <Text
                    numberOfLines={2}
                    className="text-right font-display-medium text-base text-foreground"
                  >
                    {"Every home starts\nsomewhere"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-right font-display-medium text-base text-muted-foreground"
                  >
                    Set yours up to share
                  </Text>
                </View>
              </HeroCard>
            ) : (
              <View className="pb-6" />
            )}
          </View>
        </View>

        <View className="flex-1">
          {!ready ? (
            <View className="gap-8 pt-8">
              <View className="px-6">
                <ShortcutCards />
              </View>
              <View className="gap-10 px-6">
                <ItemCarouselSkeleton />
                <ItemCarouselSkeleton />
              </View>
            </View>
          ) : hasLoadError ? (
            <View className="flex-1 items-center px-6 pt-8">
              <HomeLoadError onRetry={() => void refetchHouses()} />
            </View>
          ) : !house ? (
            <View className="flex-1 items-center px-6 pt-8">
              <SetupHousePrompt
                onCreate={() => router.push("/house/create")}
                onJoin={() => router.push("/house/join")}
              />
            </View>
          ) : (
            <View className="gap-8 pt-8">
              <View className="gap-5 px-6">
                <ShortcutCards />
              </View>
              <View className="gap-10 px-6">
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

      <HouseSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSwitch={() => {
          setMenuOpen(false);
          setSwitchOpen(true);
        }}
      />
      <SwitchHouseSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </View>
  );
}
