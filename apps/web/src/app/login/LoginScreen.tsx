"use client";

import { useAuth } from "@kinwoo/client/auth";
import { APP_NAME } from "@kinwoo/core/app";
import { GoogleIcon } from "@kinwoo/icons";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthSheet } from "@/components/AuthSheet";
import { Button } from "@/components/Button";

export function LoginScreen() {
  const { isLoggedIn, ready, canSignInWithGoogle, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [emailOpen, setEmailOpen] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && isLoggedIn) router.replace("/");
  }, [ready, isLoggedIn, router]);

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
      setGoogleBusy(false);
    }
    // On success the browser navigates away, so the busy state is never
    // cleared on purpose.
  };

  return (
    <div className="flex min-h-dvh justify-center">
      <main className="flex w-full max-w-md flex-col px-7 pt-[calc(1rem+env(safe-area-inset-top))] lg:border-x lg:border-border">
        <div className="flex flex-1 items-center justify-center">
          {/* Toggled with CSS rather than useTheme so the right image renders on first paint. */}
          <Image
            src="/images/landing-screen-image.webp"
            alt="Three people filling a shared shopping list together"
            width={725}
            height={512}
            priority
            className="h-64 w-full object-contain dark:hidden"
          />
          <Image
            src="/images/landing-screen-image-dark-theme.webp"
            alt="Three people filling a shared shopping list together"
            width={770}
            height={512}
            priority
            className="hidden h-64 w-full object-contain dark:block"
          />
        </div>

        <div>
          <h1>
            <Image
              src="/images/logo-typed-black.webp"
              alt={APP_NAME}
              width={320}
              height={90}
              priority
              className="h-[45px] w-[160px] object-contain dark:hidden"
            />
            <Image
              src="/images/logo-typed-white.webp"
              alt={APP_NAME}
              width={320}
              height={90}
              priority
              className="hidden h-[45px] w-[160px] object-contain dark:block"
            />
          </h1>
          <p className="ml-2 mt-2 font-display text-base font-normal text-muted-foreground">
            Everything shared. Nothing forgotten.
          </p>
        </div>

        <div className="mt-12 px-1 space-y-3">
          <Button label="Sign in with Email" onClick={() => setEmailOpen(true)} />

          {canSignInWithGoogle ? (
            <Button
              label="Continue with Google"
              variant="outline"
              loading={googleBusy}
              onClick={() => void google()}
              icon={<GoogleIcon size={20} />}
            />
          ) : null}

          {error ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <p className="mt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
          By continuing to use {APP_NAME}, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:cursor-pointer">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:cursor-pointer">
            Privacy Policy
          </Link>
          .
        </p>

        <AuthSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
      </main>
    </div>
  );
}
