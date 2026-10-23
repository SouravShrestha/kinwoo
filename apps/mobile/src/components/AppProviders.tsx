import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { configureApiClient } from "@kinwoo/client/api";
import { AuthProvider } from "@kinwoo/client/auth";
import { useOfflineToast } from "@kinwoo/client/activity";
import { HousesProvider } from "@kinwoo/client/houses";
import { ProfileProvider } from "@kinwoo/client/profile";
import { router } from "expo-router";
import { useEffect, type ReactNode } from "react";

import { GroceryRealtime } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { AuthGate } from "./AuthGate";
import { HouseGate } from "./HouseGate";
import { SplashGate } from "./SplashGate";
import { ToastHost } from "./Toast";
import { TopLoader } from "./TopLoader";
import { nativeAuthAdapter } from "@/lib/auth-adapter";
import { installFocusManager } from "@/lib/focus";
import { houseStorage } from "@/lib/house-storage";
import { installOnlineManager } from "@/lib/online";
import { supabase } from "@/lib/supabase";

installOnlineManager();

function GroceryRealtimeGate() {
  const { activeHouse } = useActiveHouse();
  if (!activeHouse) return null;
  return <GroceryRealtime client={supabase} houseId={activeHouse.house.id} />;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_URL. Set it in apps/mobile/.env.local or eas.json.");
}

// Module scope so the first request cannot race the first render. There is no shared cookie
// jar on mobile, so calls carry a bearer token.
configureApiClient({
  baseUrl: API_URL,
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return {};
    return { Authorization: `Bearer ${data.session.access_token}` };
  },
});

const resumeInvite = (code: string) =>
  router.push({ pathname: "/house/join", params: { code, confirm: "1" } });

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => installFocusManager(), []);
  useOfflineToast();

  return (
    <AuthProvider adapter={nativeAuthAdapter}>
      <ProfileProvider>
        <HousesProvider
          storage={houseStorage}
          realtimeClient={supabase}
          onPendingInvite={resumeInvite}
        >
          {/* Modal content renders in this provider's portal host, so it must sit inside the
              data providers or sheet contents cannot reach their contexts. */}
          <BottomSheetModalProvider>
            {children}
            <AuthGate />
            <HouseGate />
            <SplashGate />
            <TopLoader />
            <ToastHost />
            <GroceryRealtimeGate />
          </BottomSheetModalProvider>
        </HousesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
