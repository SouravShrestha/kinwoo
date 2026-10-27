import { Image } from "expo-image";

import { listIconImage } from "@/lib/images";

export function ListIconImage({ label, size }: { label: string; size: number }) {
  return (
    <Image
      source={listIconImage(label)}
      accessibilityIgnoresInvertColors
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
