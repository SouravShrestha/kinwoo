"use client";

import { gateDecision, useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { isPublicRoute } from "@kinwoo/core/auth";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DisplayNameSheet } from "./DisplayNameSheet";

/** Slightly longer than BottomSheet's 200ms exit animation. */
const SHEET_HANDOFF_MS = 250;

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

  // The email sign-in sheet closes as the session lands. Wait for its exit
  // animation so the two sheets never show at once.
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
