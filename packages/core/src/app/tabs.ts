export type TabKey = "home" | "tasks" | "bills" | "profile";

export interface TabDefinition {
  key: TabKey;
  href: string;
  label: string;
}

/**
 * The single source for the bottom navigation on both platforms. Only data
 * lives here: core cannot import icon components, so each app maps the key to
 * its own renderer.
 */
export const TABS: readonly TabDefinition[] = [
  { key: "home", href: "/", label: "Home" },
  { key: "tasks", href: "/tasks", label: "Tasks" },
  { key: "bills", href: "/bills", label: "Bills" },
  { key: "profile", href: "/profile", label: "Profile" },
];

/**
 * Which tab a pathname belongs to, or null for a route outside the navigation.
 *
 * "/" has to match exactly, otherwise it would claim every path. The rest match
 * on a path-segment boundary so "/billsomething" is not treated as "/bills".
 */
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
