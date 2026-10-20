import type { ListItemsWithHistory } from "@kinwoo/client/grocery";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

// Recent purchases load with the list; this reaches further back one page at a time.
export function OlderPurchasesButton({
  history,
}: {
  history: Pick<ListItemsWithHistory, "hasOlder" | "loadingOlder" | "loadOlder">;
}) {
  if (!history.hasOlder) return null;

  return (
    <View className="mt-6 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: history.loadingOlder }}
        disabled={history.loadingOlder}
        onPress={history.loadOlder}
        className={`rounded-lg px-3 py-2 ${history.loadingOlder ? "opacity-50" : "active:opacity-70"}`}
      >
        <Text className="text-sm text-foreground font-display-medium">
          {history.loadingOlder ? "Loading…" : "Show older purchases"}
        </Text>
      </Pressable>
    </View>
  );
}
