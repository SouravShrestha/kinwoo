import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { AppearanceIcon, BellIcon, GlobeIcon, ProfileOutlineIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppearanceSheet } from "@/components/AppearanceSheet";
import { SettingsGroup, SettingsRow } from "@/components/Settings";
import { profileImage } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const THEME_LABELS = { light: "Light", dark: "Dark", system: "System" } as const;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { theme, resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const insets = useSafeAreaInsets();

  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24 }}
    >
      <View className="flex-row items-center">
        <View className="size-16 items-center justify-center overflow-hidden rounded-full bg-accent">
          <Image
            source={profileImage}
            accessibilityIgnoresInvertColors
            accessibilityLabel="Your avatar"
            resizeMode="cover"
            className="size-16"
          />
        </View>

        <View className="ml-4 flex-1">
          <Text className="font-display text-xl text-foreground">
            {profile?.displayName ?? "—"}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? ""}</Text>
        </View>
      </View>

      <SettingsGroup title="Account Settings">
        <SettingsRow
          icon={<ProfileOutlineIcon size={20} color={palette.foreground} />}
          label="Personal Information"
          onPress={() => router.push("/settings/personal")}
        />
        <SettingsRow
          icon={<GlobeIcon size={20} color={palette.foreground} />}
          label="Language"
          value="English"
          onPress={() => router.push("/settings/language")}
        />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow
          icon={<AppearanceIcon size={20} color={palette.foreground} />}
          label="Appearance"
          value={THEME_LABELS[theme]}
          onPress={() => setAppearanceOpen(true)}
        />
        <SettingsRow
          icon={<BellIcon size={20} color={palette.foreground} />}
          label="Notifications"
          onPress={() => router.push("/settings/notifications")}
        />
      </SettingsGroup>

      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        className="mt-10 h-14 items-center justify-center rounded-3xl border border-border active:opacity-60"
      >
        <Text className="font-semibold text-base text-destructive">Log out</Text>
      </Pressable>

      <View style={{ height: insets.bottom + 40 }} />

      <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </ScrollView>
  );
}
