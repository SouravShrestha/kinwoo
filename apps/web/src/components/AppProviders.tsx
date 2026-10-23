"use client";

import { configureApiClient } from "@kinwoo/client/api";
import { useOfflineToast } from "@kinwoo/client/activity";
import { AuthProvider } from "@kinwoo/client/auth";
import { GroceryRealtime } from "@kinwoo/client/grocery";
import { HousesProvider, useActiveHouse } from "@kinwoo/client/houses";
import { ProfileProvider } from "@kinwoo/client/profile";
import { onlineManager } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AuthGate } from "./AuthGate";
import { DoubleClickGuard } from "./DoubleClickGuard";
import { FontScale } from "./FontScale";
import { HouseGate } from "./HouseGate";
import { InstallPromoSheet } from "./InstallPromoSheet";
import { Toaster } from "./Toaster";
import { TopLoader } from "./TopLoader";
import { webAuthAdapter } from "@/lib/auth-adapter";
import { houseStorage } from "@/lib/house-storage";
import "@/lib/install-prompt";
import { supabase } from "@/integrations/supabase/client";

// Same-origin, so requests carry the session cookie. Configured at module scope to
// avoid racing the first render.
configureApiClient({ baseUrl: "" });

// React Query assumes online until the first online/offline event, which never comes when the
// page itself loads offline.
if (typeof navigator !== "undefined") {
  onlineManager.setOnline(navigator.onLine);
  // Production only: a dev service worker would serve stale chunks over HMR.
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function GroceryRealtimeGate() {
  const { activeHouse } = useActiveHouse();
  if (!activeHouse) return null;
  return <GroceryRealtime client={supabase} houseId={activeHouse.house.id} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  useOfflineToast();

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
          <FontScale />
          {children}
          <AuthGate />
          <HouseGate />
          <InstallPromoSheet />
        </HousesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
