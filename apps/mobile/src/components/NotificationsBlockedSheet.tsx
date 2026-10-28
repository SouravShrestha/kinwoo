import { APP_NAME } from "@kinwoo/core/app";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { allowNotifications, type PushStatus } from "@/lib/push";

// "Allow" shows the system dialog while Android still offers it, otherwise opens system settings.
// Coming back with notifications allowed turns them on without another tap.
export function NotificationsBlockedSheet({
  open,
  status,
  onClose,
  onAllowed,
}: {
  open: boolean;
  status: PushStatus | null;
  onClose: () => void;
  onAllowed: () => void;
}) {
  useEffect(() => {
    if (open && status && !status.blocked) onAllowed();
  }, [open, status, onAllowed]);

  const allow = () => {
    if (!status) return;
    void allowNotifications(status.canAskAgain).then(
      (granted) => {
        if (granted) onAllowed();
      },
      () => undefined,
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Allow notifications">
      <View className="items-center px-2 pt-3">
        <Text className="text-center font-display-medium text-xl text-foreground">
          Notifications are blocked
        </Text>
        <Text className="mt-4 text-center font-display-normal text-sm text-muted-foreground">
          {`Notifications are turned off for ${APP_NAME} on this phone. Allow them to hear about new expenses, payments and tasks.`}
        </Text>
        <View className="mt-9 flex-row items-center justify-center gap-8">
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="h-14 justify-center px-6 active:opacity-70"
          >
            <Text className="text-sm text-muted-foreground">Not now</Text>
          </Pressable>
          <Button label="Allow" onPress={allow} className="rounded-full px-10" />
        </View>
      </View>
    </BottomSheet>
  );
}
