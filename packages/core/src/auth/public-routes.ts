export const PUBLIC_ROUTES = ["/login", "/legal", "/feedback", "/auth", "/join"] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
