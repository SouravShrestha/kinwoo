"use client";

import { TABS, activeTabFor, type TabKey } from "@kinwoo/core/app";
import {
  BillActiveIcon,
  BillIcon,
  HomeActiveIcon,
  HomeIcon,
  ListActiveIcon,
  ListIcon,
  ProfileActiveIcon,
  ProfileIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import { rejectHouseRequired, useHouseAccess } from "@kinwoo/client/houses";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";

import { cn } from "@/lib/utils";

const ICONS: Record<
  TabKey,
  { active: ComponentType<WebIconProps>; inactive: ComponentType<WebIconProps> }
> = {
  home: { active: HomeActiveIcon, inactive: HomeIcon },
  tasks: { active: ListActiveIcon, inactive: ListIcon },
  bills: { active: BillActiveIcon, inactive: BillIcon },
  profile: { active: ProfileActiveIcon, inactive: ProfileIcon },
};

const SIZES: Record<TabKey, number> = { home: 25, tasks: 26, bills: 24, profile: 24 };

export function TabBar() {
  const pathname = usePathname();
  const active = activeTabFor(pathname);
  const router = useRouter();
  const { hasNoHouse } = useHouseAccess();

  // Derived during render so the first paint does not animate.
  const [seen, setSeen] = useState(active);
  const [previous, setPrevious] = useState<TabKey | null | undefined>(undefined);
  if (seen !== active) {
    setSeen(active);
    setPrevious(seen);
  }

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:border-x"
    >
      <ul className="flex h-16 w-full items-stretch">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const Icon = isActive ? ICONS[tab.key].active : ICONS[tab.key].inactive;

          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                onClick={(event) => {
                  if (!hasNoHouse || !tab.requiresHouse) return;
                  event.preventDefault();
                  rejectHouseRequired(pathname, () => router.replace("/"));
                }}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex h-full min-h-11 w-full items-center justify-center transition-colors duration-200 hover:cursor-pointer",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex transition-transform duration-150 ease-out group-active:scale-90",
                    isActive && previous !== undefined && "tab-icon-activate",
                    !isActive && previous === tab.key && "tab-icon-deactivate",
                  )}
                >
                  <Icon size={SIZES[tab.key]} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
