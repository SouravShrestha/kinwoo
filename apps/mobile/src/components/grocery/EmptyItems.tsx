import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";
import type { ReactNode } from "react";
import { Image, Text, View } from "react-native";

const IMAGE_SIZE = 160;

export function EmptyItems({
  image,
  title,
  hint,
  children,
}: Omit<GroceryEmptyCopy, "hint"> & {
  hint?: string | null;
  image: number;
  children?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Image
        source={image}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
      />
      <Text className="text-center text-base text-foreground font-display-normal mt-3">
        {title}
      </Text>
      {hint ? (
        <Text className="mt-2 text-center text-base text-muted-foreground font-display-normal">
          {hint}
        </Text>
      ) : null}
      {children ? <View className="mt-6">{children}</View> : null}
    </View>
  );
}
