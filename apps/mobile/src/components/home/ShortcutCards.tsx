import { BagDollarIcon, BalancesIcon, PendingActiveIcon, SettleUpIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { openBalances, openNewExpense, openSettleUp } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

export function ShortcutCards() {
  const { resolvedTheme } = useTheme();
  const color = colors[resolvedTheme].foreground;

  return (
    <View className="gap-4">
      <View className="flex-row gap-4">
        <ShortcutCard
          icon={<SettleUpIcon size={16} color={color} />}
          title="Settle up"
          onPress={openSettleUp}
        />
        <ShortcutCard
          icon={<BagDollarIcon size={12.5} color={color} />}
          title="New expense"
          onPress={openNewExpense}
        />
      </View>
      <View className="flex-row gap-4">
        <ShortcutCard
          icon={<PendingActiveIcon size={16} color={color} />}
          title="Pending"
          onPress={() => router.push("/tasks")}
        />
        <ShortcutCard
          icon={<BalancesIcon size={16} color={color} />}
          title="Balances"
          onPress={openBalances}
        />
      </View>
    </View>
  );
}

function ShortcutCard({
  icon,
  title,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="flex-1 flex-row items-center gap-3.5 rounded-lg border border-border bg-card px-4 py-4 active:opacity-80"
    >
      {icon}
      <Text numberOfLines={1} className="shrink text-sm text-foreground font-display-normal">
        {title}
      </Text>
    </Pressable>
  );
}
