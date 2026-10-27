import {
  expensePayersLabel,
  expenseShareSummary,
  parseSpentOn,
  spentOnParts,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatPaise, formatPickedDate } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import { ExpenseCategoryImage } from "./ExpenseCategoryImage";

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
  const share = expenseShareSummary(expense, currentUserId);
  const shareAmount = share.amountPaise === null ? null : formatPaise(share.amountPaise);
  const { month, day } = spentOnParts(expense.spentOn);
  const payers = expensePayersLabel(expense, currentUserId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.title}, ${formatPickedDate(parseSpentOn(expense.spentOn))}. ${payers}. ${share.label}${shareAmount ? ` ${shareAmount}` : ""}`}
      onPress={onOpen}
      className="flex-row items-center px-4 py-5 active:opacity-70"
    >
      <View className="w-8 items-center">
        <Text className="font-display-normal text-xs text-muted-foreground">{month}</Text>
        <Text className="font-display-normal text-lg leading-6 text-muted-foreground">{day}</Text>
      </View>
      <View className="ml-3 mr-4 size-10 items-center justify-center rounded-lg bg-muted">
        <ExpenseCategoryImage category={expense.category} size={30} />
      </View>
      <View className="mr-3 min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-display-normal text-base text-foreground">
          {expense.title}
        </Text>
        <Text numberOfLines={1} className="font-display-normal text-xs text-muted-foreground">
          {payers}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className={`font-display-normal text-[11px] ${TONE_CLASS[share.tone]}`}>
          {share.label}
        </Text>
        {shareAmount ? (
          <Text className={`font-display-medium text-base ${TONE_CLASS[share.tone]}`}>
            {shareAmount}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
