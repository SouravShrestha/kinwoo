import {
  settlementSummary,
  spentOnFor,
  spentOnParts,
  type Settlement,
} from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { paymentImage } from "@/lib/images";

export function PaymentRow({
  settlement,
  currentUserId,
  onOpen,
}: {
  settlement: Settlement;
  currentUserId: string | null;
  onOpen: () => void;
}) {
  const summary = settlementSummary(settlement, currentUserId);
  const amount = formatPaise(summary.amountPaise);
  const { month, day } = spentOnParts(spentOnFor(new Date(settlement.createdAt)));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${summary.title} ${amount}, ${month} ${day}`}
      onPress={onOpen}
      className="flex-row items-center px-4 py-5 active:opacity-70"
    >
      <View className="w-8 items-center">
        <Text className="font-display-normal text-xs text-muted-foreground">{month}</Text>
        <Text className="font-display-normal text-lg leading-6 text-muted-foreground">{day}</Text>
      </View>
      <View className="ml-3 mr-4 size-10 items-center justify-center">
        <Image
          source={paymentImage}
          accessibilityIgnoresInvertColors
          contentFit="contain"
          style={{ width: 36, height: 36 }}
        />
      </View>
      <Text className="min-w-0 flex-1 font-display-normal text-sm text-foreground">
        {summary.title} <Text className="font-display-medium">{amount}</Text>
      </Text>
    </Pressable>
  );
}
