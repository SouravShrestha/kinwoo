import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "./BottomSheet";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always the light theme" },
  { value: "dark", label: "Dark", hint: "Always the dark theme" },
  { value: "system", label: "System", hint: "Follow the device setting" },
];

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} label="Appearance" scrollable={false}>
      <Text className="font-display text-2xl text-foreground">Appearance</Text>

      <View className="mt-4">
        {OPTIONS.map((option) => {
          const selected = theme === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                setTheme(option.value);
                onClose();
              }}
              className="h-14 flex-row items-center active:opacity-60"
            >
              <View className="flex-1">
                <Text className="text-base text-foreground">{option.label}</Text>
                <Text className="text-xs text-muted-foreground">{option.hint}</Text>
              </View>
              {selected ? <Text className="text-base text-foreground">✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
