import { LIST_ICON_OPTIONS } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { View } from "react-native";

import { CategoryIcon } from "@kinwoo/icons/native";

import { SheetHeader } from "@/components/houses/SheetHeader";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export function ListIconPicker({
  selected,
  onSelect,
  onBack,
}: {
  selected: string;
  onSelect: (icon: string) => void;
  onBack: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <View>
      <SheetHeader onBack={onBack} />

      <View className="-mx-1.5 mt-6 flex-row flex-wrap">
        {LIST_ICON_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <View key={option.value} className="w-1/3 p-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(option.value)}
                className="items-center rounded-xl px-1 py-3 active:opacity-70"
              >
                <View
                  className={`size-14 items-center justify-center rounded-xl ${
                    isSelected ? "bg-foreground" : "bg-muted"
                  }`}
                >
                  <CategoryIcon
                    name={option.label}
                    size={32}
                    color={isSelected ? palette.background : palette.foreground}
                  />
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
