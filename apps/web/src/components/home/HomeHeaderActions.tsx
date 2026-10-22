"use client";

import { useProfile } from "@kinwoo/client/profile";
import { NotificationIcon } from "@kinwoo/icons";
import Link from "next/link";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const ACTION_CLASS =
  "flex shrink-0 items-center justify-center rounded-full hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function HomeHeaderActions({ showNotifications }: { showNotifications: boolean }) {
  const { profile } = useProfile();

  return (
    <div className="flex items-center gap-4">
      {showNotifications ? (
        <button
          type="button"
          aria-label="Notifications"
          className={cn(ACTION_CLASS, "size-[38px] border border-border bg-card")}
        >
          <NotificationIcon size={22} />
        </button>
      ) : null}
      <Link href="/profile" aria-label="Profile" className={ACTION_CLASS}>
        <Avatar name={profile?.displayName ?? null} url={profile?.avatarUrl ?? null} size={38} />
      </Link>
    </div>
  );
}
