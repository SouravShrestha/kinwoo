import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { BalanceLine } from "@/components/expenses/BalanceSummary";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export function BalanceCard({ balances }: { balances: HouseBalances }) {
  const { resolvedTheme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${balanceHeadline(balances)}. Open bills`}
      onPress={() => router.push("/bills")}
      className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 active:opacity-70"
    >
      <View className="flex-1">
        <Text className="font-display-normal text-xs text-muted-foreground">Balance</Text>
        <BalanceLine
          text={balanceHeadlineParts(balances)}
          className="mt-0.5 font-display-normal text-base text-foreground"
        />
      </View>
      <ArrowRightIcon size={16} color={colors[resolvedTheme].mutedForeground} />
    </Pressable>
  );
}
