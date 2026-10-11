"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import { homeGreeting } from "@kinwoo/core/houses";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { HomeLoadError } from "@/components/home/HomeLoadError";
import { HouseHeader } from "@/components/home/HouseHeader";
import { WelcomeHeader } from "@/components/home/WelcomeHeader";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { InviteFriendsCard } from "@/components/houses/InviteFriendsCard";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";

export function HomeScreen() {
  const { activeHouse, houses, ready, loadFailed, refetchHouses } = useActiveHouse();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center justify-between px-6 pb-4 pt-6">
        {!ready ? null : showWelcome ? (
          <WelcomeHeader salutation={greeting.salutation} message={greeting.message} />
        ) : (
          <HouseHeader
            name={house?.name ?? null}
            address={house?.address ?? null}
            onPressHouse={() => setMenuOpen(true)}
          />
        )}
      </header>

      <div className="flex flex-1 flex-col items-center px-6 text-center pt-5">
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
      </div>

      <HouseSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
