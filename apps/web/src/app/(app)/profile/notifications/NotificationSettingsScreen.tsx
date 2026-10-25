"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { SETTING_EVENTS, withPushType, type SettingType } from "@kinwoo/core/push";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { CheckIcon } from "@kinwoo/icons";
import { useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { NotificationSettingsSkeleton } from "@/components/skeleton/skeletons";
import { Switch } from "@/components/Switch";
import { useInstallKind } from "@/lib/install-prompt";
import { registerBrowser, useBrowserPushState, type BrowserPushState } from "@/lib/push";
import { cn } from "@/lib/utils";

const PUSH_NOTE =
  "These settings only control push notifications. Everything still appears in your in-app notifications.";
function hintFor(state: BrowserPushState, iosNeedsInstall: boolean): string | null {
  if (state === "unsupported") {
    return iosNeedsInstall
      ? "Add Kinwoo to your Home Screen to get push notifications on iPhone and iPad."
      : "This browser doesn't support push notifications.";
  }
  return state === "denied" ? TOAST_MESSAGES.notificationsBlockedInBrowser : null;
}

export function NotificationSettingsScreen() {
  const { profile, setPreferences } = useProfile();
  const { activeHouse } = useActiveHouse();
  const pushState = useBrowserPushState();
  const iosNeedsInstall = useInstallKind() === "ios";
  const [shown, setShown] = useState<{ enabled?: boolean; muted?: string[] }>({});
  // Saves run one after another so the last tap is the last write.
  const saves = useRef(Promise.resolve());

  if (!profile) {
    return (
      <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <BackButton />
        <h1 className="mt-6 font-display text-2xl font-medium">Notification settings</h1>
        <p className="mt-6 text-sm text-muted-foreground">{PUSH_NOTE}</p>
        <NotificationSettingsSkeleton />
      </main>
    );
  }

  const unsupported = pushState === "unsupported";
  const enabled = shown.enabled ?? (profile.notificationsEnabled && pushState === "granted");
  const muted = shown.muted ?? profile.mutedPushTypes;

  // The screen changes at once; a failed save puts the saved value back.
  const save = (key: "enabled" | "muted", task: () => Promise<boolean>) => {
    saves.current = saves.current.then(task).then(
      (saved) => {
        if (!saved) setShown((current) => ({ ...current, [key]: undefined }));
      },
      () => {
        setShown((current) => ({ ...current, [key]: undefined }));
        toast.error(TOAST_MESSAGES.notificationsFailed);
      },
    );
  };

  const togglePush = (next: boolean) => {
    setShown((current) => ({ ...current, enabled: next }));
    // Started here, not in the queued save: browsers show the permission prompt only for a tap.
    const registered = next ? registerBrowser(true, true) : null;
    registered?.catch(() => {});
    save("enabled", async () => {
      if (registered && (await registered) === "denied") {
        toast.error(TOAST_MESSAGES.notificationsBlockedInBrowser);
        return false;
      }
      await setPreferences({ notificationsEnabled: next });
      return true;
    });
  };

  const toggleEvent = (type: SettingType, next: boolean) => {
    const mutedPushTypes = withPushType(muted, type, next);
    setShown((current) => ({ ...current, muted: mutedPushTypes }));
    save("muted", async () => {
      await setPreferences({ mutedPushTypes });
      return true;
    });
  };

  const isAdmin = activeHouse?.role === "admin";
  const events = SETTING_EVENTS.filter((event) => isAdmin || event.type !== "join_requested");
  const groups = [...new Set(events.map((event) => event.group))];
  const hint = hintFor(pushState, iosNeedsInstall);

  return (
    <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <BackButton />
      <h1 className="mt-6 font-display text-2xl font-medium">Notification settings</h1>

      <p className="mt-6 text-sm text-muted-foreground">{PUSH_NOTE}</p>

      <div className="mt-6 flex h-14 items-center">
        <span className="flex-1 text-base">Push notifications</span>
        <Switch
          checked={enabled}
          disabled={unsupported}
          onChange={togglePush}
          label="Push notifications"
        />
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      {groups.map((group) => (
        <section key={group} className="mt-8">
          <h2 className="text-sm text-muted-foreground">{group}</h2>
          <ul className="mt-3">
            {events
              .filter((event) => event.group === group)
              .map((event) => {
                const checked = !muted.includes(event.type);
                return (
                  <li key={event.type}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={!enabled}
                      onClick={() => toggleEvent(event.type, !checked)}
                      className="flex min-h-14 w-full items-center gap-4 text-left hover:cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                    >
                      <span className="flex-1 text-base">{event.label}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-[6px]",
                          checked ? "bg-foreground text-background" : "border border-border",
                        )}
                      >
                        {checked ? <CheckIcon size={10} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </main>
  );
}
