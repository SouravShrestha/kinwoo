"use client";

import { NOT_FOUND_COPY } from "@kinwoo/core/app";
import { useRouter } from "@/lib/router";

import { Button } from "@/components/Button";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center font-display">
      <h1 className="text-6xl font-medium text-foreground">{NOT_FOUND_COPY.code}</h1>
      <p className="mt-6 text-base text-foreground">{NOT_FOUND_COPY.title}</p>
      <p className="mt-4 max-w-xs text-base text-muted-foreground">{NOT_FOUND_COPY.hint}</p>
      <Button
        label={NOT_FOUND_COPY.action}
        onClick={() => router.replace("/")}
        className="mt-8 max-w-sm"
      />
    </main>
  );
}
