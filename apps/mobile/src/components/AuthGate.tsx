import { gateDecision, useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { isPublicRoute } from "@kinwoo/core/auth";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";

import { DisplayNameSheet } from "./DisplayNameSheet";

/**
 * Mounted once beside the navigator. Redirects signed-out visitors to /login
 * and holds a non-dismissable sheet over the app until first-run setup is done.
 */
export function AuthGate() {
  const { ready: authReady, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const pathname = usePathname();

  const decision = gateDecision({
    authReady,
    isLoggedIn,
    profileReady,
    needsDisplayName,
    isPublicRoute: isPublicRoute(pathname),
  });

  useEffect(() => {
    if (decision === "redirect-to-login") router.replace("/login");
  }, [decision]);

  return <DisplayNameSheet open={decision === "collect-display-name"} />;
}
