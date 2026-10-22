"use client";

import type { ListVisibility } from "@kinwoo/core/grocery";
import { GlobeFilledIcon, LockFilledIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

const SEGMENT = "flex h-10 w-14 items-center justify-center transition-colors duration-200";

export function ListVisibilityToggle({
  value,
  onChange,
  disabled,
}: {
  value: ListVisibility;
  onChange: (visibility: ListVisibility) => void;
  disabled?: boolean;
}) {
  const isPublic = value === "shared";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublic}
      aria-label="Public list"
      disabled={disabled}
      onClick={() => onChange(isPublic ? "private" : "shared")}
      className="relative flex h-12 shrink-0 items-center gap-1 rounded-xl bg-muted p-1 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-1 top-1 h-10 w-14 rounded-lg bg-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
          isPublic && "translate-x-[calc(100%+0.25rem)]",
        )}
      />
      <span className={cn(SEGMENT, "relative", isPublic ? "text-foreground" : "text-background")}>
        <LockFilledIcon size={16} />
      </span>
      <span className={cn(SEGMENT, "relative", isPublic ? "text-background" : "text-foreground")}>
        <GlobeFilledIcon size={16} />
      </span>
    </button>
  );
}
