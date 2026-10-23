"use client";

import { APP_NAME, PLAY_STORE_URL } from "@kinwoo/core/app";
import { CloseIcon, InstallIcon } from "@kinwoo/icons";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { houseStorage } from "@/lib/house-storage";
import { isStandalone } from "@/lib/install-prompt";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "kinwoo.androidBannerDismissed";

const subscribe = () => () => {};
const isAndroidBrowser = () => /android/i.test(navigator.userAgent) && !isStandalone();

export function AndroidInstallBanner({
  dismissable = false,
  className,
}: {
  dismissable?: boolean;
  className?: string;
}) {
  const android = useSyncExternalStore(subscribe, isAndroidBrowser, () => false);
  const [dismissed, setDismissed] = useState(dismissable ? null : false);

  useEffect(() => {
    if (!dismissable) return;
    void houseStorage.getItem(DISMISSED_KEY).then((value) => setDismissed(value === "1"));
  }, [dismissable]);

  if (!android || dismissed !== false) return null;

  return (
    <div className={cn("flex items-center border-b border-border bg-background", className)}>
      <a
        href={PLAY_STORE_URL}
        className="flex min-w-0 flex-1 items-center gap-3 px-6 py-3 text-sm font-medium hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
      >
        {/* Toggled with CSS rather than useTheme so the right image renders on first paint. */}
        <Image
          src="/images/dark-icon.png"
          alt=""
          width={512}
          height={512}
          className="size-10 shrink-0 dark:hidden"
        />
        <Image
          src="/images/light-icon.png"
          alt=""
          width={512}
          height={512}
          className="hidden size-10 shrink-0 dark:block"
        />
        <span>Get the {APP_NAME} Android app and browse faster.</span>
        {dismissable ? null : <InstallIcon size={20} className="ml-auto shrink-0" />}
      </a>
      {dismissable ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            void houseStorage.setItem(DISMISSED_KEY, "1");
          }}
          className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-full hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <CloseIcon size={20} />
        </button>
      ) : null}
    </div>
  );
}
