import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      {leading ? <View className="mr-3">{leading}</View> : null}
      <View className="flex-1">
        <Text className="text-base text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (!onPress) return <View className="min-h-16 flex-row items-center py-2">{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className="min-h-16 flex-row items-center py-2 active:opacity-60"
    >
      {content}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-10 items-center justify-center rounded-full border px-4 ${
        selected ? "border-primary bg-primary" : "border-border bg-background"
      } active:opacity-80`}
    >
      <Text className={`text-sm ${selected ? "text-primary-foreground" : "text-foreground"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-destructive">
      {message}
    </Text>
  );
}
