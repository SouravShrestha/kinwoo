import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import type { ReactNode } from "react";
import { Image, Text, useWindowDimensions, View } from "react-native";

import { noItems } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const IMAGE_ASPECT_RATIO = 512 / 288;
const IMAGE_WIDTH_RATIO = 0.6;
const IMAGE_MAX_WIDTH = 224;

export function EmptyItems({ title, hint, children }: GroceryEmptyCopy & { children?: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const imageWidth = Math.min(windowWidth * IMAGE_WIDTH_RATIO, IMAGE_MAX_WIDTH);

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Image
        source={noItems}
        tintColor={colors[resolvedTheme].foreground}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ width: imageWidth, height: imageWidth / IMAGE_ASPECT_RATIO }}
        className="mb-2"
      />
      <Text className="text-center text-base text-foreground font-display-normal">{title}</Text>
      {hint ? (
        <Text className="mt-2 text-center text-base text-muted-foreground font-display-normal">
          {hint}
        </Text>
      ) : null}
      {children ? <View className="mt-6">{children}</View> : null}
    </View>
  );
}
