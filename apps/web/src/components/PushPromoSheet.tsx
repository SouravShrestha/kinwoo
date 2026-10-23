"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { isPublicRoute } from "@kinwoo/core/auth";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { houseStorage } from "@/lib/house-storage";
import { isStandalone } from "@/lib/install-prompt";
import { registerBrowser, useBrowserPushState } from "@/lib/push";

const SEEN_KEY = "kinwoo.pushPromoSeen";
/** Lets the post-login page and any name sheet settle before this one appears. */
const SHOW_DELAY_MS = 800;

export function PushPromoSheet() {
  const { ready, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName, profile } = useProfile();
  const pushState = useBrowserPushState();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);

  // The sheet lives above the router, so Back would otherwise leave it hanging over the new page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openPath !== null && openPath !== pathname) setOpenPath(null);
  }, [openPath, pathname]);

  // The "seen" flag lasts one login, so reloads don't re-prompt but the next login does.
  useEffect(() => {
    if (ready && !isLoggedIn) void houseStorage.removeItem(SEEN_KEY);
  }, [ready, isLoggedIn]);

  const eligible =
    ready &&
    isLoggedIn &&
    profileReady &&
    !needsDisplayName &&
    profile?.notificationsEnabled === true &&
    pushState === "undetermined" &&
    !isPublicRoute(pathname);

  useEffect(() => {
    if (!eligible || !isStandalone()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (await houseStorage.getItem(SEEN_KEY)) return;
      if (cancelled) return;
      // Marked on show, not on answer, so a backdrop dismiss also counts as seen.
      await houseStorage.setItem(SEEN_KEY, "1");
      setOpenPath(pathname);
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eligible, pathname]);

  const close = () => setOpenPath(null);

  // The permission request must start inside this tap; browsers ignore it anywhere else.
  const turnOn = () => {
    close();
    registerBrowser(true, true).then(
      (outcome) => {
        if (outcome === "denied") toast.error(TOAST_MESSAGES.notificationsBlockedInBrowser);
      },
      () => toast.error(TOAST_MESSAGES.notificationsFailed),
    );
  };

  return (
    <BottomSheet open={openPath !== null} onClose={close} label="Turn on notifications">
      <div className="flex flex-col items-center px-2 pt-3 pb-6 text-center">
        <h2 className="font-display text-xl font-medium">Stay in the loop</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground font-display font-normal">
          Get a notification when something changes in your house, like a new expense or a list
          item.
        </p>
        <div className="mt-9 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={close}
            className="h-14 px-6 text-sm text-muted-foreground hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-full"
          >
            Not now
          </button>
          <Button
            label="Turn on"
            onClick={turnOn}
            data-autofocus
            className="w-auto rounded-full px-10 font-sans font-semibold"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
