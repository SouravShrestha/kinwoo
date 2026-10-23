"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useNotifications } from "@kinwoo/client/notifications";
import { useProfile } from "@kinwoo/client/profile";
import { NotificationIcon } from "@kinwoo/icons";
import Link from "next/link";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const ACTION_CLASS =
  "flex shrink-0 items-center justify-center rounded-full hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function HomeHeaderActions({ showNotifications }: { showNotifications: boolean }) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id ?? null);
  const unread = notifications?.filter((entry) => !entry.readAt).length ?? 0;

  return (
    <div className="flex items-center gap-4">
      {showNotifications ? (
        <Link
          href="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn(ACTION_CLASS, "relative size-[38px] border border-border bg-card")}
        >
          <NotificationIcon size={22} />
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
      ) : null}
      <Link href="/profile" aria-label="Profile" className={ACTION_CLASS}>
        <Avatar name={profile?.displayName ?? null} url={profile?.avatarUrl ?? null} size={38} />
      </Link>
    </div>
  );
}
