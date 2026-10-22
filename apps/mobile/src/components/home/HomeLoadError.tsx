import { Text, View } from "react-native";

import { Button } from "@/components/Button";

type HomeLoadErrorProps = {
  onRetry: () => void;
};

export function HomeLoadError({ onRetry }: HomeLoadErrorProps) {
  return (
    <View className="items-center">
      <Text className="text-center text-base text-muted-foreground">
        Couldn't load your houses.
      </Text>
      <Button className="mt-4 self-stretch" variant="outline" label="Try again" onPress={onRetry} />
    </View>
  );
}
