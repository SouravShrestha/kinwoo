import { useAuth } from "@kinwoo/client/auth";
import { expensePartsFromForms, useExpenseSplit, usePayerSplit } from "@kinwoo/client/expenses";
import { useBatchMarkBoughtForm, useGroceryList } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { BATCH_NAME_MAX_LENGTH, MIN_BATCH_ITEMS, type GroceryItem } from "@kinwoo/core/grocery";
import {
  ArrowRightIcon,
  BasketIcon,
  CheckCircleIcon,
  CheckIcon,
  RupeeIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeInUp, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/CategoryIcon";
import { PayerSheet } from "@/components/expenses/PayerSheet";
import { SplitSheet } from "@/components/expenses/SplitSheet";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack, goHome } from "@/lib/house-navigation";
import { useFocusedInputAboveKeyboard } from "@/lib/use-focused-input-above-keyboard";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

type Picker = "payers" | "split";

const SPLIT_ENTERING = FadeInUp.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const SPLIT_EXITING = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

const FIELD = "h-12 flex-row items-center rounded-xl bg-muted";

function quantityUnit(item: GroceryItem): string {
  return [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");
}

export default function BatchMarkBoughtScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const params = useLocalSearchParams<{ listId?: string; itemIds?: string }>();
  const listId = params.listId ?? null;
  const itemIds = useMemo(
    () => (params.itemIds ?? "").split(",").filter(Boolean),
    [params.itemIds],
  );
  const { user } = useAuth();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? "";
  const { data: list } = useGroceryList(houseId || null, listId);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [split, setSplit] = useState(true);
  const invalidLink = !listId || itemIds.length < MIN_BATCH_ITEMS;

  const form = useBatchMarkBoughtForm({
    houseId,
    listId: listId ?? "",
    itemIds,
    currentUserId: user?.id ?? "",
    currentUserName: user?.user_metadata?.displayName ?? user?.email ?? null,
    onBought: goBack,
  });

  const payers = usePayerSplit({ houseId, currentUserId: user?.id ?? null, price: form.total });
  const expenseSplit = useExpenseSplit({ members: payers.members, totalPaise: payers.totalPaise });
  // Private lists stay private, so their purchases are never split into expenses.
  const showSplit = payers.totalPaise > 0 && list?.visibility === "shared";

  useEffect(() => {
    if ((ready && !activeHouse) || invalidLink) goHome();
  }, [ready, activeHouse, invalidLink]);

  useEffect(() => {
    if (!form.unavailable) return;
    toast.error("Those items are no longer waiting to be bought.");
    goBack();
  }, [form.unavailable]);

  const { pan, scrollGesture, scrollY, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);
  const { scrollRef, revealFocusedInput } = useFocusedInputAboveKeyboard(scrollY);
  const submitDisabled = !form.canSubmit;

  const openPicker = (next: Picker) => {
    Keyboard.dismiss();
    setPicker(next);
  };
  const closePicker = () => setPicker(null);

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <GestureDetector gesture={scrollGesture}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
            bounces={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="gap-5 px-6"
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 32,
            }}
          >
            <View className="flex-row items-center justify-between pb-3">
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark ${form.items.length} items as bought`}
                accessibilityState={{ disabled: submitDisabled, busy: form.submitting }}
                disabled={submitDisabled}
                onPress={() =>
                  void form.submit(
                    split && showSplit ? expensePartsFromForms(payers, expenseSplit) : null,
                  )
                }
                allowDoublePress
                hitSlop={12}
                className={`size-10 items-end justify-center ${submitDisabled ? "opacity-40" : ""}`}
              >
                <CheckCircleIcon size={26} color={palette.foreground} />
              </Pressable>
            </View>

            <View>
              <View className="flex-row gap-3">
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  className="size-12 items-center justify-center rounded-xl bg-muted"
                >
                  <BasketIcon size={24} color={palette.foreground} />
                </View>
                <TextInput
                  accessibilityLabel="Group name (optional)"
                  accessibilityHint={form.nameError ?? undefined}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={BATCH_NAME_MAX_LENGTH}
                  placeholder="Group name"
                  placeholderTextColor={palette.mutedForeground}
                  onFocus={revealFocusedInput}
                  value={form.name}
                  onChangeText={form.setName}
                  // No `text-*` size class: its lineHeight misaligns iOS text and caret.
                  className="h-12 flex-1 rounded-xl bg-muted px-5 font-display-normal text-foreground"
                  style={{ fontSize: 16, paddingVertical: 0 }}
                />
              </View>
              {form.nameError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 text-right font-display-normal text-sm text-destructive"
                >
                  {form.nameError}
                </Text>
              ) : null}
            </View>

            <View className="my-3">
              <View className="flex-row items-center gap-3 border-b border-border pb-1">
                <RupeeIcon size={28} color={palette.foreground} />
                <TextInput
                  autoFocus
                  accessibilityLabel="Total paid"
                  accessibilityHint={form.totalError ?? undefined}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.mutedForeground}
                  onFocus={revealFocusedInput}
                  value={form.total}
                  onChangeText={form.setTotal}
                  className="h-11 min-w-0 flex-1 font-display-medium text-foreground"
                  style={{ fontSize: 34, paddingVertical: 0 }}
                />
              </View>
              {form.totalError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 font-display-normal text-sm text-destructive"
                >
                  {form.totalError}
                </Text>
              ) : null}
            </View>

            {showSplit ? (
              <Animated.View entering={SPLIT_ENTERING} exiting={SPLIT_EXITING} className="gap-4">
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: split }}
                  accessibilityLabel="I want to split expenses"
                  onPress={() => setSplit((value) => !value)}
                  allowDoublePress
                  className="flex-row items-center gap-3 self-start"
                >
                  <View
                    className={`size-5 items-center justify-center rounded-md ${
                      split ? "bg-foreground" : "border border-border"
                    }`}
                  >
                    {split ? <CheckIcon size={10} color={palette.background} /> : null}
                  </View>
                  <Text className="font-display-normal text-base text-foreground">
                    I want to split expenses
                  </Text>
                </Pressable>

                {split ? (
                  <Animated.View
                    entering={SPLIT_ENTERING}
                    exiting={SPLIT_EXITING}
                    className="flex-row flex-wrap items-center gap-x-2 gap-y-3"
                  >
                    <Text className="font-display-normal text-base text-muted-foreground">
                      Paid by
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Paid by ${payers.label}. Change who paid`}
                      onPress={() => openPicker("payers")}
                      allowDoublePress
                      className="rounded-lg bg-muted px-3.5 py-1.5 active:opacity-80"
                    >
                      <Text className="font-display-medium text-base text-foreground">
                        {payers.label}
                      </Text>
                    </Pressable>
                    <Text className="font-display-normal text-base text-muted-foreground">
                      and split
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Split ${expenseSplit.label.toLowerCase()}. Change how it is split`}
                      onPress={() => openPicker("split")}
                      allowDoublePress
                      className="rounded-lg bg-muted px-3.5 py-1.5 active:opacity-80"
                    >
                      <Text className="font-display-medium text-base text-foreground">
                        {expenseSplit.label}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}

            {form.items.length > 0 ? (
              <View className={"gap-7 pt-6"}>
                <Text className="-mb-2 font-display-normal text-sm text-muted-foreground">
                  {form.items.length} items
                </Text>
                {form.amountMismatch ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="-mb-2 font-display-normal text-sm text-warning"
                  >
                    {form.amountMismatch}
                  </Text>
                ) : null}
                {form.items.map((item) => {
                  const error = form.itemErrorOf(item.id);
                  const detail = quantityUnit(item);
                  return (
                    <View key={item.id}>
                      <View className="flex-row items-center gap-3">
                        <View
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          className="size-12 items-center justify-center rounded-xl bg-muted"
                        >
                          <CategoryIcon
                            name={item.categoryName ?? undefined}
                            size={24}
                            color={palette.foreground}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            className="font-display-normal text-base text-foreground"
                          >
                            {item.name}
                          </Text>
                          {detail ? (
                            <Text
                              numberOfLines={1}
                              className="font-display-normal text-sm text-muted-foreground"
                            >
                              {detail}
                            </Text>
                          ) : null}
                        </View>
                        <View className={`${FIELD} w-28 gap-1.5 px-3`}>
                          <RupeeIcon size={14} color={palette.mutedForeground} />
                          <TextInput
                            accessibilityLabel={`Amount for ${item.name}`}
                            accessibilityHint={error ?? undefined}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={palette.mutedForeground}
                            onFocus={revealFocusedInput}
                            value={form.amountOf(item.id)}
                            onChangeText={(value) => form.setAmount(item.id, value)}
                            className="h-12 min-w-0 flex-1 text-right font-display-normal text-foreground"
                            style={{ fontSize: 16, paddingVertical: 0 }}
                          />
                        </View>
                      </View>
                      {error ? (
                        <Text
                          accessibilityLiveRegion="polite"
                          className="mt-2 text-right font-display-normal text-sm text-destructive"
                        >
                          {error}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Animated.ScrollView>
        </GestureDetector>
      </KeyboardAvoidingView>

      <PayerSheet open={picker === "payers"} onClose={closePicker} payers={payers} />
      <SplitSheet open={picker === "split"} onClose={closePicker} split={expenseSplit} />
    </SwipeDownScreen>
  );
}
