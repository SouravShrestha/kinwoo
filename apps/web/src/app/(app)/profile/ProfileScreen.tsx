"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { AppearanceIcon, BellIcon, GlobeIcon, ProfileOutlineIcon } from "@kinwoo/icons";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState } from "react";

import { AppearanceSheet } from "@/components/AppearanceSheet";
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
      <div className="flex items-center">
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
          <p className="font-display truncate text-xl font-bold">{profile?.displayName ?? "—"}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      <SettingsGroup title="Account Settings">
        <SettingsLinkRow
          href="/profile/personal"
          icon={<ProfileOutlineIcon size={20} />}
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

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-10 h-14 w-full rounded-3xl border border-border font-semibold text-destructive hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Log out
      </button>

      <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </main>
  );
}
