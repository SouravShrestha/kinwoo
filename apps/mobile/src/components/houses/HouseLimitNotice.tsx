import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { goHome } from "@/lib/house-navigation";

export function HouseLimitNotice({ message }: { message: string }) {
  return (
    <View className="pt-4">
      <Text className="text-base leading-6 text-muted-foreground font-display-normal">
        {message}
      </Text>
      <Button className="mt-10" label="Go home" onPress={goHome} />
    </View>
  );
}
