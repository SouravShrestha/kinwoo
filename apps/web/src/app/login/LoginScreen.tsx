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
      <main className="flex w-full max-w-md flex-col px-6 pt-10 lg:border-x lg:border-border">
        <div className="flex flex-1 items-center justify-center">
          {/* Toggled with CSS rather than useTheme so the right image renders on first paint. */}
          <Image
            src="/images/landing-screen-image.png"
            alt="Three people filling a shared shopping list together"
            width={400}
            height={300}
            priority
            className="h-auto w-full max-w-sm dark:hidden"
          />
          <Image
            src="/images/landing-screen-image-dark-theme.png"
            alt="Three people filling a shared shopping list together"
            width={400}
            height={300}
            priority
            className="hidden h-auto w-full max-w-sm dark:block"
          />
        </div>

        <div>
          <h1 className="font-display text-3xl font-medium">Welcome to {APP_NAME}</h1>
          <p className="mt-2 text-base text-muted-foreground font-normal">
            Everything shared. Nothing forgotten.
          </p>
        </div>

        <div className="mt-10 space-y-3">
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

        <p className="mt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground font-normal">
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
