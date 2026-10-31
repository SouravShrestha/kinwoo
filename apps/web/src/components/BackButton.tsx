"use client";

import { EMBED_QUERY } from "@kinwoo/core/app";
import { ArrowRightIcon } from "@kinwoo/icons";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/router";
import { Suspense } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";

function HideWhenEmbedded() {
  const [key, value] = EMBED_QUERY.split("=");
  return useSearchParams().get(key) === value ? null : <BackButton />;
}

// The mobile app opens these pages in its in-app browser, which has its own close button;
// Back there would only lead to the login page.
export function PublicBackButton() {
  return (
    <Suspense fallback={null}>
      <HideWhenEmbedded />
    </Suspense>
  );
}

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  const { goBack } = useHouseNavigation();

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={href ? () => router.replace(href) : goBack}
      className="-mx-2 flex size-9 items-center justify-start hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <ArrowRightIcon size={24} className="rotate-180" />
    </button>
  );
}
