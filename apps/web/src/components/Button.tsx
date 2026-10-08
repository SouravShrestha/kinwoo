"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border border-border bg-background text-foreground hover:bg-muted",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted",
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  className,
  disabled,
  ...rest
}: {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-xl px-5",
        "text-base font-medium transition-opacity",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        VARIANTS[variant],
        isDisabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{label}</span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
