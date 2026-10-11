import { useBusyWhile } from "@kinwoo/client/activity";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import { homeGreeting } from "@kinwoo/core/houses";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeLoadError } from "@/components/home/HomeLoadError";
import { HouseHeader } from "@/components/home/HouseHeader";
import { WelcomeHeader } from "@/components/home/WelcomeHeader";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { InviteFriendsCard } from "@/components/houses/InviteFriendsCard";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
  const { profile } = useProfile();

  const house = activeHouse?.house ?? null;
  const isAdmin = activeHouse?.role === "admin";
  const members = useHouseMembers(house?.id ?? null);
  const isOnlyMember = members.data?.length === 1;
  const hasLoadError = loadFailed && houses.length === 0;
  const showWelcome = ready && !house && !hasLoadError;
  const greeting = homeGreeting(profile?.displayName);
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
      </View>

      <View className="flex-1 items-center px-6 pt-5">
        {!ready ? null : hasLoadError ? (
          <HomeLoadError onRetry={() => void refetchHouses()} />
        ) : !house ? (
          <SetupHousePrompt
            onCreate={() => router.push("/house/create")}
            onJoin={() => router.push("/house/join")}
          />
        ) : isOnlyMember ? (
          <InviteFriendsCard canInvite={isAdmin} onPress={() => router.push("/house/invite")} />
        ) : null}
      </View>

      <HouseSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}
