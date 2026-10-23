import { useAuth } from "@kinwoo/client/auth";
import { useNotifications } from "@kinwoo/client/notifications";
import { useProfile } from "@kinwoo/client/profile";
import { NotificationIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/houses/Avatar";
import { useTheme } from "@/theme/ThemeProvider";

export function HomeHeaderActions({ showNotifications }: { showNotifications: boolean }) {
  const { resolvedTheme } = useTheme();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id ?? null);
  const unread = notifications?.filter((entry) => !entry.readAt).length ?? 0;

  return (
    <View className="flex-row items-center gap-4">
      {showNotifications ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          onPress={() => router.push("/notifications")}
          hitSlop={8}
          className="size-[38px] items-center justify-center rounded-full border border-border bg-card active:opacity-60"
        >
          <NotificationIcon size={22} color={colors[resolvedTheme].foreground} />
          {unread > 0 ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1"
            >
              <Text className="font-display-medium text-[10px] leading-3 text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile"
        hitSlop={8}
        onPress={() => router.push("/profile")}
        className="active:opacity-60"
      >
        <Avatar name={profile?.displayName ?? null} url={profile?.avatarUrl ?? null} size={38} />
      </Pressable>
    </View>
  );
}
