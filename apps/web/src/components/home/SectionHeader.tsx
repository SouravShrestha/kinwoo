import type { ReactNode } from "react";

export function SectionHeader({
  title,
  count,
  trailing,
}: {
  title: string;
  count: number;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-sm font-normal text-foreground">
        {title}
        <span className="ml-1.5 font-normal text-muted-foreground">
          <span className="text-xs">(</span>
          {count}
          <span className="text-xs">)</span>
        </span>
      </h2>
      {trailing}
    </div>
  );
}
