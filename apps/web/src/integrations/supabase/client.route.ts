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

// Cookie writes are buffered per Request: Workers handlers cannot mutate a built
// response and next/headers cookies are read-only. Keyed by WeakMap so requests never share.
const pendingByRequest = new WeakMap<Request, PendingCookie[]>();

export function createRouteClient(request: Request): RouteClient {
  const { url, anonKey } = readEnv();

  const pending = pendingByRequest.get(request) ?? [];
  pendingByRequest.set(request, pending);

  // Mobile has no cookie jar; without the bearer token the client is anonymous and RLS rejects every read.
  const token = bearerToken(request);

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => (token ? [] : parseCookieHeader(request.headers.get("cookie"))),
      setAll: (cookiesToSet) => {
        pending.push(...(cookiesToSet as PendingCookie[]));
      },
    },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });

  return { supabase, applyCookies: (response) => applyCookies(request, response) };
}

export function queueCookie(request: Request, cookie: PendingCookie): void {
  const pending = pendingByRequest.get(request) ?? [];
  pending.push(cookie);
  pendingByRequest.set(request, pending);
}

// Call on every exit path, including errors: skipping it on a 401 drops a refreshed session.
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

// A bearer token (mobile) wins over the session cookie. getClaims verifies locally and is
// feature-detected (newer than the pinned types); getUser is the fallback. Returns null, never throws.
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
