import { AutoThemeIcon, MoonIcon, SunIcon, type IconProps } from "@kinwoo/icons/native";
import { PALETTE_NAMES, palettes, radius, type PaletteName } from "@kinwoo/tokens/native";
import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { usePathname } from "expo-router";
import { useEffect, useState, type ComponentType } from "react";
import { Text, useColorScheme, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";

type Scheme = "light" | "dark";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: ComponentType<IconProps>;
  preview: (deviceScheme: Scheme) => Scheme;
}[] = [
  { value: "system", label: "System", Icon: AutoThemeIcon, preview: (device) => device },
  { value: "dark", label: "Dark", Icon: MoonIcon, preview: () => "dark" },
  { value: "light", label: "Light", Icon: SunIcon, preview: () => "light" },
];

const PALETTE_LABELS: Record<PaletteName, string> = {
  purple: "Purple",
  mono: "Mono",
  skyscanner: "Skyscanner",
  sunset: "Sunset",
  sunflower: "Sunflower",
};

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, resolvedTheme, setTheme, colors, palette: paletteName, setPalette } = useTheme();
  const deviceScheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
  const palette = colors[resolvedTheme];

  return (
    <BottomSheet open={open} onClose={onClose} label="Appearance" scrollable={false} showClose>
      <Text className="pr-10 font-display-medium text-xl text-foreground">Choose your theme</Text>

      <View accessibilityRole="radiogroup" className="-mx-1.5 mt-9 flex-row pb-6">
        {OPTIONS.map(({ value, label, Icon, preview }) => {
          const selected = theme === value;
          const tile = colors[preview(deviceScheme)];

          return (
            <View key={value} className="flex-1 px-1.5">
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={label}
                onPress={() => {
                  setTheme(value);
                  onClose();
                }}
                className="h-28 justify-between overflow-hidden px-3 pb-3 pt-4 active:opacity-80"
                style={{
                  backgroundColor: tile.background,
                  borderColor: palette.border,
                  borderRadius: radius.md,
                  borderWidth: 1,
                }}
              >
                <Icon size={16} color={tile.foreground} />
                <Text className="text-base font-medium" style={{ color: tile.foreground }}>
                  {label}
                </Text>
                {selected ? (
                  <View
                    className="absolute inset-x-0 bottom-0 h-1"
                    style={{ backgroundColor: palette.accent }}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text className="text-base font-medium text-foreground">Colour</Text>
      <View accessibilityRole="radiogroup" className="mt-4 flex-row gap-4 pb-6">
        {PALETTE_NAMES.map((name) => {
          const selected = paletteName === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={PALETTE_LABELS[name]}
              onPress={() => setPalette(name)}
              hitSlop={6}
              className="size-12 items-center justify-center rounded-full active:opacity-80"
              style={{ borderWidth: 2, borderColor: selected ? palette.primary : "transparent" }}
            >
              <View
                className="size-10 flex-row overflow-hidden rounded-full"
                style={{ borderWidth: 1, borderColor: palette.border }}
              >
                <View className="flex-1" style={{ backgroundColor: palettes[name].light.accent }} />
                <View className="flex-1" style={{ backgroundColor: palettes[name].dark.accent }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** Lets the post-login screen settle before the sheet appears. */
const PROMPT_DELAY_MS = 800;

// Signed out is always mono. After sign-in, asks once per device until a palette is stored;
// signing out forgets it.
export function ThemePrompt() {
  const { ready, isLoggedIn } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const { hasPreference, theme, palette, setPalette, resetAppearance } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A theme can be stored without a palette (picked in Profile before palettes existed), so
  // both are checked. Waits for storage to be read, or the read would restore what was reset.
  useEffect(() => {
    if (!ready || isLoggedIn || hasPreference === null) return;
    if (hasPreference || theme !== "system") resetAppearance();
  }, [ready, isLoggedIn, hasPreference, theme, resetAppearance]);

  const eligible =
    ready &&
    isLoggedIn &&
    profileReady &&
    !needsDisplayName &&
    hasPreference === false &&
    pathname !== "/login";

  useEffect(() => {
    if (!eligible) return;
    const timer = setTimeout(() => {
      // Stored on show so a dismiss counts as answered.
      setPalette(palette);
      setOpen(true);
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible, palette, setPalette]);

  return <AppearanceSheet open={open} onClose={() => setOpen(false)} />;
}
