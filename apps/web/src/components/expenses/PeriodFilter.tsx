import { CaretDownIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  allTime: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onToggleAllTime: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

function StepButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "previous" ? "Previous month" : "Next month"}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center text-foreground enabled:hover:cursor-pointer disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <CaretDownIcon size={12} className={direction === "previous" ? "rotate-90" : "-rotate-90"} />
    </button>
  );
}

export function PeriodFilter({
  label,
  allTime,
  canGoPrevious,
  canGoNext,
  onToggleAllTime,
  onPrevious,
  onNext,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-3 px-6">
      <button
        type="button"
        aria-pressed={allTime}
        onClick={onToggleAllTime}
        className={cn(
          "rounded-xl border px-4 py-2 font-display text-sm font-medium transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          allTime
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-foreground",
        )}
      >
        All time
      </button>
      <div className={cn("flex items-center", allTime && "opacity-40")}>
        <StepButton direction="previous" disabled={!canGoPrevious} onClick={onPrevious} />
        <p className="min-w-36 text-center font-display text-base font-medium text-foreground">
          {label}
        </p>
        <StepButton direction="next" disabled={!canGoNext} onClick={onNext} />
      </div>
    </div>
  );
}
