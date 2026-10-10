"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">This page didn&apos;t load</h1>
      <p className="mt-3 text-muted-foreground">Something went wrong. Try again or head home.</p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:cursor-pointer hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg bg-muted px-4 py-2 hover:cursor-pointer">
          Go home
        </Link>
      </div>
    </main>
  );
}
