import { Text, View } from "react-native";

export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-10">
      <Text className="font-display text-2xl text-foreground">{title}</Text>
      <Text className="mt-2 text-center text-muted-foreground">{description}</Text>
    </View>
  );
}
