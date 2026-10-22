import {
  balanceHeadlineParts,
  pairBalanceParts,
  unsettledPairs,
  type BalanceText,
  type HouseBalances,
} from "@kinwoo/core/expenses";
import { Text, View } from "react-native";

import { Avatar } from "@/components/houses/Avatar";

const AMOUNT_TONE = {
  owed: "text-accent",
  owe: "text-destructive",
  neutral: "text-foreground",
} as const;

export function BalanceLine({ text, className }: { text: BalanceText; className: string }) {
  return (
    <Text className={className}>
      {text.before}
      {text.amount ? (
        <Text className={`font-display-medium ${AMOUNT_TONE[text.tone]}`}>{text.amount}</Text>
      ) : null}
      {text.after}
    </Text>
  );
}

export function BalanceSummary({ balances }: { balances: HouseBalances }) {
  const pairs = unsettledPairs(balances);
  return (
    <View>
      <View accessibilityRole="header">
        <BalanceLine
          text={balanceHeadlineParts(balances)}
          className="font-display-normal text-xl text-foreground"
        />
      </View>
      {pairs.length > 0 ? (
        <View className="mt-5 gap-4">
          {pairs.map((pair) => (
            <View key={pair.userId} className="flex-row items-center gap-3">
              <Avatar name={pair.name} url={pair.avatarUrl} size={20} />
              <BalanceLine
                text={pairBalanceParts(pair)}
                className="flex-1 font-display-normal text-sm text-foreground"
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
