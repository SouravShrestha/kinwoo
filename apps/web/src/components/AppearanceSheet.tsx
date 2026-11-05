"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { isPublicRoute } from "@kinwoo/core/auth";
import { AutoThemeIcon, MoonIcon, SunIcon } from "@kinwoo/icons";
import { PALETTE_NAMES, resolve, type PaletteName } from "@kinwoo/tokens";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

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

const PALETTE_LABELS: Record<PaletteName, string> = {
  purple: "Purple",
  mono: "Mono",
  skyscanner: "Skyscanner",
  sunset: "Sunset",
  sunflower: "Sunflower",
};

const PALETTE_KEY = "palette";
/** Lets the post-login page and any name sheet settle before the sheet appears. */
const PROMPT_DELAY_MS = 800;

// data-palette is the source of truth (set before paint by the layout's bootstrap script), so
// a reset elsewhere, such as on logout, shows up here too.
function subscribePalette(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-palette"] });
  return () => observer.disconnect();
}

function usePalette() {
  const palette = useSyncExternalStore(
    subscribePalette,
    () => (document.documentElement.dataset.palette as PaletteName | undefined) ?? "purple",
    () => "purple" as const,
  );
  const setPalette = (next: PaletteName) => {
    if (next === "purple") delete document.documentElement.dataset.palette;
    else document.documentElement.dataset.palette = next;
    try {
      localStorage.setItem(PALETTE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the palette still applies for this session.
    }
  };
  return [palette, setPalette] as const;
}

// The preview follows the device (prefers-color-scheme), not the theme currently applied.
function tileStyle(preview: Record<Scheme, Scheme>, palette: PaletteName): CSSProperties {
  return {
    "--tile-bg": resolve("background", preview.light, palette),
    "--tile-fg": resolve("foreground", preview.light, palette),
    "--tile-bg-dark": resolve("background", preview.dark, palette),
    "--tile-fg-dark": resolve("foreground", preview.dark, palette),
  } as CSSProperties;
}

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [palette, setPalette] = usePalette();

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
                style={tileStyle(preview, palette)}
                className="relative flex h-28 w-full flex-col items-start justify-between overflow-hidden rounded-md border border-border bg-(--tile-bg) px-3 pt-4 pb-3 text-left text-(color:--tile-fg) hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [@media(prefers-color-scheme:dark)]:bg-(--tile-bg-dark) [@media(prefers-color-scheme:dark)]:text-(color:--tile-fg-dark)"
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

      <h3 className="text-base font-medium">Colour</h3>
      <div className="mt-4 flex gap-4 pb-6" role="radiogroup" aria-label="Colour">
        {PALETTE_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={palette === name}
            aria-label={PALETTE_LABELS[name]}
            onClick={() => setPalette(name)}
            style={
              {
                "--swatch": resolve("accent", "light", name),
                "--swatch-dark": resolve("accent", "dark", name),
              } as CSSProperties
            }
            className="size-10 rounded-full border border-border bg-[linear-gradient(90deg,var(--swatch)_50%,var(--swatch-dark)_50%)] outline-offset-3 outline-primary hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 aria-checked:outline-2"
          />
        ))}
      </div>
    </BottomSheet>
  );
}

// Signed out is always mono. After sign-in, asks once per device until a palette is stored;
// signing out forgets it.
export function ThemePrompt() {
  const { ready, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || isLoggedIn) return;
    try {
      localStorage.removeItem(PALETTE_KEY);
    } catch {
      // Storage unavailable: nothing stored to forget.
    }
    document.documentElement.dataset.palette = "mono";
    setTheme("system");
  }, [ready, isLoggedIn, setTheme]);

  const eligible =
    ready && isLoggedIn && profileReady && !needsDisplayName && !isPublicRoute(pathname);

  useEffect(() => {
    if (!eligible) return;
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(PALETTE_KEY) !== null) return;
        // Stored on show so a dismiss counts as answered.
        localStorage.setItem(PALETTE_KEY, document.documentElement.dataset.palette ?? "purple");
      } catch {
        return;
      }
      setOpen(true);
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  return <AppearanceSheet open={open} onClose={() => setOpen(false)} />;
}
