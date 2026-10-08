"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** The codes /auth/callback can redirect with, mapped to copy. */
const MESSAGES: Record<string, string> = {
  provider_denied: "Login was cancelled.",
  missing_code: "That login link was incomplete. Try again.",
  exchange_failed: "That login link has expired or was already used.",
  verify_failed: "That login link has expired or was already used.",
  bad_token_type: "That login link is not one we recognise.",
  unavailable: "We could not reach the login service. Try again in a moment.",
};

export function AuthErrorNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const code = params.get("auth_error");
  const [message, setMessage] = useState<string | null>(null);
  // Guards against the effect running twice in development's double render.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!code || handled.current === code) return;
    handled.current = code;

    setMessage(MESSAGES[code] ?? "Login failed. Try again.");

    // Strip the parameter so a refresh does not resurface the message.
    const next = new URLSearchParams(params.toString());
    next.delete("auth_error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [code, params, pathname, router]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-90 mx-auto mt-4 w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border bg-background p-4 shadow-lg"
    >
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="mt-2 text-xs text-muted-foreground underline"
      >
        Dismiss
      </button>
    </div>
  );
}
