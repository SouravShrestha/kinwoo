import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import { router } from "expo-router";
import { Image, Text, View } from "react-native";

import { BalanceLine } from "@/components/expenses/BalanceSummary";
import { Pressable } from "@/components/Pressable";
import { sharedBill } from "@/lib/images";

const IMAGE_ASPECT_RATIO = 1000 / 529;

const LEAD = {
  owed: "Across all your shared bills, you're owed",
  owe: "Across all your shared bills, you owe",
} as const;

export function BalanceCard({ balances }: { balances: HouseBalances }) {
  const text = balanceHeadlineParts(balances);
  const lead = text.tone === "neutral" ? text.before.trim() : LEAD[text.tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${balanceHeadline(balances)}. Open bills`}
      onPress={() => router.push("/bills")}
      className="w-full flex-row items-stretch overflow-hidden rounded-lg border border-border bg-card active:opacity-80"
    >
      <Image
        source={sharedBill}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
        className="-ml-2 w-[45%] self-end -mb-2"
      />
      <View className="flex-1 justify-between -ml-12 gap-4 py-6 pl-2 pr-5">
        <Text className="font-display-normal text-sm text-right text-muted-foreground">{lead}</Text>
        {text.amount ? (
          <BalanceLine
            text={{ ...text, before: "", after: "" }}
            className="font-display-normal text-xl text-right text-foreground"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
