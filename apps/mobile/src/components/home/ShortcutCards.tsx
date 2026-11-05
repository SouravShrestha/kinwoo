import { BagDollarIcon, BalancesIcon, PendingActiveIcon, SettleUpIcon } from "@kinwoo/icons/native";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { openBalances, openNewExpense, openSettleUp } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

export function ShortcutCards() {
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];
  const color = palette.primary;
  const shadow = { boxShadow: `0 2px 8px ${palette.shadow}` };

  return (
    <View className="flex-row gap-2.5">
      <ShortcutCard
        icon={<SettleUpIcon size={20} color={color} />}
        title={"Settle\nup"}
        shadow={shadow}
        onPress={openSettleUp}
      />
      <ShortcutCard
        icon={<BagDollarIcon size={16} color={color} />}
        title={"Add\nexpense"}
        shadow={shadow}
        onPress={openNewExpense}
      />
      <ShortcutCard
        icon={<PendingActiveIcon size={20} color={color} />}
        title={"Pending\nitems"}
        shadow={shadow}
        onPress={() => router.push("/tasks")}
      />
      <ShortcutCard
        icon={<BalancesIcon size={20} color={color} />}
        title={"Balance\nsummary"}
        shadow={shadow}
        onPress={openBalances}
      />
    </View>
  );
}

function ShortcutCard({
  icon,
  title,
  shadow,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  shadow: { boxShadow: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title.replace("\n", " ")}
      onPress={onPress}
      className="min-w-0 flex-1 items-center gap-2.5 py-1 active:opacity-80"
    >
      <View className="size-[60px] items-center justify-center rounded-full bg-card" style={shadow}>
        {icon}
      </View>
      <Text className="text-center font-display-medium text-xs leading-tight text-foreground">
        {title}
      </Text>
    </Pressable>
  );
}
