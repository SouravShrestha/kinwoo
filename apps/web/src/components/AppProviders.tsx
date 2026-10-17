"use client";

import { configureApiClient } from "@kinwoo/client/api";
import { AuthProvider } from "@kinwoo/client/auth";
import { GroceryRealtime } from "@kinwoo/client/grocery";
import { HousesProvider, useActiveHouse } from "@kinwoo/client/houses";
import { ProfileProvider } from "@kinwoo/client/profile";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AuthGate } from "./AuthGate";
import { DoubleClickGuard } from "./DoubleClickGuard";
import { HouseGate } from "./HouseGate";
import { Toaster } from "./Toaster";
import { TopLoader } from "./TopLoader";
import { webAuthAdapter } from "@/lib/auth-adapter";
import { houseStorage } from "@/lib/house-storage";
import { supabase } from "@/integrations/supabase/client";

// Same-origin, so requests carry the session cookie. Configured at module scope to
// avoid racing the first render.
configureApiClient({ baseUrl: "" });

function GroceryRealtimeGate() {
  const { activeHouse } = useActiveHouse();
  if (!activeHouse) return null;
  return <GroceryRealtime client={supabase} houseId={activeHouse.house.id} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <AuthProvider adapter={webAuthAdapter}>
      <ProfileProvider>
        <HousesProvider
          storage={houseStorage}
          realtimeClient={supabase}
          onPendingInvite={(code) =>
            router.push(`/house/join?code=${encodeURIComponent(code)}&confirm=1`)
          }
        >
          <GroceryRealtimeGate />
          <TopLoader />
          <Toaster />
          <DoubleClickGuard />
          {children}
          <AuthGate />
          <HouseGate />
        </HousesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
