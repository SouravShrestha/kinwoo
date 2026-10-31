"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { savePendingInvite } from "@kinwoo/client/houses";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/router";
import { useEffect } from "react";

import { houseStorage } from "@/lib/house-storage";

// Public route: a signed-out recipient lands here first. The code is parked in storage and the
// join resumes once sign-in finishes, so it survives the login detour.
export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { isLoggedIn, ready } = useAuth();

  const code = params.code ?? "";

  useBusyWhile(true);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    void savePendingInvite(houseStorage, code).then((saved) => {
      if (!active) return;

      if (!isLoggedIn) router.replace("/login");
      else if (saved) router.replace("/");
      else router.replace(`/house/join?code=${encodeURIComponent(code)}`);
    });

    return () => {
      active = false;
    };
  }, [ready, isLoggedIn, code, router]);

  return <main aria-busy className="min-h-dvh" />;
}
