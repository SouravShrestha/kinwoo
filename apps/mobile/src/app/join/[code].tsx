import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { savePendingInvite } from "@kinwoo/client/houses";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { houseStorage } from "@/lib/house-storage";

// Public route: a signed-out recipient lands here first. The code is parked in storage and the
// join resumes once sign-in finishes, so it survives the login detour.
export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isLoggedIn, ready } = useAuth();

  useBusyWhile(true);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    void savePendingInvite(houseStorage, code ?? "").then((saved) => {
      if (!active) return;

      if (!isLoggedIn) router.replace("/login");
      else if (saved) router.replace("/");
      else router.replace({ pathname: "/house/join", params: { code: code ?? "" } });
    });

    return () => {
      active = false;
    };
  }, [ready, isLoggedIn, code]);

  return <View className="flex-1 bg-background" />;
}
