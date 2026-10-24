import { Image } from "expo-image";

import { itemCategoryImage } from "@/lib/images";

export function ItemCategoryImage({
  name,
  size,
}: {
  name: string | null | undefined;
  size: number;
}) {
  return (
    <Image
      source={itemCategoryImage(name)}
      accessibilityIgnoresInvertColors
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
