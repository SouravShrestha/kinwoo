import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MenuCard({
  icon,
  stack,
  caption,
  title,
  size = "full",
  onClick,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  // tall fills the height of the cards beside it; half is one short row.
  size?: "full" | "tall" | "half";
  onClick: () => void;
}) {
  const iconBadge = (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
      {icon}
    </span>
  );

  return (
    <button
      type="button"
      aria-label={caption ? `${title}, ${caption}` : title}
      onClick={onClick}
      className={cn(
        "flex rounded-lg border border-border bg-card text-left",
        "hover:cursor-pointer hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        size === "half" && "h-20 w-full items-center justify-between gap-2 pl-4 pr-3",
        size === "tall" && "min-h-40 w-[45%] min-w-36 shrink-0 flex-col justify-between p-5",
        size === "full" && "h-42 w-full flex-col justify-between p-5 pt-3",
      )}
    >
      {size === "half" ? (
        <>
          <span className="min-w-0 font-display text-base leading-tight font-normal">{title}</span>
          {iconBadge}
        </>
      ) : (
        <>
          <span className="-mr-2 flex justify-end self-stretch">{iconBadge}</span>
          <span className="block">
            {stack ? <span className="mb-2 block">{stack}</span> : null}
            {caption ? (
              <span className="mb-1 block font-display text-sm font-normal">{caption}</span>
            ) : null}
            <span className="block font-display text-lg font-normal">{title}</span>
          </span>
        </>
      )}
    </button>
  );
}
