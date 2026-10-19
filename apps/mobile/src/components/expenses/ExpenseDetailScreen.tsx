import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useDeleteExpense, useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import {
  canManageExpense,
  EXPENSE_CATEGORY_LABELS,
  expenseSourceLabel,
  expenseYourShare,
  parseSpentOn,
  shareWeightLabel,
  SPLIT_METHOD_TITLES,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatFullDate, formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { goBack, goHome, openEditExpense } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";

type PersonRow = { userId: string; name: string | null; amountPaise: number; detail?: string };

const TONE_CLASS = {
  lent: "text-accent",
  borrowed: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

function PeopleSection({
  title,
  rows,
  avatars,
  currentUserId,
}: {
  title: string;
  rows: readonly PersonRow[];
  avatars: ReadonlyMap<string, string | null>;
  currentUserId: string | null;
}) {
  return (
    <View className="gap-3">
      <Text
        accessibilityRole="header"
        className="font-display-medium text-sm text-muted-foreground"
      >
        {title}
      </Text>
      <View className="gap-2.5">
        {rows.map((row) => (
          <View key={row.userId} className="flex-row items-center gap-3">
            <Avatar name={row.name} url={avatars.get(row.userId) ?? null} size={32} />
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 font-display-normal text-base text-foreground"
            >
              {row.userId === currentUserId ? "You" : memberDisplayName(row.name)}
              {row.detail ? (
                <Text className="text-sm text-muted-foreground">{`  ${row.detail}`}</Text>
              ) : null}
            </Text>
            <Text className="font-display-medium text-base text-foreground">
              {formatPaise(row.amountPaise)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ExpenseDetails({
  expense,
  currentUserId,
  avatars,
  iconColor,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: ReadonlyMap<string, string | null>;
  iconColor: string;
}) {
  const share = expenseYourShare(expense, currentUserId);
  const source = expenseSourceLabel(expense);
  return (
    <View className="gap-8">
      <View className="items-center gap-3">
        <View className="size-14 items-center justify-center rounded-2xl bg-muted">
          <ExpenseCategoryIcon category={expense.category} size={30} color={iconColor} />
        </View>
        <Text
          accessibilityRole="header"
          className="text-center font-display-medium text-xl text-foreground"
        >
          {expense.title}
        </Text>
        <Text className="font-display-medium text-foreground" style={{ fontSize: 34 }}>
          {formatPaise(expense.amountPaise)}
        </Text>
        <Text className="font-display-normal text-sm text-muted-foreground">
          {EXPENSE_CATEGORY_LABELS[expense.category]} ·{" "}
          {formatFullDate(parseSpentOn(expense.spentOn).getTime())}
        </Text>
        <Text className={`font-display-normal text-sm ${TONE_CLASS[share.tone]}`}>
          {share.label}
        </Text>
      </View>

      {expense.note ? (
        <Text className="rounded-xl bg-muted px-4 py-3 font-display-normal text-base text-foreground">
          {expense.note}
        </Text>
      ) : null}

      <PeopleSection
        title="Paid by"
        rows={expense.payers}
        avatars={avatars}
        currentUserId={currentUserId}
      />
      <PeopleSection
        title={SPLIT_METHOD_TITLES[expense.splitMethod]}
        rows={expense.shares.map((entry) => ({
          userId: entry.userId,
          name: entry.name,
          amountPaise: entry.sharePaise,
          detail: shareWeightLabel(expense, entry.weight) ?? undefined,
        }))}
        avatars={avatars}
        currentUserId={currentUserId}
      />

      <Text className="font-display-normal text-xs text-muted-foreground">
        {source ? `${source}. ` : ""}Added by{" "}
        {expense.createdBy === currentUserId ? "you" : memberDisplayName(expense.createdByName)}.
      </Text>
    </View>
  );
}

export function ExpenseDetailScreen({ expenseId }: { expenseId: string | null }) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: expense, isError } = useExpense(houseId, expenseId);
  const { data: members } = useHouseMembers(houseId);
  const deleteExpense = useDeleteExpense(houseId ?? "");

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId) goHome();
  }, [ready, activeHouse, expenseId]);

  const avatars = new Map((members ?? []).map((member) => [member.userId, member.avatarUrl]));
  const canManage =
    !!expense && canManageExpense(expense, currentUserId, activeHouse?.role === "admin");

  const handleDelete = async () => {
    if (!expense) return;
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success(`Deleted "${expense.title}"`);
      setConfirmDelete(false);
      goBack();
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't delete that expense. Try again."));
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-6" style={{ paddingTop: insets.top + 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={12}
          className="size-10 items-start justify-center"
        >
          <View style={{ transform: [{ rotate: "90deg" }] }}>
            <ArrowRightIcon size={28} color={palette.foreground} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {expense ? (
          <>
            <ExpenseDetails
              expense={expense}
              currentUserId={currentUserId}
              avatars={avatars}
              iconColor={palette.foreground}
            />
            {canManage ? (
              <View className="mt-10 flex-row gap-3">
                <Button
                  label="Edit"
                  variant="outline"
                  className="flex-1"
                  onPress={() => openEditExpense(expense.id)}
                />
                <Button
                  label="Delete"
                  variant="destructive"
                  className="flex-1"
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            ) : null}
          </>
        ) : isError ? (
          <Text className="pt-16 text-center font-display-normal text-base text-muted-foreground">
            We couldn&apos;t find that expense. It may have been deleted.
          </Text>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deleteExpense}
        isPending={deleteExpense.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}
