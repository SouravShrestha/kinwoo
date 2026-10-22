import Link from "next/link";

import { cn } from "@/lib/utils";

const BADGE = {
  primary: "bg-primary/15 text-primary",
  destructive: "bg-destructive/15 text-destructive",
} as const;

export function SectionHeader({
  title,
  count,
  tone,
}: {
  title: string;
  count: number;
  tone: keyof typeof BADGE;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {count > 0 ? (
          <span
            className={cn("rounded-full px-2 py-0.5 font-display text-xs font-medium", BADGE[tone])}
          >
            {count}
          </span>
        ) : null}
      </div>
      <Link
        href="/tasks"
        aria-label="See all lists"
        className="font-display text-xs font-medium text-muted-foreground hover:cursor-pointer hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        See all
      </Link>
    </div>
  );
}
