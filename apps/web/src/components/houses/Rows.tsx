"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  label,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  trailing?: ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  const content = (
    <>
      {leading ? <span className="mr-3 shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </>
  );

  if (!onClick) return <div className="flex min-h-16 items-center py-2 text-left">{content}</div>;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex min-h-16 w-full items-center py-2 text-left hover:cursor-pointer hover:opacity-70",
        FOCUS,
      )}
    >
      {content}
    </button>
  );
}

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-10 rounded-full border px-4 text-sm hover:cursor-pointer",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
        FOCUS,
      )}
    >
      {label}
    </button>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className="mt-3 text-sm text-destructive">
      {message}
    </p>
  );
}
