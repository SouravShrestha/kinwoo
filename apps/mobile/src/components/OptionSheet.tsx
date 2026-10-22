import { CheckIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";
import { Pressable } from "./Pressable";

export type SheetOption = {
  id: string;
  label: string;
  icon?: ReactNode | ((color: string) => ReactNode);
  detail?: string;
  dashed?: boolean;
};

export function OptionSheet({
  open,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  columns = 1,
  showTitle = true,
  scrollable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: readonly SheetOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  columns?: 1 | 2 | 3 | 4;
  showTitle?: boolean;
  scrollable?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const grid = columns > 1;
  const cellWidth = columns === 4 ? "w-1/4" : columns === 2 ? "w-1/2" : "w-1/3";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={title}
      scrollable={scrollable}
      maxHeight={scrollable ? 520 : undefined}
      minHeightRatio={grid ? 0.4 : undefined}
    >
      {showTitle ? (
        <Text
          accessibilityRole="header"
          className="mb-3 font-display-medium text-lg text-foreground"
        >
          {title}
        </Text>
      ) : null}
      <View className={grid ? "-mx-1.5 flex-row flex-wrap pb-4" : undefined}>
        {options.map((option) => {
          const selected = option.id === selectedId;
          const chip = grid && !option.icon;
          return (
            <View key={option.id} className={grid ? `${cellWidth} p-1.5` : undefined}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => onSelect(option.id)}
                className={
                  chip
                    ? `${columns > 2 ? "aspect-[5/4] " : ""}min-h-14 items-center justify-center rounded-xl px-1 py-2 active:opacity-70 ${
                        selected ? "bg-foreground" : "bg-muted"
                      }`
                    : grid
                      ? "items-center gap-2 rounded-xl px-1 py-3 active:opacity-70"
                      : "flex-row items-center gap-3 rounded-xl py-3 active:bg-muted"
                }
              >
                {option.icon ? (
                  <View
                    className={`items-center justify-center rounded-xl ${
                      grid ? "size-14" : "size-10"
                    } ${
                      option.dashed
                        ? "border border-dashed border-muted-foreground"
                        : grid && selected
                          ? "bg-foreground"
                          : "bg-muted"
                    }`}
                  >
                    {typeof option.icon === "function"
                      ? option.icon(grid && selected ? palette.background : palette.foreground)
                      : option.icon}
                  </View>
                ) : null}
                <Text
                  numberOfLines={1}
                  className={`font-display-normal ${
                    chip
                      ? "text-base leading-6"
                      : grid
                        ? "max-w-full text-center text-sm"
                        : "flex-1 text-base"
                  } ${
                    chip
                      ? selected
                        ? "text-background"
                        : "text-muted-foreground"
                      : selected
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </Text>
                {option.detail ? (
                  <Text
                    className={`font-display-normal text-xs leading-5 opacity-70 ${
                      selected ? "text-background" : "text-muted-foreground"
                    }`}
                  >
                    ({option.detail})
                  </Text>
                ) : null}
                {selected && !grid ? <CheckIcon size={14} color={palette.foreground} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
