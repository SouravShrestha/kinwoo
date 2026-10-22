export type TabKey = "home" | "tasks" | "bills" | "activities";

export interface TabDefinition {
  key: TabKey;
  href: string;
  label: string;
  requiresHouse: boolean;
}

// Data only: core cannot import icon components, so each app maps the key to its own.
export const TABS: readonly TabDefinition[] = [
  { key: "home", href: "/", label: "Home", requiresHouse: false },
  { key: "tasks", href: "/tasks", label: "Lists", requiresHouse: true },
  { key: "bills", href: "/bills", label: "Bills", requiresHouse: true },
  { key: "activities", href: "/activities", label: "Activities", requiresHouse: true },
];

// "/" must match exactly or it would claim every path. The rest match on a
// segment boundary so "/billsomething" is not treated as "/bills".
export function activeTabFor(pathname: string): TabKey | null {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  for (const tab of TABS) {
    if (tab.href === "/") {
      if (normalised === "/") return tab.key;
      continue;
    }

    if (normalised === tab.href || normalised.startsWith(`${tab.href}/`)) return tab.key;
  }

  return null;
}

export function routeRequiresHouse(pathname: string): boolean {
  const key = activeTabFor(pathname);
  return TABS.some((tab) => tab.key === key && tab.requiresHouse);
}
