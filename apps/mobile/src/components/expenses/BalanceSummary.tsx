import {
  balanceHeadline,
  pairBalanceLabel,
  unsettledPairs,
  type HouseBalances,
} from "@kinwoo/core/expenses";
import { Text, View } from "react-native";

import { Avatar } from "@/components/houses/Avatar";

export function BalanceSummary({ balances }: { balances: HouseBalances }) {
  const pairs = unsettledPairs(balances);
  const headlineTone =
    balances.netPaise > 0
      ? "text-accent"
      : balances.netPaise < 0
        ? "text-destructive"
        : "text-foreground";
  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <Text accessibilityRole="header" className={`font-display-medium text-lg ${headlineTone}`}>
        {balanceHeadline(balances)}
      </Text>
      {pairs.length > 0 ? (
        <View className="mt-3 gap-2.5">
          {pairs.map((pair) => (
            <View key={pair.userId} className="flex-row items-center gap-3">
              <Avatar name={pair.name} url={pair.avatarUrl} size={28} />
              <Text
                className={`font-display-normal text-sm ${
                  pair.netPaise > 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                {pairBalanceLabel(pair)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
