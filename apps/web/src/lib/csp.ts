// Built per request in middleware: a fresh nonce lets Next.js mark its own scripts as trusted
// while 'strict-dynamic' blocks any injected inline script.
export function buildContentSecurityPolicy(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
  const supabaseWss = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, "wss://") : "";
  const isDev = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: lets the avatar cropper preview the photo the user just picked.
    `img-src 'self' data: blob: https://lh3.googleusercontent.com ${supabaseHost}`.trim(),
    // Safari does not let 'self' cover ws:// on the same host, which breaks HMR on a LAN IP.
    `connect-src 'self' ${supabaseHost} ${supabaseWss}${isDev ? " ws:" : ""}`.trim(),
    "font-src 'self' data:",
    // Without it workers fall back to script-src, where 'strict-dynamic' ignores 'self'.
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
