// Route handlers, unlike Server Actions, get no automatic Origin/Host check, so public form
// endpoints do it here.

// cf-connecting-ip is set by the Cloudflare edge and cannot be spoofed. x-forwarded-for is
// client-controlled, so it is trusted only outside production.
export function getClientIp(request: Request): string {
  const edgeIp = request.headers.get("cf-connecting-ip");
  if (edgeIp) return edgeIp;
  if (process.env.NODE_ENV !== "production") {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return "unknown";
}

// Browsers always send Origin on cross-origin POSTs and cannot set Host, so a mismatch or a
// missing Origin means another site is submitting on a visitor's behalf.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")].filter(
    Boolean,
  );
  if (!origin || hosts.length === 0) return false;
  try {
    return hosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}

// Requiring JSON forces a CORS preflight for cross-origin callers, which are never approved.
export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
