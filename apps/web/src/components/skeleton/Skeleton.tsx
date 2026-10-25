import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("skeleton block rounded-md", className)} />;
}

export function SkeletonRegion({
  children,
  className,
  label = "Loading",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// Line boxes match the real text styles (Tailwind size and line-height, scaled by the user's
// font scale), so a skeleton takes the same height as the text it stands in for.
const LINE = {
  xs: "text-xs h-[calc(1rem*var(--font-scale,1))]",
  sm: "text-sm h-[calc(1.25rem*var(--font-scale,1))]",
  base: "text-base h-[calc(1.5rem*var(--font-scale,1))]",
  lg: "text-lg h-[calc(1.75rem*var(--font-scale,1))]",
  xl: "text-xl h-[calc(1.75rem*var(--font-scale,1))]",
  "2xl": "text-2xl h-[calc(2rem*var(--font-scale,1))]",
  "3xl": "text-3xl h-[calc(2.25rem*var(--font-scale,1))]",
} as const;

const ALIGN = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;

export function SkeletonText({
  size,
  className,
  align = "start",
}: {
  size: keyof typeof LINE;
  className?: string;
  align?: keyof typeof ALIGN;
}) {
  return (
    <span aria-hidden className={cn("flex items-center", LINE[size], ALIGN[align])}>
      <Skeleton className={cn("h-[0.75em]", className)} />
    </span>
  );
}
