"use client";

import { gateDecision, useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { isPublicRoute } from "@kinwoo/core/auth";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { DisplayNameSheet } from "./DisplayNameSheet";

/**
 * Mounted once in the root layout. Sends signed-out visitors to /login and
 * holds a non-dismissable sheet over the app until first-run setup is done.
 */
export function AuthGate() {
  const { ready: authReady, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  const decision = gateDecision({
    authReady,
    isLoggedIn,
    profileReady,
    needsDisplayName,
    isPublicRoute: isPublicRoute(pathname),
  });

  useEffect(() => {
    if (decision === "redirect-to-login") router.replace("/login");
  }, [decision, router]);

  return <DisplayNameSheet open={decision === "collect-display-name"} />;
}
