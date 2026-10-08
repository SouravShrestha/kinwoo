import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="font-display text-6xl text-foreground">404</Text>
      <Text className="mt-3 text-muted-foreground">This page doesn&apos;t exist.</Text>
      <Link
        href="/"
        replace
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
      >
        Go home
      </Link>
    </View>
  );
}
