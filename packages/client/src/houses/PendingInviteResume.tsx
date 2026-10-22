"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/use-auth";
import { useProfile } from "../profile/use-profile";
import { useActiveHouse } from "./active-house-provider";
import { subscribePendingInvite, takePendingInvite } from "./pending-invite";
import type { KeyValueStorage } from "./storage";

// Waits for sign-in, the display-name sheet and the houses list before resuming the join. The
// delay lets a closing sheet or a route change settle: navigating mid-transition is unreliable
// on mobile.
export function PendingInviteResume({
  storage,
  onResume,
  delayMs = 400,
}: {
  storage: KeyValueStorage;
  onResume: (code: string) => void;
  delayMs?: number;
}) {
  const { isLoggedIn, ready: authReady } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const { ready: housesReady } = useActiveHouse();

  const onResumeRef = useRef(onResume);
  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => subscribePendingInvite(() => setSavedCount((count) => count + 1)), []);

  const eligible = authReady && isLoggedIn && profileReady && !needsDisplayName && housesReady;

  useEffect(() => {
    if (!eligible) return;

    const timer = setTimeout(() => {
      void takePendingInvite(storage).then((code) => {
        if (code) onResumeRef.current(code);
      });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [eligible, savedCount, storage, delayMs]);

  return null;
}
