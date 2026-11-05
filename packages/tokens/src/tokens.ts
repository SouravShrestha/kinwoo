export interface ThemedValue {
  light: string;
  dark: string;
}

export type TokenValue = string | ThemedValue;

export interface Token {
  name: string;
  value: TokenValue;
}

export const RADIUS_REM = 0.75;

export const TOKENS: Token[] = [
  // Same neutral background in every palette; only accents and surfaces are tinted.
  { name: "background", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "sheet", value: { light: "#ffffff", dark: "#161616" } },
  { name: "dialog", value: { light: "#ffffff", dark: "#0e0e0e" } },
  { name: "dialog-header", value: { light: "#f1ecfc", dark: "#141414" } },
  { name: "dialog-border", value: { light: "#e7e1f7", dark: "#262626" } },
  { name: "backdrop", value: "#000000cc" },
  { name: "foreground", value: { light: "#1e1240", dark: "#f5f5f5" } },
  { name: "card", value: { light: "#ffffff", dark: "#181818" } },
  { name: "muted", value: { light: "#f1ecfc", dark: "#1a1a1a" } },
  { name: "muted-foreground", value: { light: "#7d7398", dark: "#a3a3a3" } },
  { name: "icon-muted", value: { light: "#a59cbf", dark: "#6b6b6b" } },
  { name: "border", value: { light: "#e7e1f7", dark: "#2a2a2a" } },
  { name: "card-border", value: { light: "#f1edfb", dark: "#222222" } },
  { name: "primary", value: { light: "#9836ce", dark: "#b46cf0" } },
  { name: "primary-strong", value: { light: "#4a2fa3", dark: "#8f4fd6" } },
  { name: "primary-foreground", value: { light: "#ffffff", dark: "#0e0e0e" } },
  // Soft elevation shadow, alpha included: a deep palette tint in light, plain black in dark
  // (tinted shadows on a dark background read as a coloured glow).
  { name: "shadow", value: { light: "#1e124012", dark: "#00000059" } },
  { name: "accent", value: { light: "#9836ce", dark: "#b46cf0" } },
  { name: "accent-foreground", value: { light: "#ffffff", dark: "#0e0e0e" } },
  { name: "destructive", value: { light: "#c0392b", dark: "#e06a5c" } },
  { name: "destructive-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "warning", value: { light: "#b45309", dark: "#f0b429" } },
  { name: "warning-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  // Money direction, fixed across palettes: green for positive balances, red for negative.
  { name: "positive", value: { light: "#16a34a", dark: "#22c55e" } },
  { name: "negative", value: { light: "#dc2626", dark: "#ef4444" } },
  { name: "info", value: { light: "#2563a8", dark: "#6aa8e8" } },
  { name: "info-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
];

export const PALETTE_NAMES = ["purple", "mono", "skyscanner", "sunset", "sunflower"] as const;
export type PaletteName = (typeof PALETTE_NAMES)[number];

const accent = (light: string, dark: string) => ({
  primary: { light, dark },
  accent: { light, dark },
});

// Overrides on top of TOKENS (which is the purple palette), from the Figma "Color/*" collections.
export const PALETTES: Record<PaletteName, Record<string, ThemedValue>> = {
  purple: {},
  mono: {
    ...accent("#0e0e0e", "#fefefe"),
    "primary-strong": { light: "#000000", dark: "#ffffff" },
    shadow: { light: "#0e0e0e0f", dark: "#00000059" },
    "primary-foreground": { light: "#fefefe", dark: "#0e0e0e" },
    "accent-foreground": { light: "#fefefe", dark: "#0e0e0e" },
    muted: { light: "#f2f2f2", dark: "#1a1a1a" },
    "dialog-header": { light: "#f2f2f2", dark: "#141414" },
    foreground: { light: "#0e0e0e", dark: "#fefefe" },
    "muted-foreground": { light: "#6b6b6b", dark: "#a3a3a3" },
    "icon-muted": { light: "#a3a3a3", dark: "#6b6b6b" },
    border: { light: "#e6e6e6", dark: "#2a2a2a" },
    "dialog-border": { light: "#e6e6e6", dark: "#262626" },
    "card-border": { light: "#efefef", dark: "#222222" },
  },
  // Skyscanner blue, with its navy as the strong shade.
  skyscanner: {
    ...accent("#0062e3", "#4d9bff"),
    "primary-strong": { light: "#05203c", dark: "#0062e3" },
    shadow: { light: "#05203c12", dark: "#00000059" },
    muted: { light: "#eff3f8", dark: "#1a1a1a" },
    "dialog-header": { light: "#eff3f8", dark: "#141414" },
    foreground: { light: "#161616", dark: "#f5f5f5" },
    "muted-foreground": { light: "#626971", dark: "#a3a3a3" },
    "icon-muted": { light: "#9ba3ad", dark: "#6b6b6b" },
    border: { light: "#e0e4e9", dark: "#2a2a2a" },
    "dialog-border": { light: "#e0e4e9", dark: "#262626" },
    "card-border": { light: "#edf0f4", dark: "#222222" },
  },
  sunset: {
    ...accent("#ea580c", "#fb923c"),
    "primary-strong": { light: "#9a3412", dark: "#c2410c" },
    shadow: { light: "#43140712", dark: "#00000059" },
  },
  sunflower: {
    ...accent("#ca8a04", "#facc15"),
    "primary-strong": { light: "#854d0e", dark: "#a16207" },
    shadow: { light: "#42200612", dark: "#00000059" },
  },
};

export function isThemed(value: TokenValue): value is ThemedValue {
  return typeof value !== "string";
}

export function resolve(
  name: string,
  theme: "light" | "dark",
  palette: PaletteName = "purple",
): string {
  const token = TOKENS.find((t) => t.name === name);
  if (!token) throw new Error(`Unknown token "${name}"`);
  const value = PALETTES[palette][name] ?? token.value;
  return isThemed(value) ? value[theme] : value;
}
