import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useDeleteExpense, useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { canManageExpense, type Expense } from "@kinwoo/core/expenses";
import { formatFullDate, formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon, EditIcon, NoteIcon, TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack, goHome, openEditExpense } from "@/lib/house-navigation";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";

const ROOT_AVATAR = 36;
const SHARE_ROW_HEIGHT = 48;
const PAYER_LINK_HEIGHT = 28;

function PersonLine({
  name,
  userId,
  currentUserId,
  avatarUrl,
  verb,
  amountPaise,
  size,
  muted = false,
}: {
  name: string | null;
  userId: string;
  currentUserId: string | null;
  avatarUrl: string | null;
  verb: readonly [self: string, other: string];
  amountPaise: number;
  size: number;
  muted?: boolean;
}) {
  const isSelf = userId === currentUserId;
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <Avatar name={name} url={avatarUrl} size={size} />
      <Text
        numberOfLines={1}
        className={`min-w-0 flex-1 font-display-normal ${
          muted ? "text-sm text-muted-foreground" : "text-base text-foreground"
        }`}
      >
        {isSelf ? "You" : memberDisplayName(name)} {isSelf ? verb[0] : verb[1]}{" "}
        {formatPaise(amountPaise)}
      </Text>
    </View>
  );
}

// The trunk runs down from the payer's avatar; each share branches off it and the last one
// ends the trunk.
function ShareTree({
  expense,
  currentUserId,
  avatars,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: ReadonlyMap<string, string | null>;
}) {
  return (
    <View style={{ marginLeft: ROOT_AVATAR / 2 }}>
      {expense.shares.map((share, index) => {
        const last = index === expense.shares.length - 1;
        return (
          <View
            key={share.userId}
            className="flex-row items-center"
            style={{ height: SHARE_ROW_HEIGHT }}
          >
            <View className="h-full w-5">
              <View
                className="absolute left-0 top-0 w-px bg-border"
                style={{ bottom: last ? "50%" : 0 }}
              />
              <View className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </View>
            <PersonLine
              name={share.name}
              userId={share.userId}
              amountPaise={share.sharePaise}
              currentUserId={currentUserId}
              avatarUrl={avatars.get(share.userId) ?? null}
              verb={["owe", "owes"]}
              size={26}
              muted
            />
          </View>
        );
      })}
    </View>
  );
}

function ActorLine({
  label,
  userId,
  name,
  at,
  currentUserId,
  avatars,
}: {
  label: string;
  userId: string;
  name: string | null;
  at: string;
  currentUserId: string | null;
  avatars: ReadonlyMap<string, string | null>;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Avatar name={name} url={avatars.get(userId) ?? null} size={20} />
      <Text
        numberOfLines={1}
        className="min-w-0 flex-1 font-display-normal text-sm text-muted-foreground"
      >
        {label} by {userId === currentUserId ? "you" : memberDisplayName(name)} on{" "}
        {formatFullDate(new Date(at).getTime())}
      </Text>
    </View>
  );
}

function ExpenseDetails({
  expense,
  currentUserId,
  avatars,
  iconColor,
  mutedColor,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: ReadonlyMap<string, string | null>;
  iconColor: string;
  mutedColor: string;
}) {
  return (
    <View className="gap-7">
      <View className="flex-row gap-4">
        <View className="size-16 items-center justify-center rounded-xl bg-muted">
          <ExpenseCategoryIcon category={expense.category} size={32} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <Text accessibilityRole="header" className="font-display-medium text-lg text-foreground">
            {expense.title}
          </Text>
          <Text className="font-display-medium text-foreground" style={{ fontSize: 28 }}>
            {formatPaise(expense.amountPaise)}
          </Text>
        </View>
      </View>

      <View className="gap-4">
        <ActorLine
          label="Added"
          userId={expense.createdBy}
          name={expense.createdByName}
          at={expense.createdAt}
          currentUserId={currentUserId}
          avatars={avatars}
        />
        {expense.updatedBy ? (
          <ActorLine
            label="Last edited"
            userId={expense.updatedBy}
            name={expense.updatedByName}
            at={expense.updatedAt}
            currentUserId={currentUserId}
            avatars={avatars}
          />
        ) : null}
        {expense.note ? (
          <View className="flex-row items-start gap-3">
            <View className="pt-0.5">
              <NoteIcon size={18} color={mutedColor} />
            </View>
            <Text className="min-w-0 flex-1 font-display-normal text-base text-foreground">
              {expense.note}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="my-1 h-px bg-border" />

      <View>
        {expense.payers.map((payer, index) => (
          <View key={payer.userId}>
            {index > 0 ? (
              <View
                className="py-2"
                style={{ height: PAYER_LINK_HEIGHT, marginLeft: ROOT_AVATAR / 2 }}
              >
                <View className="w-px flex-1 bg-border" />
              </View>
            ) : null}
            <View className="flex-row">
              <PersonLine
                {...payer}
                currentUserId={currentUserId}
                avatarUrl={avatars.get(payer.userId) ?? null}
                verb={["paid", "paid"]}
                size={ROOT_AVATAR}
              />
            </View>
          </View>
        ))}
        <View className="mt-2">
          <ShareTree expense={expense} currentUserId={currentUserId} avatars={avatars} />
        </View>
      </View>
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

  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerClassName="px-6"
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <View className="mb-8 flex-row items-center justify-between">
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
            {expense && canManage ? (
              <View className="flex-row gap-4">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit expense"
                  onPress={() => openEditExpense(expense.id)}
                  hitSlop={6}
                  className="size-9 items-center justify-center rounded-lg bg-muted active:opacity-80"
                >
                  <EditIcon size={16} color={palette.foreground} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete expense"
                  onPress={() => setConfirmDelete(true)}
                  hitSlop={6}
                  className="size-9 items-center justify-center rounded-lg bg-muted active:opacity-80"
                >
                  <TrashIcon size={16} color={palette.foreground} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {expense ? (
            <>
              <ExpenseDetails
                expense={expense}
                currentUserId={currentUserId}
                avatars={avatars}
                iconColor={palette.foreground}
                mutedColor={palette.mutedForeground}
              />
            </>
          ) : isError ? (
            <Text className="pt-16 text-center font-display-normal text-base text-muted-foreground">
              We couldn&apos;t find that expense. It may have been deleted.
            </Text>
          ) : null}
        </Animated.ScrollView>
      </GestureDetector>

      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deleteExpense}
        isPending={deleteExpense.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </SwipeDownScreen>
  );
}
