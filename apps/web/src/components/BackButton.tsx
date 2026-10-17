"use client";

import { ArrowRightIcon } from "@kinwoo/icons";

import { useHouseNavigation } from "@/lib/house-navigation";

export function BackButton() {
  const { goBack } = useHouseNavigation();

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={goBack}
      className="-mx-2 flex size-9 items-center justify-start hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <ArrowRightIcon size={26} className="rotate-180" />
    </button>
  );
}
