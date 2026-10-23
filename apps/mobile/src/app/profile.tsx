import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import {
  APP_NAME,
  HELP_LABELS,
  LEGAL_LABELS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  supportMailtoFor,
} from "@kinwoo/core/app";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  AppearanceIcon,
  ArrowRightIcon,
  BellIcon,
  BugIcon,
  DocumentIcon,
  EditIcon,
  GlobeIcon,
  MailIcon,
  ProfileIcon,
  ShieldCheckOutlineIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Image, Linking, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppFooter } from "@/components/AppFooter";
import { AppearanceSheet } from "@/components/AppearanceSheet";
import { AvatarSheet } from "@/components/AvatarSheet";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pressable } from "@/components/Pressable";
import { SettingsGroup, SettingsInfoRow, SettingsRow } from "@/components/Settings";
import { goBack } from "@/lib/house-navigation";
import { profileImage } from "@/lib/images";
import { unregisterDevice } from "@/lib/push";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import { usePressGuard } from "@/lib/press-guard";
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

  const openTerms = usePressGuard(() => void WebBrowser.openBrowserAsync(TERMS_URL));
  const openPrivacy = usePressGuard(() => void WebBrowser.openBrowserAsync(PRIVACY_URL));

  // mailto: needs the system mail app, so Linking is used here instead of the in-app browser.
  const openMail = (url: string) =>
    void Linking.openURL(url).catch(() => toast.error(TOAST_MESSAGES.mailUnavailable));
  const emailSupport = usePressGuard(() => openMail(SUPPORT_MAILTO));
  const reportIssue = usePressGuard(() =>
    openMail(
      supportMailtoFor({
        version: Constants.expoConfig?.version ?? "0.0.0",
        device: `${Platform.OS} ${Platform.Version}`,
        subject: `${APP_NAME} issue report`,
      }),
    ),
  );

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await unregisterDevice();
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={goBack}
        hitSlop={12}
        className="mb-6 size-9 items-start justify-center"
      >
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <ArrowRightIcon size={26} color={palette.foreground} />
        </View>
      </Pressable>

      <View className="flex-row items-center mb-10">
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
          <View
            pointerEvents="none"
            className="absolute inset-x-0 bottom-0 h-[30%] items-center justify-center bg-black/55"
          >
            <EditIcon size={12} color="#fff" />
          </View>
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
        <SettingsInfoRow
          icon={<GlobeIcon size={20} color={palette.foreground} />}
          label="Language"
          value="English"
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

      <SettingsGroup title={LEGAL_LABELS.group}>
        <SettingsRow
          icon={<DocumentIcon size={20} color={palette.foreground} />}
          label={LEGAL_LABELS.terms}
          onPress={openTerms}
        />
        <SettingsRow
          icon={<ShieldCheckOutlineIcon size={20} color={palette.foreground} />}
          label={LEGAL_LABELS.privacy}
          onPress={openPrivacy}
        />
      </SettingsGroup>

      <SettingsGroup title={HELP_LABELS.group}>
        <SettingsRow
          icon={<MailIcon size={20} color={palette.foreground} />}
          label={HELP_LABELS.email}
          value={SUPPORT_EMAIL}
          onPress={emailSupport}
        />
        <SettingsRow
          icon={<BugIcon size={20} color={palette.foreground} />}
          label={HELP_LABELS.report}
          onPress={reportIssue}
        />
      </SettingsGroup>

      <Button
        label="Log out"
        variant="outline"
        onPress={() => setLogoutOpen(true)}
        className="mt-10"
      />

      <AppFooter />

      <ConfirmDialog
        open={logoutOpen}
        copy={CONFIRM_COPY.logout}
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
