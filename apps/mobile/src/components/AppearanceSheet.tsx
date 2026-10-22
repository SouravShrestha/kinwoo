import { AutoThemeIcon, MoonIcon, SunIcon, type IconProps } from "@kinwoo/icons/native";
import { colors, radius } from "@kinwoo/tokens/native";
import type { ComponentType } from "react";
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

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
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
    </BottomSheet>
  );
}
