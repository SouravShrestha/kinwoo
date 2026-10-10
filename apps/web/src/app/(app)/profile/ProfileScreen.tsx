"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { AppearanceIcon, BellIcon, GlobeIcon, ProfileIcon } from "@kinwoo/icons";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState } from "react";

import { AppearanceSheet } from "@/components/AppearanceSheet";
import { Button } from "@/components/Button";
import { SettingsButtonRow, SettingsGroup, SettingsLinkRow } from "@/components/Settings";

const THEME_LABELS: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { theme } = useTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <main className="px-6 pt-10">
      <div className="mb-12 flex items-center">
        <div className="size-16 shrink-0 overflow-hidden rounded-full bg-accent">
          <Image
            src="/images/profile-image.png"
            alt=""
            width={64}
            height={64}
            className="size-16 object-cover"
          />
        </div>

        <div className="ml-4 min-w-0">
          <p className="font-medium truncate text-xl tracking-tight">
            {profile?.displayName ?? ""}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      <SettingsGroup title="Account Settings">
        <SettingsLinkRow
          href="/profile/personal"
          icon={<ProfileIcon size={20} />}
          label="Personal Information"
        />
        <SettingsLinkRow
          href="/profile/language"
          icon={<GlobeIcon size={20} />}
          label="Language"
          value="English"
        />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsButtonRow
          onClick={() => setAppearanceOpen(true)}
          icon={<AppearanceIcon size={20} />}
          label="Appearance"
          value={THEME_LABELS[theme ?? "system"] ?? "System"}
        />
        <SettingsLinkRow
          href="/profile/notifications"
          icon={<BellIcon size={20} />}
          label="Notifications"
        />
      </SettingsGroup>

      <Button
        label="Log out"
        variant="outline"
        onClick={() => void signOut()}
        className="mt-10 text-foreground"
      />

      <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </main>
  );
}
