import { BalancesIcon, SettleUpIcon, TotalsIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { ScrollView, Text } from "react-native";

import { Pressable } from "@/components/Pressable";
import { openBalances, openSettleUp, openTotals } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

type Action = {
  label: string;
  primary: boolean;
  Icon: typeof SettleUpIcon;
  iconSize: number;
  onPress?: () => void;
};

const ACTIONS: readonly Action[] = [
  { label: "Settle up", primary: true, Icon: SettleUpIcon, iconSize: 16, onPress: openSettleUp },
  { label: "Balances", primary: false, Icon: BalancesIcon, iconSize: 16, onPress: openBalances },
  { label: "Totals", primary: false, Icon: TotalsIcon, iconSize: 13, onPress: openTotals },
];

export function ExpenseActions() {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2 px-6"
    >
      {ACTIONS.map(({ label, primary, Icon, iconSize, onPress }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={onPress ? undefined : "Coming soon"}
          onPress={onPress}
          className={`min-w-28 flex-row items-center justify-center gap-2 rounded-xl border px-5 py-2 ${
            primary ? "border-foreground bg-foreground" : "border-border bg-card"
          }`}
        >
          <Icon size={iconSize} color={primary ? palette.background : palette.foreground} />
          <Text
            className={`font-display-medium text-sm ${
              primary ? "text-background" : "text-foreground"
            }`}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
