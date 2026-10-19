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
import { ArrowRightIcon, CalendarIcon, CheckCircleIcon, RupeeIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { Easing, FadeInUp, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerSheet } from "@/components/grocery/DatePickerSheet";
import { OptionSheet } from "@/components/OptionSheet";
import { Pressable } from "@/components/Pressable";
import { goBack } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";
import { PayerSheet } from "./PayerSheet";
import { SplitSheet } from "./SplitSheet";

type Picker = "category" | "date" | "payers" | "split";

const SPLIT_ENTERING = FadeInUp.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const SPLIT_EXITING = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

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

  const submitDisabled = !form.canSubmit;
  const dateLabel = formatPickedDate(form.date);
  const heading = form.isEditing ? "Edit expense" : "Add expense";

  const openPicker = (next: Picker) => {
    Keyboard.dismiss();
    setPicker(next);
  };
  const closePicker = () => setPicker(null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View
        className="flex-row items-center justify-between px-6 pb-6"
        style={{ paddingTop: insets.top + 20 }}
      >
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
        <Text accessibilityRole="header" className="font-display-medium text-lg text-foreground">
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

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-6 pb-10">
        <View>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Category: ${EXPENSE_CATEGORY_LABELS[form.category]}. Change category`}
              onPress={() => openPicker("category")}
              allowDoublePress
              className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
            >
              <ExpenseCategoryIcon category={form.category} size={24} color={palette.foreground} />
            </Pressable>
            <TextInput
              accessibilityLabel="Title"
              accessibilityHint={form.titleError ?? undefined}
              autoCapitalize="sentences"
              returnKeyType="next"
              maxLength={EXPENSE_TITLE_MAX}
              placeholder="What was it for?"
              placeholderTextColor={palette.mutedForeground}
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

        <View className="my-3">
          <View className="flex-row items-center gap-3 border-b border-border pb-1">
            <RupeeIcon size={28} color={palette.foreground} />
            <TextInput
              autoFocus={!form.isEditing}
              accessibilityLabel="Amount"
              accessibilityHint={form.amountError ?? undefined}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={palette.mutedForeground}
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
          className="h-12 flex-row items-center gap-2 rounded-xl bg-muted px-3.5 active:opacity-80"
        >
          <CalendarIcon size={16} color={palette.foreground} />
          <Text className="font-display-normal text-base text-foreground">{dateLabel}</Text>
        </Pressable>

        <View>
          <TextInput
            accessibilityLabel="Note"
            accessibilityHint={form.noteError ?? undefined}
            multiline
            maxLength={EXPENSE_NOTE_MAX}
            placeholder="Add a note (optional)"
            placeholderTextColor={palette.mutedForeground}
            value={form.note}
            onChangeText={form.setNote}
            className="min-h-20 rounded-xl bg-muted px-5 py-3 font-display-normal text-foreground"
            style={{ fontSize: 16, textAlignVertical: "top" }}
          />
          {form.noteError ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-2 font-display-normal text-sm text-destructive"
            >
              {form.noteError}
            </Text>
          ) : null}
        </View>

        {payers.totalPaise > 0 ? (
          <Animated.View
            entering={SPLIT_ENTERING}
            exiting={SPLIT_EXITING}
            className="flex-row flex-wrap items-center gap-x-2 gap-y-3"
          >
            <Text className="font-display-normal text-base text-muted-foreground">Paid by</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Paid by ${payers.label}. Change who paid`}
              onPress={() => openPicker("payers")}
              allowDoublePress
              className="rounded-lg bg-muted px-3.5 py-1.5 active:opacity-80"
            >
              <Text className="font-display-medium text-base text-foreground">{payers.label}</Text>
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
          </Animated.View>
        ) : null}
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}
