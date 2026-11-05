import { OTP_SUCCESS_HOLD_MS, gateDecision, useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { isPublicRoute } from "@kinwoo/core/auth";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";

import { DisplayNameSheet } from "./DisplayNameSheet";

/** The email sheet's success hold, then slightly longer than BottomSheet's 220ms dismiss. */
const SHEET_HANDOFF_MS = OTP_SUCCESS_HOLD_MS + 300;

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

  // The email sign-in sheet closes as the session lands. Presenting this one
  // while gorhom is still dismissing that one stacks them, so wait it out.
  const wantsName = decision === "collect-display-name";
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!wantsName) return;
    const timer = setTimeout(() => setSettled(true), SHEET_HANDOFF_MS);
    return () => {
      clearTimeout(timer);
      setSettled(false);
    };
  }, [wantsName]);

  return <DisplayNameSheet open={wantsName && settled} />;
}
