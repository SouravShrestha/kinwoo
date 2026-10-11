import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, cssVarNames, type ColorName } from "@kinwoo/tokens/native";
import { StatusBar } from "expo-status-bar";
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
  themeStyle: (typeof THEME_VARS)["light" | "dark"];
  setTheme: (theme: ThemePreference) => void;
}

const STORAGE_KEY = "kinwoo.theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function themeVars(theme: "light" | "dark") {
  const out: Record<string, string> = {};
  for (const name of Object.keys(cssVarNames) as ColorName[]) {
    out[cssVarNames[name]] = colors[theme][name];
  }
  return vars(out);
}

const THEME_VARS = { light: themeVars("light"), dark: themeVars("dark") } as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedTheme = theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, themeStyle: THEME_VARS[resolvedTheme], setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  // CSS variables come from React state so className colours switch in the same render as the
  // JS palette. Never override Appearance: useColorScheme() would then hide the device setting.
  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={value.themeStyle}>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
