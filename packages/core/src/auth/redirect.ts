import { siteUrlFromEnv } from "../build-env";

const MAX_PATH_LENGTH = 512;

// Rejections are deliberately broad: "//evil.com" is a valid URL to the browser,
// and some clients normalise a backslash to a forward slash.
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

// The configured site URL wins over the request origin: behind Cloudflare the
// inbound URL can carry an internal hostname, and Supabase only honours
// redirects that match its allow-list exactly.
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

// Supabase reports a Google account that already belongs to another user as
// error_code=identity_already_exists, alongside a generic error param.
export function providerErrorCode(
  params: URLSearchParams,
): "identity_already_linked" | "provider_denied" {
  return params.get("error_code") === "identity_already_exists"
    ? "identity_already_linked"
    : "provider_denied";
}
