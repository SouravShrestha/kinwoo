import { siteUrlFromEnv } from "../build-env";

const MAX_PATH_LENGTH = 512;

/**
 * Narrows an untrusted `next` parameter down to a same-site path.
 *
 * Anything that could leave the origin, or loop back into the auth routes, is
 * discarded in favour of "/". The rejections are deliberately broad: a
 * protocol-relative "//evil.com" is a valid URL to the browser, and a
 * backslash is normalised to a forward slash by some clients, so both have to
 * go even though neither looks like an absolute URL.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (value.length > MAX_PATH_LENGTH) return "/";

  // Control characters can be used to split headers or to hide the real target.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";

  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";

  // Keeps a completed login from redirecting back into the login flow.
  if (value === "/auth" || value.startsWith("/auth/")) return "/";
  if (value === "/login" || value.startsWith("/login/")) return "/";

  return value;
}

/**
 * The origin to build auth redirects against.
 *
 * The configured site URL wins over the request's own origin: behind Cloudflare
 * the inbound URL can carry an internal hostname, and Supabase only honours
 * redirects that match its allow-list exactly.
 */
export function resolveOrigin(request: { url: string }): string {
  const configured = siteUrlFromEnv();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

export function buildRedirectUrl(origin: string, path: string, error?: string): string {
  const url = new URL(safeNextPath(path), origin);
  if (error) url.searchParams.set("auth_error", error);
  return url.toString();
}
