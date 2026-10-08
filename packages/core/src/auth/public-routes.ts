/** Routes reachable without a session. The auth gate stays out of the way here. */
export const PUBLIC_ROUTES = ["/login", "/legal", "/auth"] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
