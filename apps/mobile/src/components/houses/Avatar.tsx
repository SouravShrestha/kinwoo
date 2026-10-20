import { memberInitial } from "@kinwoo/core/houses";
import { Image } from "expo-image";
import { Text, View } from "react-native";

export function Avatar({
  name,
  url,
  size = 40,
  tone = "muted",
}: {
  name: string | null;
  url: string | null;
  size?: number;
  tone?: "muted" | "background";
}) {
  const frame = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`items-center justify-center overflow-hidden ${
        tone === "background" ? "bg-background" : "bg-muted"
      }`}
      style={frame}
    >
      {url ? (
        // expo-image keeps avatars in a disk cache, so lists of members do not re-download them.
        <Image
          source={{ uri: url }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          cachePolicy="memory-disk"
          style={frame}
        />
      ) : (
        <Text className="font-medium text-foreground" style={{ fontSize: size * 0.4 }}>
          {memberInitial(name)}
        </Text>
      )}
    </View>
  );
}
