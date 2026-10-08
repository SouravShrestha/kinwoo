import { APP_NAME } from "@kinwoo/core/app";
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="font-display text-5xl text-foreground">{APP_NAME}</Text>
      <Text className="mt-3 text-muted-foreground">Coming soon</Text>
    </View>
  );
}
