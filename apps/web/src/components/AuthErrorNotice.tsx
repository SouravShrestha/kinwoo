"use client";

import { toast } from "@kinwoo/client/toast";
import { authErrorToastMessage } from "@kinwoo/core/toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function AuthErrorNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const code = params.get("auth_error");
  // Guards against the effect running twice in development's double render.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!code || handled.current === code) return;
    handled.current = code;

    toast.error(authErrorToastMessage(code));

    const next = new URLSearchParams(params.toString());
    next.delete("auth_error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [code, params, pathname, router]);

  return null;
}
