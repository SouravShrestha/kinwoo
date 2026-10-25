import { useActiveHouse } from "@kinwoo/client/houses";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { SETTING_EVENTS, withPushType, type SettingType } from "@kinwoo/core/push";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { ArrowRightIcon, CheckIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useRef, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pressable } from "@/components/Pressable";
import { Skeleton } from "@/components/skeleton/Skeleton";
import { NotificationSettingsSkeleton } from "@/components/skeleton/skeletons";
import { Switch } from "@/components/Switch";
import { goBack } from "@/lib/house-navigation";
import { registerDevice } from "@/lib/push";
import { useTheme } from "@/theme/ThemeProvider";

export const unstable_settings = { title: "Notifications" };

const PUSH_NOTE =
  "These settings only control push notifications. Everything still appears in your in-app notifications.";
export default function NotificationsScreen() {
  const { profile, setPreferences } = useProfile();
  const { activeHouse } = useActiveHouse();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<{ enabled?: boolean; muted?: string[] }>({});
  // Saves run one after another so the last tap is the last write.
  const saves = useRef(Promise.resolve());

  if (!profile) {
    return (
      <View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 20 }}>
        <Skeleton className="size-10 rounded-lg" />
        <Text className="mt-6 font-display-medium text-2xl text-foreground">
          Notification settings
        </Text>
        <Text className="mt-6 text-sm text-muted-foreground">{PUSH_NOTE}</Text>
        <NotificationSettingsSkeleton />
      </View>
    );
  }
  const enabled = shown.enabled ?? profile.notificationsEnabled;
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
    save("enabled", async () => {
      if (next && (await registerDevice(true)) === "denied") {
        toast.error(TOAST_MESSAGES.notificationsBlocked);
        void Linking.openSettings();
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={goBack}
        hitSlop={12}
        className="size-10 items-start justify-center"
      >
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <ArrowRightIcon size={28} color={palette.foreground} />
        </View>
      </Pressable>
      <Text className="mt-6 font-display-medium text-2xl text-foreground">
        Notification settings
      </Text>

      <Text className="mt-6 text-sm text-muted-foreground">{PUSH_NOTE}</Text>

      <View className="mt-6 h-14 flex-row items-center">
        <Text className="flex-1 text-base text-foreground">Push notifications</Text>
        <Switch checked={enabled} onChange={togglePush} accessibilityLabel="Push notifications" />
      </View>

      {groups.map((group) => (
        <View key={group} className="mt-8">
          <Text className="text-sm text-muted-foreground">{group}</Text>
          <View className="mt-3">
            {events
              .filter((event) => event.group === group)
              .map((event) => {
                const checked = !muted.includes(event.type);
                return (
                  <Pressable
                    key={event.type}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked, disabled: !enabled }}
                    accessibilityLabel={event.label}
                    disabled={!enabled}
                    onPress={() => toggleEvent(event.type, !checked)}
                    allowDoublePress
                    className={`min-h-14 flex-row items-center gap-4 ${enabled ? "active:opacity-70" : "opacity-50"}`}
                  >
                    <Text className="flex-1 text-base text-foreground">{event.label}</Text>
                    <View
                      className={`size-5 items-center justify-center rounded-md ${
                        checked ? "bg-foreground" : "border border-border"
                      }`}
                    >
                      {checked ? <CheckIcon size={10} color={palette.background} /> : null}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
