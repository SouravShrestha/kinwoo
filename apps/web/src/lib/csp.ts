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
    `img-src 'self' data: https://lh3.googleusercontent.com ${supabaseHost}`.trim(),
    `connect-src 'self' ${supabaseHost} ${supabaseWss}`.trim(),
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
