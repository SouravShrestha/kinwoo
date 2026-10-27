"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import {
  FEEDBACK_PATH,
  HELP_LABELS,
  LEGAL_LABELS,
  LEGAL_PATHS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "@kinwoo/core/app";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  AppearanceIcon,
  BellIcon,
  DocumentIcon,
  EditIcon,
  FeedbackIcon,
  GlobeIcon,
  MailIcon,
  ProfileIcon,
  ShieldCheckOutlineIcon,
} from "@kinwoo/icons";
import { useTheme } from "next-themes";
import { useState } from "react";

import { AppFooter } from "@/components/AppFooter";
import { AppearanceSheet } from "@/components/AppearanceSheet";
import { AvatarSheet } from "@/components/AvatarSheet";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InstallAppRow } from "@/components/InstallAppRow";
import {
  SettingsButtonRow,
  SettingsGroup,
  SettingsInfoRow,
  SettingsLinkRow,
} from "@/components/Settings";
import { SkeletonRegion, SkeletonText } from "@/components/skeleton/Skeleton";
import { unregisterBrowser } from "@/lib/push";

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
      await unregisterBrowser();
      await signOut();
    } catch {
      toast.error(TOAST_MESSAGES.logoutFailed);
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="mb-10 flex items-center">
        <button
          type="button"
          aria-label="Change avatar"
          onClick={() => setAvatarOpen(true)}
          className="relative size-16 shrink-0 overflow-hidden rounded-full bg-accent hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile?.avatarUrl ?? "/images/profile-image.png"}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-full object-cover"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[30%] items-center justify-center bg-black/55"
          >
            <EditIcon size={12} color="#fff" />
          </span>
        </button>

        <div className="ml-4 min-w-0">
          {profile ? (
            <>
              <p className="font-medium truncate text-xl tracking-tight">{profile.displayName}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
            </>
          ) : (
            <SkeletonRegion className="w-56">
              <SkeletonText size="xl" className="w-40" />
              <div className="mt-0.5">
                <SkeletonText size="sm" className="w-52" />
              </div>
            </SkeletonRegion>
          )}
        </div>
      </div>

      <SettingsGroup title="Account Settings">
        <SettingsLinkRow
          href="/profile/personal"
          icon={<ProfileIcon size={20} />}
          label="Personal Information"
        />
        <SettingsInfoRow icon={<GlobeIcon size={20} />} label="Language" value="English" />
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
          icon={<BellIcon size={24} />}
          label="Notifications"
        />
        <InstallAppRow />
      </SettingsGroup>

      <SettingsGroup title={LEGAL_LABELS.group}>
        <SettingsLinkRow
          href={LEGAL_PATHS.terms}
          icon={<DocumentIcon size={24} />}
          label={LEGAL_LABELS.terms}
        />
        <SettingsLinkRow
          href={LEGAL_PATHS.privacy}
          icon={<ShieldCheckOutlineIcon size={24} />}
          label={LEGAL_LABELS.privacy}
        />
      </SettingsGroup>

      <SettingsGroup title={HELP_LABELS.group}>
        <SettingsLinkRow
          href={SUPPORT_MAILTO}
          icon={<MailIcon size={24} />}
          label={HELP_LABELS.email}
          value={SUPPORT_EMAIL}
        />
        <SettingsLinkRow
          href={FEEDBACK_PATH}
          icon={<FeedbackIcon size={24} />}
          label={HELP_LABELS.feedback}
        />
      </SettingsGroup>

      <Button
        label="Log out"
        variant="outline"
        onClick={() => setLogoutOpen(true)}
        className="mt-10 text-foreground"
      />

      <AppFooter />

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
