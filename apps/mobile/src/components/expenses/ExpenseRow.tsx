import {
  expensePayersLabel,
  expenseYourShare,
  parseSpentOn,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatPaise, formatPickedDate } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";

const TONE_CLASS = {
  lent: "text-accent",
  borrowed: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

export function ExpenseRow({
  expense,
  currentUserId,
  onOpen,
}: {
  expense: Expense;
  currentUserId: string | null;
  onOpen: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const share = expenseYourShare(expense, currentUserId);
  const date = formatPickedDate(parseSpentOn(expense.spentOn));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.title}, ${formatPaise(expense.amountPaise)}, ${date}. ${share.label}`}
      onPress={onOpen}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-muted">
        <ExpenseCategoryIcon category={expense.category} size={22} color={palette.foreground} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-display-medium text-sm text-foreground">
          {expense.title}
        </Text>
        <Text numberOfLines={1} className="font-display-normal text-xs text-muted-foreground">
          {date} · {expensePayersLabel(expense, currentUserId)}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-display-medium text-sm text-foreground">
          {formatPaise(expense.amountPaise)}
        </Text>
        <Text className={`font-display-normal text-xs ${TONE_CLASS[share.tone]}`}>
          {share.label}
        </Text>
      </View>
    </Pressable>
  );
}
