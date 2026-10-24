"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "destructive";

// Outline and destructive stay transparent so they take on the surface they sit on, page or sheet.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted",
  destructive: "border border-destructive bg-transparent text-destructive hover:bg-muted",
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  iconEnd,
  labelWeight = "medium",
  className,
  disabled,
  ...rest
}: {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  labelWeight?: "normal" | "medium";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const isDisabled = disabled || loading;
  useBusyWhile(loading);

  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={cn(
        "flex min-h-14 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-5 py-3",
        "font-display text-base",
        labelWeight === "normal" ? "font-normal" : "font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        VARIANTS[variant],
        isDisabled ? "cursor-not-allowed opacity-50" : "hover:cursor-pointer",
        className,
      )}
      {...rest}
    >
      {icon}
      <span>{label}</span>
      {iconEnd}
    </button>
  );
}
