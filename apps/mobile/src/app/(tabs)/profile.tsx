import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { AppearanceIcon, BellIcon, GlobeIcon, ProfileIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppearanceSheet } from "@/components/AppearanceSheet";
import { AvatarSheet } from "@/components/AvatarSheet";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pressable } from "@/components/Pressable";
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
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      toast.error(TOAST_MESSAGES.logoutFailed);
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 36, paddingHorizontal: 24 }}
    >
      <View className="flex-row items-center mb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
          onPress={() => setAvatarOpen(true)}
          className="size-16 items-center justify-center overflow-hidden rounded-full bg-accent active:opacity-80"
        >
          <Image
            source={profile?.avatarUrl ? { uri: profile.avatarUrl } : profileImage}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            className="size-16"
          />
        </Pressable>

        <View className="ml-4 flex-1">
          <Text className="font-display text-xl text-foreground font-medium tracking-tight">
            {profile?.displayName ?? ""}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? ""}</Text>
        </View>
      </View>

      <SettingsGroup title="Account Settings">
        <SettingsRow
          icon={<ProfileIcon size={20} color={palette.foreground} />}
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

      <Button
        label="Log out"
        variant="outline"
        onPress={() => setLogoutOpen(true)}
        className="mt-10"
      />

      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        description="You'll need to sign in again to use Kinwoo."
        confirmLabel="Log out"
        isPending={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={() => setLogoutOpen(false)}
      />

      <View style={{ height: insets.bottom + 40 }} />

      <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </ScrollView>
  );
}
