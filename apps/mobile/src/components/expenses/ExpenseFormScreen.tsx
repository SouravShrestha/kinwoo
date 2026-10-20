import { useAuth } from "@kinwoo/client/auth";
import { useExpenseForm } from "@kinwoo/client/expenses";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_NOTE_MAX,
  EXPENSE_TITLE_MAX,
  type Expense,
  type ExpenseCategory,
} from "@kinwoo/core/expenses";
import { formatPickedDate } from "@kinwoo/core/grocery";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExpenseCategoryIcon,
  RupeeIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeInUp, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerSheet } from "@/components/grocery/DatePickerSheet";
import { OptionSheet } from "@/components/OptionSheet";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack } from "@/lib/house-navigation";
import { useFocusedInputAboveKeyboard } from "@/lib/use-focused-input-above-keyboard";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

import { PayerSheet } from "./PayerSheet";
import { SplitSheet } from "./SplitSheet";

type Picker = "category" | "date" | "payers" | "split";

const NOTE_ENTERING = FadeInUp.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const NOTE_EXITING = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

export function ExpenseFormScreen({
  houseId,
  expense,
}: {
  houseId: string;
  expense?: Expense | null;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { user } = useAuth();
  const [picker, setPicker] = useState<Picker | null>(null);
  const form = useExpenseForm({
    houseId,
    currentUserId: user?.id ?? null,
    expense,
    onSaved: goBack,
  });
  const { payers, split } = form;
  const [noteOpen, setNoteOpen] = useState(Boolean(expense?.note));

  const submitDisabled = !form.canSubmit;
  const dateLabel = formatPickedDate(form.date);
  const heading = form.isEditing ? "Edit expense" : "Add expense";

  const { pan, scrollGesture, scrollY, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);
  const { scrollRef, revealFocusedInput } = useFocusedInputAboveKeyboard(scrollY);

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
              <Text
                accessibilityRole="header"
                className="font-display-medium text-lg text-foreground"
              >
                {heading}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={form.isEditing ? "Save expense" : "Add expense"}
                accessibilityState={{ disabled: submitDisabled, busy: form.submitting }}
                disabled={submitDisabled}
                onPress={() => void form.submit()}
                hitSlop={12}
                className={`size-10 items-end justify-center ${submitDisabled ? "opacity-40" : ""}`}
              >
                <CheckCircleIcon size={26} color={palette.foreground} />
              </Pressable>
            </View>

            <View>
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${EXPENSE_CATEGORY_LABELS[form.category]}. Change category`}
                  onPress={() => openPicker("category")}
                  allowDoublePress
                  className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
                >
                  <ExpenseCategoryIcon
                    category={form.category}
                    size={24}
                    color={palette.foreground}
                  />
                </Pressable>
                <TextInput
                  autoFocus={!form.isEditing}
                  accessibilityLabel="Title"
                  accessibilityHint={form.titleError ?? undefined}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  maxLength={EXPENSE_TITLE_MAX}
                  placeholder="What was it for?"
                  placeholderTextColor={palette.mutedForeground}
                  onFocus={revealFocusedInput}
                  value={form.title}
                  onChangeText={form.setTitle}
                  // No `text-*` size class: its lineHeight misaligns iOS text and caret.
                  className="h-12 flex-1 rounded-xl bg-muted px-5 font-display-normal text-foreground"
                  style={{ fontSize: 16, paddingVertical: 0 }}
                />
              </View>
              {form.titleError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 text-right font-display-normal text-sm text-destructive"
                >
                  {form.titleError}
                </Text>
              ) : null}
            </View>

            <View className="my-3 flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-3 border-b border-border pb-1">
                  <RupeeIcon size={28} color={palette.foreground} />
                  <TextInput
                    accessibilityLabel="Amount"
                    accessibilityHint={form.amountError ?? undefined}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={palette.mutedForeground}
                    onFocus={revealFocusedInput}
                    value={form.amount}
                    onChangeText={form.setAmount}
                    className="h-11 min-w-0 flex-1 font-display-medium text-foreground"
                    style={{ fontSize: 34, paddingVertical: 0 }}
                  />
                </View>
                {form.amountError ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="mt-2 font-display-normal text-sm text-destructive"
                  >
                    {form.amountError}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Date: ${dateLabel}. Change date`}
                onPress={() => openPicker("date")}
                allowDoublePress
                className="h-12 w-36 flex-row items-center gap-2 rounded-xl bg-muted px-3.5 active:opacity-80"
              >
                <CalendarIcon size={16} color={palette.foreground} />
                <Text className="font-display-normal text-base text-foreground">{dateLabel}</Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap items-center gap-x-2 gap-y-3">
              <Text className="font-display-normal text-base text-muted-foreground">Paid by</Text>
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
              <Text className="font-display-normal text-base text-muted-foreground">and split</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Split ${split.label.toLowerCase()}. Change how it is split`}
                onPress={() => openPicker("split")}
                allowDoublePress
                className="rounded-lg bg-muted px-3.5 py-1.5 active:opacity-80"
              >
                <Text className="font-display-medium text-base text-foreground">{split.label}</Text>
              </Pressable>
            </View>

            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: noteOpen }}
                onPress={() => setNoteOpen((open) => !open)}
                allowDoublePress
                className="flex-row items-center gap-2 self-start py-1 mt-1 active:opacity-80"
              >
                <View style={{ transform: [{ rotate: noteOpen ? "90deg" : "0deg" }] }}>
                  <ArrowRightIcon size={18} color={palette.mutedForeground} />
                </View>
                <Text className="font-display-normal text-base text-muted-foreground">
                  {form.note && !noteOpen ? "Note added" : "Add a note"}
                </Text>
              </Pressable>
              {noteOpen ? (
                <Animated.View entering={NOTE_ENTERING} exiting={NOTE_EXITING}>
                  <TextInput
                    accessibilityLabel="Note"
                    accessibilityHint={form.noteError ?? undefined}
                    multiline
                    maxLength={EXPENSE_NOTE_MAX}
                    placeholder="e.g. Electricity bill for March, paid via UPI"
                    placeholderTextColor={palette.mutedForeground}
                    onFocus={revealFocusedInput}
                    value={form.note}
                    onChangeText={form.setNote}
                    className="mt-2 min-h-20 rounded-xl bg-muted px-5 py-3 font-display-normal text-foreground"
                    style={{ fontSize: 16, textAlignVertical: "top" }}
                  />
                </Animated.View>
              ) : null}
              {form.noteError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 font-display-normal text-sm text-destructive"
                >
                  {form.noteError}
                </Text>
              ) : null}
            </View>
          </Animated.ScrollView>
        </GestureDetector>
      </KeyboardAvoidingView>

      <OptionSheet
        open={picker === "category"}
        onClose={closePicker}
        title="Category"
        columns={3}
        scrollable={false}
        showTitle={false}
        options={EXPENSE_CATEGORIES.map((category) => ({
          id: category,
          label: EXPENSE_CATEGORY_LABELS[category],
          icon: (color: string) => (
            <ExpenseCategoryIcon category={category} size={32} color={color} />
          ),
        }))}
        selectedId={form.category}
        onSelect={(id) => {
          form.setCategory(id as ExpenseCategory);
          closePicker();
        }}
      />
      <PayerSheet open={picker === "payers"} onClose={closePicker} payers={payers} />
      <SplitSheet open={picker === "split"} onClose={closePicker} split={split} />
      <DatePickerSheet
        open={picker === "date"}
        onClose={closePicker}
        value={form.date}
        onSelect={form.setDate}
        label="Choose the date spent"
      />
    </SwipeDownScreen>
  );
}
