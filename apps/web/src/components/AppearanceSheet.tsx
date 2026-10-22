"use client";

import { AutoThemeIcon, MoonIcon, SunIcon } from "@kinwoo/icons";
import { resolve } from "@kinwoo/tokens";
import { useTheme } from "next-themes";
import type { CSSProperties } from "react";

import { BottomSheet } from "./BottomSheet";

type Scheme = "light" | "dark";

const OPTIONS: {
  value: "system" | "dark" | "light";
  label: string;
  Icon: typeof SunIcon;
  preview: Record<Scheme, Scheme>;
}[] = [
  {
    value: "system",
    label: "System",
    Icon: AutoThemeIcon,
    preview: { light: "light", dark: "dark" },
  },
  { value: "dark", label: "Dark", Icon: MoonIcon, preview: { light: "dark", dark: "dark" } },
  { value: "light", label: "Light", Icon: SunIcon, preview: { light: "light", dark: "light" } },
];

// The preview follows the device (prefers-color-scheme), not the theme currently applied.
function tileStyle(preview: Record<Scheme, Scheme>): CSSProperties {
  return {
    "--tile-bg": resolve("background", preview.light),
    "--tile-fg": resolve("foreground", preview.light),
    "--tile-bg-dark": resolve("background", preview.dark),
    "--tile-fg-dark": resolve("foreground", preview.dark),
  } as CSSProperties;
}

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} label="Appearance" showClose>
      <h2 className="pr-10 font-display text-xl font-medium">Choose your theme</h2>

      <div className="-mx-1.5 mt-9 flex pb-6" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map(({ value, label, Icon, preview }) => {
          const selected = theme === value;

          return (
            <div key={value} className="flex-1 px-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(value);
                  onClose();
                }}
                style={tileStyle(preview)}
                className="relative flex h-28 w-full flex-col items-start justify-between overflow-hidden rounded-md border border-border bg-(--tile-bg) px-3 pt-4 pb-3 text-left text-(color:--tile-fg) hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [@media(prefers-color-scheme:dark)]:bg-(--tile-bg-dark) [@media(prefers-color-scheme:dark)]:text-(color:--tile-fg-dark)"
              >
                <Icon size={16} />
                <span className="text-base font-medium">{label}</span>
                {selected ? (
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
