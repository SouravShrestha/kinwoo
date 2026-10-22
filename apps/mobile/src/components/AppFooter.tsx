import { FOOTER_COPY } from "@kinwoo/core/app";
import { HeartIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import Constants from "expo-constants";
import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function AppFooter() {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <View className="pt-24">
      {FOOTER_COPY.tagline.map((word) => (
        <Text key={word} className="font-display text-4xl uppercase tracking-tight text-border">
          {word}
        </Text>
      ))}
      <View className="mt-4 flex-row items-center gap-2">
        <Text className="font-display-normal text-base uppercase text-muted-foreground">
          {FOOTER_COPY.madeWith}
        </Text>
        <HeartIcon size={18} color={palette.destructive} />
        <Text className="font-display-normal text-base uppercase text-muted-foreground">
          {FOOTER_COPY.madeIn}
        </Text>
      </View>
      <Text className="mt-3 font-display-normal text-base uppercase text-muted-foreground">
        {FOOTER_COPY.version(Constants.expoConfig?.version ?? "0.0.0")}
      </Text>
    </View>
  );
}
