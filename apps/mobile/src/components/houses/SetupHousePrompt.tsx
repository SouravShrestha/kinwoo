import { BuildIcon, CodeIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { useTheme } from "@/theme/ThemeProvider";

type SetupHousePromptProps = {
  onCreate: () => void;
  onJoin: () => void;
  level?: boolean;
};

type ActionCardProps = {
  label: string;
  accessibilityLabel: string;
  align: "left" | "right";
  onPress: () => void;
  background?: ReactNode;
  backgroundClassName?: string;
  labelAtTop?: boolean;
  className?: string;
};

function ActionCard({
  label,
  accessibilityLabel,
  align,
  onPress,
  background,
  backgroundClassName = "-right-1 -top-1",
  labelAtTop = false,
  className,
}: ActionCardProps) {
  const isRight = align === "right";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={`flex-1 ${labelAtTop ? "justify-start" : "justify-end"} overflow-hidden rounded-lg border border-border bg-card p-4 active:opacity-80 ${className ?? ""}`}
    >
      {background ? (
        <View
          pointerEvents="none"
          className={`absolute ${backgroundClassName}`}
          style={{ transform: [{ rotate: "0deg" }] }}
        >
          {background}
        </View>
      ) : null}
      <Text
        className={`font-display-normal text-xl leading-7 text-foreground ${isRight ? "text-right" : "text-left"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SetupHousePrompt({ onCreate, onJoin, level = false }: SetupHousePromptProps) {
  const { resolvedTheme } = useTheme();

  return (
    <View className="w-full flex-1 justify-center">
      <View className="w-full flex-row items-start gap-5">
        <ActionCard
          label={"Build\na house"}
          accessibilityLabel="Build a house"
          align="left"
          onPress={onCreate}
          background={<BuildIcon size={84} color={colors[resolvedTheme].foreground} />}
          backgroundClassName="-bottom-4 right-3"
          labelAtTop
          className={level ? "aspect-square" : "mt-14 aspect-square"}
        />
        <ActionCard
          label={"I have\na code"}
          accessibilityLabel="I have a code"
          align="right"
          onPress={onJoin}
          background={<CodeIcon size={56} color={colors[resolvedTheme].foreground} />}
          backgroundClassName="left-4 -top-2"
          className="aspect-square"
        />
      </View>
    </View>
  );
}
