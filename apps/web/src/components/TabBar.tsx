"use client";

import { TABS, activeTabFor, type TabKey } from "@kinwoo/core/app";
import {
  BillIcon,
  HomeIcon,
  ListIcon,
  ProfileIcon,
  ProfileOutlineIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

/** Profile is the only tab with a distinct focused glyph. */
const ICONS: Record<
  TabKey,
  { active: ComponentType<WebIconProps>; inactive: ComponentType<WebIconProps> }
> = {
  home: { active: HomeIcon, inactive: HomeIcon },
  tasks: { active: ListIcon, inactive: ListIcon },
  bills: { active: BillIcon, inactive: BillIcon },
  profile: { active: ProfileIcon, inactive: ProfileOutlineIcon },
};

/** Traced sizes differ per glyph, so each is nudged to look optically equal. */
const SIZES: Record<TabKey, number> = { home: 25, tasks: 26, bills: 24, profile: 24 };

export function TabBar() {
  const pathname = usePathname();
  const active = activeTabFor(pathname);

  return (
    <nav
      aria-label="Main"
      // Pinned to the viewport on a phone, but the inner track aligns with the
      // app column on a wide screen.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-16 w-full max-w-md items-stretch">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const Icon = isActive ? ICONS[tab.key].active : ICONS[tab.key].inactive;

          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // min-h-11 keeps the target at the 44px minimum.
                  "flex h-full min-h-11 w-full items-center justify-center",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={SIZES[tab.key]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
