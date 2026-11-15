"use client";

import { EMBED_QUERY, LEGAL_URLS } from "@kinwoo/core/app";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "@/components/Button";
import { houseStorage } from "@/lib/house-storage";

const ACCEPTED_KEY = "kinwoo.cookiesAccepted";

// The app only sets strictly necessary sign-in cookies, so this informs rather than asks.
export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The mobile app opens the feedback page in its in-app browser, where this notice does not apply.
    const [key, value] = EMBED_QUERY.split("=");
    if (new URLSearchParams(window.location.search).get(key) === value) return;
    void houseStorage.getItem(ACCEPTED_KEY).then((accepted) => setOpen(accepted === null));
  }, []);

  const dismiss = () => {
    setOpen(false);
    void houseStorage.setItem(ACCEPTED_KEY, "1");
  };

  return (
    <BottomSheet open={open} onClose={dismiss} label="Cookie notice">
      <div className="flex flex-col items-center px-2 pt-3 pb-6 text-center">
        <p className="font-display text-sm leading-relaxed font-normal text-muted-foreground">
          We only use the cookies that keep you signed in. No ads, no tracking. See our{" "}
          <Link
            href={LEGAL_URLS.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <Button
          label="Got it"
          onClick={dismiss}
          data-autofocus
          className="mt-6 w-auto rounded-full px-10 font-sans font-semibold"
        />
      </div>
    </BottomSheet>
  );
}
