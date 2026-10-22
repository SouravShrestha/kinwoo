import { useAuth } from "@kinwoo/client/auth";
import { isPublicRoute } from "@kinwoo/core/auth";
import { usePathname } from "expo-router";
import { useEffect } from "react";

import { hideSplashAfterTimeout, hideSplashWhenSettled } from "@/lib/splash";

// Logged-out users are redirected by AuthGate, so wait until they have landed on a public
// route before revealing the app. Otherwise the initial "/" screen flashes first.
export function SplashGate() {
  const { ready, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const settled = ready && (isLoggedIn || isPublicRoute(pathname));

  useEffect(() => hideSplashAfterTimeout(), []);

  useEffect(() => {
    if (!settled) return;
    return hideSplashWhenSettled();
  }, [settled]);

  return null;
}
