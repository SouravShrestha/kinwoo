import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import type { ReactNode } from "react";

import { useTheme } from "@/theme/ThemeProvider";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="text-sm text-muted-foreground">{title}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}

export function SettingsInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mt-2 h-14 flex-row items-center">
      <View className="w-9">{icon}</View>
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      <Text className="text-sm text-muted-foreground">{value}</Text>
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      className="h-14 flex-row items-center active:opacity-60 mt-2"
    >
      <View className="w-9">{icon}</View>
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      {value ? <Text className="mr-2 text-sm text-muted-foreground">{value}</Text> : null}
      <ArrowRightIcon size={16} color={palette.mutedForeground} />
    </Pressable>
  );
}
