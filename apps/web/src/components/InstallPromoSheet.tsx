"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { APP_NAME, PLAY_STORE_URL } from "@kinwoo/core/app";
import { isPublicRoute } from "@kinwoo/core/auth";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { InstallIcon } from "@kinwoo/icons";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { InstallSteps } from "./InstallSteps";
import { houseStorage } from "@/lib/house-storage";
import { promptInstall, useInstallKind } from "@/lib/install-prompt";

const SEEN_KEY = "kinwoo.installPromoSeen";
/** Lets the post-login page and any name sheet settle before this one appears. */
const SHOW_DELAY_MS = 800;

export function InstallPromoSheet() {
  const kind = useInstallKind();
  const { ready, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Every way of leaving the sheet without installing ends here, so the toast always shows.
  const dismiss = useCallback(() => {
    setOpenPath(null);
    toast.show(TOAST_MESSAGES.installLater);
  }, []);

  // The sheet lives above the router, so Back would otherwise leave it hanging over the new page.
  useEffect(() => {
    // Reacting to an external navigation, not derivable during render because it also toasts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openPath !== null && openPath !== pathname) dismiss();
  }, [openPath, pathname, dismiss]);

  // The "seen" flag lasts one login, so reloads don't re-prompt but the next login does.
  useEffect(() => {
    if (ready && !isLoggedIn) void houseStorage.removeItem(SEEN_KEY);
  }, [ready, isLoggedIn]);

  const eligible =
    ready &&
    isLoggedIn &&
    profileReady &&
    !needsDisplayName &&
    kind !== "none" &&
    !isPublicRoute(pathname);

  useEffect(() => {
    if (!eligible) return;
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

  const install = () => {
    if (kind === "android") {
      setOpenPath(null);
      window.location.assign(PLAY_STORE_URL);
    } else if (kind === "native") {
      setOpenPath(null);
      void promptInstall();
    } else {
      setShowSteps(true);
    }
  };

  return (
    <BottomSheet
      open={openPath !== null}
      onClose={dismiss}
      label={`Install ${APP_NAME}`}
      showClose={showSteps}
    >
      {showSteps ? (
        <>
          <h2 className="pr-10 font-display text-xl font-medium">Install {APP_NAME}</h2>
          <InstallSteps />
        </>
      ) : (
        <div className="flex flex-col items-center px-2 pt-3 pb-6 text-center">
          {/* Toggled with CSS rather than useTheme so the right image renders on first paint. */}
          <div className="pop-in">
            <Image
              src="/images/splash-icon-black.png"
              alt=""
              width={512}
              height={144}
              className="h-auto w-36 dark:hidden"
            />
            <Image
              src="/images/splash-icon-white.png"
              alt=""
              width={512}
              height={144}
              className="hidden h-auto w-36 dark:block"
            />
          </div>
          <p className="mt-9 text-sm leading-relaxed text-muted-foreground font-display font-normal">
            Install for a smoother app experience with quicker access to everything you need.
          </p>
          <div className="mt-9 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={dismiss}
              className="h-14 px-6 text-sm text-muted-foreground hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-full"
            >
              Maybe later
            </button>
            <Button
              label="Install"
              icon={<InstallIcon size={20} />}
              onClick={install}
              data-autofocus
              className="w-auto rounded-full px-10 font-sans font-semibold"
            />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
