import { ArrowRightIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

export function SheetHeader({
  title,
  subtitle,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <div className="pr-10">
      {onBack ? (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="-ml-2 flex size-9 shrink-0 items-center justify-center hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <ArrowRightIcon size={24} className="rotate-180" />
        </button>
      ) : null}
      {title ? (
        <h2 className={cn("font-display text-xl font-medium", onBack && "mt-4")}>
          {title}
          {subtitle ? (
            <span className="mt-0.5 block font-display text-sm font-normal text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </h2>
      ) : null}
    </div>
  );
}
