"use client";

import { useTheme } from "next-themes";

import { BottomSheet } from "./BottomSheet";

const OPTIONS = [
  { value: "light", label: "Light", hint: "Always the light theme" },
  { value: "dark", label: "Dark", hint: "Always the dark theme" },
  { value: "system", label: "System", hint: "Follow the device setting" },
] as const;

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} label="Appearance">
      <h2 className="font-display text-2xl font-bold">Appearance</h2>

      <ul className="mt-4" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map((option) => {
          const selected = theme === option.value;

          return (
            <li key={option.value}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value);
                  onClose();
                }}
                className="flex min-h-14 w-full items-center text-left hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
              >
                <span className="flex-1">
                  <span className="block text-base">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
                {selected ? <span aria-hidden>✓</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
