import { getCloudflareContext } from "@opennextjs/cloudflare";

// On Workers the RATE_LIMITER binding (wrangler.toml) is shared by every isolate in a location.
// Without it (next dev, tests) or if it errors, a per-isolate in-memory window is used instead.
// Keep the limit and period in wrangler.toml in sync with the options the route passes in.

export type RateLimitOptions = { maxRequests: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterMs: number };
export type RateLimitBinding = { limit(options: { key: string }): Promise<{ success: boolean }> };

const MAX_KEYS = 10_000;
const store = new Map<string, number[]>();

export function checkMemoryRateLimit(
  key: string,
  { maxRequests, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= maxRequests) {
    store.set(key, recent);
    return { allowed: false, retryAfterMs: recent[0] + windowMs - now };
  }
  recent.push(now);
  // Re-inserting moves the key to the end, so the first key is always the stalest.
  store.delete(key);
  store.set(key, recent);
  if (store.size > MAX_KEYS) store.delete(store.keys().next().value as string);
  return { allowed: true, retryAfterMs: 0 };
}

function getBinding(): RateLimitBinding | undefined {
  try {
    const { env } = getCloudflareContext();
    const binding = (env as { RATE_LIMITER?: RateLimitBinding }).RATE_LIMITER;
    return typeof binding?.limit === "function" ? binding : undefined;
  } catch {
    return undefined;
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  binding: RateLimitBinding | undefined = getBinding(),
): Promise<RateLimitResult> {
  if (binding) {
    try {
      const { success } = await binding.limit({ key });
      // The binding does not report time remaining, so the full window is the safe upper bound.
      return success
        ? { allowed: true, retryAfterMs: 0 }
        : { allowed: false, retryAfterMs: options.windowMs };
    } catch (error) {
      console.error("Rate limit binding failed, using in-memory fallback:", error);
    }
  }
  return checkMemoryRateLimit(key, options);
}
