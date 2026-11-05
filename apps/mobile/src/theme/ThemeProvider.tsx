import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cssVarNames,
  palettes,
  PALETTE_NAMES,
  type ColorName,
  type PaletteName,
} from "@kinwoo/tokens/native";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { vars } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useSystemColorScheme, View } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  palette: PaletteName;
  /** Light and dark colours of the active palette; index with resolvedTheme. */
  colors: (typeof palettes)[PaletteName];
  themeStyle: ReturnType<typeof themeVars>;
  setTheme: (theme: ThemePreference) => void;
  setPalette: (palette: PaletteName) => void;
  /** Whether a palette is stored on this device; null until storage has been read. */
  hasPreference: boolean | null;
  /** Forgets the stored appearance and returns to the signed-out default. */
  resetAppearance: () => void;
}

const STORAGE_KEY = "kinwoo.theme";
const PALETTE_KEY = "kinwoo.palette";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function themeVars(colors: Record<ColorName, string>) {
  const out: Record<string, string> = {};
  for (const name of Object.keys(cssVarNames) as ColorName[]) {
    out[cssVarNames[name]] = colors[name];
  }
  return vars(out);
}

const THEME_VARS = Object.fromEntries(
  PALETTE_NAMES.map((p) => [
    p,
    { light: themeVars(palettes[p].light), dark: themeVars(palettes[p].dark) },
  ]),
) as Record<PaletteName, Record<"light" | "dark", ReturnType<typeof themeVars>>>;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [palette, setPaletteState] = useState<PaletteName>("mono");
  const [hasPreference, setHasPreference] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([STORAGE_KEY, PALETTE_KEY]).then(([[, stored], [, storedPalette]]) => {
      if (!active) return;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
      const known = PALETTE_NAMES.includes(storedPalette as PaletteName);
      if (known) setPaletteState(storedPalette as PaletteName);
      setHasPreference(known);
    });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const setPalette = useCallback((next: PaletteName) => {
    setPaletteState(next);
    setHasPreference(true);
    void AsyncStorage.setItem(PALETTE_KEY, next);
  }, []);

  const resetAppearance = useCallback(() => {
    setThemeState("system");
    setPaletteState("mono");
    setHasPreference(false);
    void AsyncStorage.multiRemove([STORAGE_KEY, PALETTE_KEY]);
  }, []);

  const colors = palettes[palette];

  const resolvedTheme = theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      palette,
      colors,
      themeStyle: THEME_VARS[palette][resolvedTheme],
      setTheme,
      setPalette,
      hasPreference,
      resetAppearance,
    }),
    [theme, resolvedTheme, palette, colors, setTheme, setPalette, hasPreference, resetAppearance],
  );

  const navigationTheme = useMemo(() => {
    const base = resolvedTheme === "dark" ? DarkTheme : DefaultTheme;
    const palette = colors[resolvedTheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.background,
        card: palette.background,
        border: palette.border,
        text: palette.foreground,
      },
    };
  }, [resolvedTheme, colors]);

  // Navigators paint screens and the native window paints behind them during transitions; both
  // default to light, which flashes white in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors[resolvedTheme].background);
  }, [resolvedTheme, colors]);

  // CSS variables come from React state so className colours switch in the same render as the
  // JS palette. Never override Appearance: useColorScheme() would then hide the device setting.
  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <View
          className="flex-1"
          style={[value.themeStyle, { backgroundColor: colors[resolvedTheme].background }]}
        >
          <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
          {children}
        </View>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
