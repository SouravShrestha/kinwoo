export interface ThemedValue {
  light: string;
  dark: string;
}

export type TokenValue = string | ThemedValue;

export interface Token {
  name: string;
  value: TokenValue;
}

export const RADIUS_REM = 0.6;

export const TOKENS: Token[] = [
  { name: "background", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "sheet", value: { light: "#fefefe", dark: "#161616" } },
  { name: "foreground", value: { light: "#0e0e0e", dark: "#fefefe" } },
  { name: "card", value: { light: "#fbfbfb", dark: "#1a1a1a" } },
  { name: "muted", value: { light: "#f1f1f1", dark: "#1a1a1a" } },
  { name: "muted-foreground", value: { light: "#6b6b6b", dark: "#9a9a9a" } },
  { name: "border", value: { light: "#e5e5e5", dark: "#262626" } },
  { name: "primary", value: { light: "#0e0e0e", dark: "#fefefe" } },
  { name: "primary-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "accent", value: { light: "#4e8e60", dark: "#5ea771" } },
  { name: "accent-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "destructive", value: { light: "#c0392b", dark: "#e06a5c" } },
  { name: "destructive-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "warning", value: { light: "#b45309", dark: "#f0b429" } },
  { name: "warning-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
  { name: "info", value: { light: "#2563a8", dark: "#6aa8e8" } },
  { name: "info-foreground", value: { light: "#fefefe", dark: "#0e0e0e" } },
];

export function isThemed(value: TokenValue): value is ThemedValue {
  return typeof value !== "string";
}

export function resolve(name: string, theme: "light" | "dark"): string {
  const token = TOKENS.find((t) => t.name === name);
  if (!token) throw new Error(`Unknown token "${name}"`);
  return isThemed(token.value) ? token.value[theme] : token.value;
}
