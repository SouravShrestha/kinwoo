import { useAuth } from "@kinwoo/client/auth";
import { useActiveHouse, useSwitchToHouse } from "@kinwoo/client/houses";
import { useMarkNotificationRead } from "@kinwoo/client/notifications";
import { useProfile } from "@kinwoo/client/profile";
import { notificationHouseId, notificationInboxId, notificationTarget } from "@kinwoo/core/push";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";

import { registerDevice } from "@/lib/push";

export function PushRegistration() {
  const { ready, isLoggedIn } = useAuth();
  const { profile } = useProfile();
  // On a cold start the houses load after the tap arrives, and switching needs them.
  const { ready: housesReady } = useActiveHouse();
  const switchToHouse = useSwitchToHouse();
  const userId = profile?.id;
  const enabled = profile?.notificationsEnabled ?? false;

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    void registerDevice(enabled).catch(() => undefined);
  }, [isLoggedIn, userId, enabled]);

  const response = Notifications.useLastNotificationResponse();
  const { mutate: markRead } = useMarkNotificationRead(userId ?? null);

  useEffect(() => {
    if (!response || !ready || !housesReady || !isLoggedIn || !userId) return;
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      const data = response.notification.request.content.data;
      const inboxId = notificationInboxId(data);
      if (inboxId) markRead(inboxId);
      switchToHouse(notificationHouseId(data));
      const target = notificationTarget(data);
      if (target) router.push(target as Href);
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, ready, housesReady, isLoggedIn, userId, markRead, switchToHouse]);

  return null;
}
