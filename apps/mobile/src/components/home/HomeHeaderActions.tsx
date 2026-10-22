import { useProfile } from "@kinwoo/client/profile";
import { NotificationIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/houses/Avatar";
import { useTheme } from "@/theme/ThemeProvider";

export function HomeHeaderActions({ showNotifications }: { showNotifications: boolean }) {
  const { resolvedTheme } = useTheme();
  const { profile } = useProfile();

  return (
    <View className="flex-row items-center gap-4">
      {showNotifications ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          className="size-[38px] items-center justify-center rounded-full border border-border bg-card active:opacity-60"
        >
          <NotificationIcon size={22} color={colors[resolvedTheme].foreground} />
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
