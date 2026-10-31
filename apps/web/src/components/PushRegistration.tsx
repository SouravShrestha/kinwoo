"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useActiveHouse, useSwitchToHouse } from "@kinwoo/client/houses";
import { useMarkNotificationRead } from "@kinwoo/client/notifications";
import { useProfile } from "@kinwoo/client/profile";
import { notificationHouseId, notificationInboxId, notificationTarget } from "@kinwoo/core/push";
import { useRouter } from "@/lib/router";
import { useEffect } from "react";
import { registerBrowser } from "@/lib/push";

export function PushRegistration() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { profile } = useProfile();
  const { ready: housesReady } = useActiveHouse();
  const switchToHouse = useSwitchToHouse();
  const userId = profile?.id;
  const enabled = profile?.notificationsEnabled ?? false;
  const { mutate: markRead } = useMarkNotificationRead(userId ?? null);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    void registerBrowser(enabled, false).catch(() => undefined);
  }, [isLoggedIn, userId, enabled]);

  // The service worker sends a tapped push here when the app is already open.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "notification-click") return;
      const inboxId = notificationInboxId(event.data);
      if (inboxId) markRead(inboxId);
      switchToHouse(notificationHouseId(event.data));
      const target = notificationTarget(event.data);
      if (target) router.push(target);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [markRead, router, switchToHouse]);

  // With no window open, the service worker opens the target with ?house= instead.
  useEffect(() => {
    if (!housesReady) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("house")) return;
    switchToHouse(notificationHouseId({ houseId: url.searchParams.get("house") }));
    url.searchParams.delete("house");
    router.replace(url.pathname + url.search);
  }, [housesReady, switchToHouse, router]);

  return null;
}
