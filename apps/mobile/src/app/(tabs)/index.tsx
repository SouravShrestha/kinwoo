import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryOverviewItem | null>(null);

  const { user } = useAuth();
  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
  const { profile } = useProfile();

  const house = activeHouse?.house ?? null;
  const isAdmin = activeHouse?.role === "admin";
  const members = useHouseMembers(house?.id ?? null);
  const isOnlyMember = members.data?.length === 1;
  const hasLoadError = loadFailed && houses.length === 0;
  const showWelcome = ready && !house && !hasLoadError;
  const greeting = homeGreeting(profile?.displayName);

  const { data: overview } = useGroceryOverview(house?.id ?? null);

  useBusyWhile(!ready);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-6 pb-4"
        style={{ paddingTop: insets.top + 12 }}
      >
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
      </View>

      <View className="flex-1">
        {!ready ? null : hasLoadError ? (
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: insets.bottom + 24,
              gap: 20,
            }}
          >
            <QuickAddBar
              houseId={house.id}
              onPress={(listId) => router.push({ pathname: "/item/new", params: { listId } })}
            />

            {isOnlyMember ? (
              <InviteFriendsCard canInvite={isAdmin} onPress={() => router.push("/house/invite")} />
            ) : null}

            <TodayItemsSection items={overview?.todayItems ?? []} onItemPress={setSelectedItem} />

            <MyToBuySection
              items={overview?.myToBuy ?? []}
              currentUserId={user?.id ?? ""}
              onItemPress={setSelectedItem}
            />
          </ScrollView>
        )}
      </View>

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
