"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { LEGAL_LABELS, LEGAL_PATHS } from "@kinwoo/core/app";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  AppearanceIcon,
  BellIcon,
  DocumentIcon,
  GlobeIcon,
  ProfileIcon,
  ShieldCheckIcon,
} from "@kinwoo/icons";
import { useTheme } from "next-themes";
import { useState } from "react";

import { AppearanceSheet } from "@/components/AppearanceSheet";
import { AvatarSheet } from "@/components/AvatarSheet";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
    <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="mb-12 flex items-center">
        <button
          type="button"
          aria-label="Change avatar"
          onClick={() => setAvatarOpen(true)}
          className="size-16 shrink-0 overflow-hidden rounded-full bg-accent hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile?.avatarUrl ?? "/images/profile-image.webp"}
            alt=""
            width={64}
            height={64}
            className="size-16 object-cover"
          />
        </button>

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

      <SettingsGroup title={LEGAL_LABELS.group}>
        <SettingsLinkRow
          href={LEGAL_PATHS.terms}
          icon={<DocumentIcon size={20} />}
          label={LEGAL_LABELS.terms}
        />
        <SettingsLinkRow
          href={LEGAL_PATHS.privacy}
          icon={<ShieldCheckIcon size={20} />}
          label={LEGAL_LABELS.privacy}
        />
      </SettingsGroup>

      <Button
        label="Log out"
        variant="outline"
        onClick={() => setLogoutOpen(true)}
        className="mt-10 text-foreground"
      />

      <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <ConfirmDialog
        open={logoutOpen}
        copy={CONFIRM_COPY.logout}
        isPending={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={() => setLogoutOpen(false)}
      />
    </main>
  );
}
