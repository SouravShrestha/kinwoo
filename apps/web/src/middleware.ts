import { isPublicRoute } from "@kinwoo/core/auth";
import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createNonce } from "@/lib/csp";

const CSP_HEADER = "Content-Security-Policy";

export async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce);

  // Next.js reads the nonce from the request's CSP header and stamps it on its own scripts.
  // Rebuilt after each cookie refresh so the handler also sees the updated cookies.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set(CSP_HEADER, csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Fails open when env is unconfigured so preview and build-time requests still render.
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = next();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // getClaims verifies the JWT locally against the cached JWKS, so page and RSC navigations
    // skip the Supabase Auth round trip that getUser makes. It still refreshes expired sessions.
    const { data, error } = await supabase.auth.getClaims();

    // A network failure says nothing about the session, so let the client gate decide.
    if (
      !data?.claims.sub &&
      !isAuthRetryableFetchError(error) &&
      !isPublicRoute(request.nextUrl.pathname)
    ) {
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      redirect.headers.set(CSP_HEADER, csp);
      return redirect;
    }
  }

  response.headers.set(CSP_HEADER, csp);
  return response;
}

// API routes verify the user and flush refreshed cookies themselves (createRouteClient), so they
// skip this extra round trip to Supabase Auth.
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|sw.js|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$).*)",
  ],
};
