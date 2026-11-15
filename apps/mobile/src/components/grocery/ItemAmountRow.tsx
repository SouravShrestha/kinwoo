import { RupeeIcon } from "@kinwoo/icons/native";
import { Text, TextInput, View } from "react-native";

import { ItemCategoryImage } from "@/components/grocery/ItemCategoryImage";
import { useTheme } from "@/theme/ThemeProvider";

// One item of a batch purchase with its own amount field.
export function ItemAmountRow({
  name,
  detail,
  categoryName,
  value,
  error,
  onChange,
  onFocus,
}: {
  name: string;
  detail?: string;
  categoryName: string | null;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];
  return (
    <View>
      <View className="flex-row items-center gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="size-12 items-center justify-center rounded-xl bg-muted"
        >
          <ItemCategoryImage name={categoryName} size={40} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-display-normal text-base text-foreground">
            {name}
          </Text>
          {detail ? (
            <Text numberOfLines={1} className="font-display-normal text-sm text-muted-foreground">
              {detail}
            </Text>
          ) : null}
        </View>
        <View className="h-12 w-28 flex-row items-center gap-1.5 rounded-xl bg-muted px-3">
          <RupeeIcon size={14} color={palette.mutedForeground} />
          <TextInput
            accessibilityLabel={`Amount for ${name}`}
            accessibilityHint={error ?? undefined}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={palette.mutedForeground}
            selectionColor={palette.primary}
            onFocus={onFocus}
            value={value}
            onChangeText={onChange}
            className="h-12 min-w-0 flex-1 text-right font-display-normal text-foreground"
            style={{ fontSize: 16, paddingVertical: 0 }}
          />
        </View>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 text-right font-display-normal text-sm text-destructive"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
