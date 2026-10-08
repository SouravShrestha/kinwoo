import { createServerClient } from "@supabase/ssr";
import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { parseCookieHeader } from "./cookies";
import { readEnv } from "./env";

export interface PendingCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export interface RouteClient {
  supabase: SupabaseClient<Database>;
  applyCookies: <T extends NextResponse>(response: T) => T;
}

/**
 * Cookie writes are buffered per Request rather than written immediately.
 *
 * A route handler on Cloudflare Workers cannot mutate a response once it has
 * been constructed, and `next/headers` cookies are read-only inside handlers.
 * So Supabase's `setAll` collects here, and `applyCookies` flushes onto the
 * response the handler is about to return. A WeakMap keyed on the Request means
 * concurrent requests never share a buffer and entries are collected with the
 * request.
 */
const pendingByRequest = new WeakMap<Request, PendingCookie[]>();

export function createRouteClient(request: Request): RouteClient {
  const { url, anonKey } = readEnv();

  const pending = pendingByRequest.get(request) ?? [];
  pendingByRequest.set(request, pending);

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie")),
      setAll: (cookiesToSet) => {
        pending.push(...(cookiesToSet as PendingCookie[]));
      },
    },
  });

  return { supabase, applyCookies: (response) => applyCookies(request, response) };
}

/** Lets a handler piggyback its own cookies on the same flush. */
export function queueCookie(request: Request, cookie: PendingCookie): void {
  const pending = pendingByRequest.get(request) ?? [];
  pending.push(cookie);
  pendingByRequest.set(request, pending);
}

/**
 * Must be called on every exit path of every handler, including error paths.
 * Skipping it on a 401 drops a refreshed session and logs the user out.
 */
export function applyCookies<T extends NextResponse>(request: Request, response: T): T {
  const pending = pendingByRequest.get(request);
  if (!pending) return response;

  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }

  return response;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

type ClaimsCapable = {
  getClaims?: (jwt?: string) => Promise<{
    data: { claims?: { sub?: string } } | null;
    error: unknown;
  }>;
};

/**
 * Resolves the caller's identity from either credential kind: a bearer token
 * (mobile) takes precedence, otherwise the session cookie (web).
 *
 * `getClaims` verifies the JWT locally and is tried first to avoid a network
 * round trip per request; it is feature-detected because it is newer than the
 * pinned supabase-js types. `getUser` is the authoritative fallback.
 *
 * Returns null rather than throwing: an unidentified caller is a guest, never
 * someone else.
 */
export async function getVerifiedUser(request: Request): Promise<{ id: string } | null> {
  const token = bearerToken(request);
  if (token) return verifyBearerToken(token);

  const { supabase } = createRouteClient(request);
  return verifyWithClient(supabase);
}

async function verifyBearerToken(token: string): Promise<{ id: string } | null> {
  const { url, anonKey } = readEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const auth = supabase.auth as unknown as ClaimsCapable;
  if (auth.getClaims) {
    try {
      const { data, error } = await auth.getClaims(token);
      const sub = data?.claims?.sub;
      if (!error && sub) return { id: sub };
      if (!error) return null;
    } catch {
      // Fall through to the remote check.
    }
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

async function verifyWithClient(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string } | null> {
  const auth = supabase.auth as unknown as ClaimsCapable;

  if (auth.getClaims) {
    try {
      const { data, error } = await auth.getClaims();
      const sub = data?.claims?.sub;
      if (!error && sub) return { id: sub };
      if (!error) return null;
    } catch {
      // Fall through to the remote check.
    }
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}
