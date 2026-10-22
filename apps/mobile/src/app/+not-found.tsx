import { NOT_FOUND_COPY } from "@kinwoo/core/app";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-6xl text-foreground font-display-medium">{NOT_FOUND_COPY.code}</Text>
      <Text className="mt-6 text-center text-base text-foreground font-display-normal">
        {NOT_FOUND_COPY.title}
      </Text>
      <Text className="mt-4 max-w-xs text-center text-base text-muted-foreground font-display-normal">
        {NOT_FOUND_COPY.hint}
      </Text>
      <Button
        label={NOT_FOUND_COPY.action}
        onPress={() => router.replace("/")}
        className="mt-8 w-full max-w-sm"
      />
    </View>
  );
}
