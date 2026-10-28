"use client";

import { APP_NAME } from "@kinwoo/core/app";
import { useEffect } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { useBrowserPushState } from "@/lib/push";

// A site cannot open the browser's settings or re-ask once blocked, so this explains the steps and
// turns notifications on by itself as soon as the browser reports the permission changed.
export function NotificationsBlockedSheet({
  open,
  onClose,
  onAllowed,
}: {
  open: boolean;
  onClose: () => void;
  onAllowed: () => void;
}) {
  const pushState = useBrowserPushState();
  const askable = pushState === "undetermined";

  useEffect(() => {
    if (open && pushState === "granted") onAllowed();
  }, [open, pushState, onAllowed]);

  return (
    <BottomSheet open={open} onClose={onClose} label="Allow notifications">
      <div className="flex flex-col items-center px-2 pt-3 pb-6 text-center">
        <h2 className="font-display text-xl font-medium">
          {askable ? "Turn on notifications" : "Notifications are blocked"}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground font-display font-normal">
          {askable
            ? "Notifications are no longer blocked. Turn them on to hear about new expenses, payments and tasks."
            : `Your browser is blocking notifications from ${APP_NAME}. Open the site settings in your browser, set Notifications to Allow, then come back here.`}
        </p>
        <div className="mt-9 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onClose}
            className="h-14 px-6 text-sm text-muted-foreground hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-full"
          >
            Not now
          </button>
          <Button
            label={askable ? "Turn on" : "Got it"}
            // The permission prompt must start inside this tap, so onAllowed runs here directly.
            onClick={askable ? onAllowed : onClose}
            data-autofocus
            className="w-auto rounded-full px-10 font-sans font-semibold"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
