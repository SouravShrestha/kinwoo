import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MenuCard({
  icon,
  stack,
  caption,
  title,
  tall = false,
  onClick,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  tall?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={caption ? `${title}, ${caption}` : title}
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border bg-card p-5 text-left",
        "hover:cursor-pointer hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        tall ? "h-40 min-w-0 flex-1" : "h-42 w-full pt-3",
      )}
    >
      <span className="-mr-2 flex justify-end self-stretch">
        <span className="flex size-9 items-center justify-center rounded-full bg-background border border-border">
          {icon}
        </span>
      </span>
      <span className="block">
        {stack ? <span className="mb-2 block">{stack}</span> : null}
        {caption ? (
          <span className="mb-1 block font-display text-sm font-normal">{caption}</span>
        ) : null}
        <span className="block font-display text-lg font-normal">{title}</span>
      </span>
    </button>
  );
}
