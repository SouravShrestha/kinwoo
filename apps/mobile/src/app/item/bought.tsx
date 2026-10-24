import { useAuth } from "@kinwoo/client/auth";
import { expensePartsFromForms, useExpenseSplit, usePayerSplit } from "@kinwoo/client/expenses";
import { useGroceryItem, useGroceryList, useMarkBoughtForm } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import {
  formatPickedDate,
  ITEM_NAME_MAX_LENGTH,
  ITEM_QUANTITY_MAX_LENGTH,
  itemUnitOptions,
} from "@kinwoo/core/grocery";
import {
  ArrowRightIcon,
  CalendarIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CheckIcon,
  RupeeIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { Easing, FadeInUp, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerSheet } from "@/components/grocery/DatePickerSheet";
import { ItemCategoryImage } from "@/components/grocery/ItemCategoryImage";
import { PayerSheet } from "@/components/expenses/PayerSheet";
import { SplitSheet } from "@/components/expenses/SplitSheet";
import { OptionSheet, type SheetOption } from "@/components/OptionSheet";
import { Pressable } from "@/components/Pressable";
import { goBack, goHome } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

type Picker = "category" | "unit" | "date" | "payers" | "split";

const NO_UNIT = "__none__";

const SPLIT_ENTERING = FadeInUp.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const SPLIT_EXITING = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

const FIELD = "h-12 flex-row items-center rounded-xl bg-muted";

export default function MarkBoughtScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { listId, itemId } = useLocalSearchParams<{ listId?: string; itemId?: string }>();
  const { user } = useAuth();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? "";
  const [picker, setPicker] = useState<Picker | null>(null);
  const [split, setSplit] = useState(true);

  const { data: item } = useGroceryItem(houseId || null, listId ?? null, itemId ?? null);
  const { data: list } = useGroceryList(houseId || null, listId ?? null);
  const canEdit =
    !!item &&
    (activeHouse?.role === "admin" || item.createdBy === user?.id || item.claimedBy === user?.id);
  const form = useMarkBoughtForm({
    houseId,
    listId: listId ?? "",
    item,
    canEdit,
    onBought: goBack,
  });

  const payers = usePayerSplit({ houseId, currentUserId: user?.id ?? null, price: form.price });
  const expenseSplit = useExpenseSplit({ members: payers.members, totalPaise: payers.totalPaise });
  // Private lists stay private, so their purchases are never split into expenses.
  const showSplit = payers.totalPaise > 0 && list?.visibility === "shared";

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  const category = form.categories.find((c) => c.id === form.categoryId);
  const submitDisabled = !form.canSubmit;
  const dateLabel = formatPickedDate(form.date);

  const unitOptions: SheetOption[] = [
    { id: NO_UNIT, label: "No unit" },
    ...itemUnitOptions(form.unit).map((unit) => ({
      id: unit.value,
      label: unit.label,
      detail: unit.label === unit.value ? undefined : unit.value,
    })),
  ];

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
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <View
            className="flex-row items-center justify-between px-6 pb-8"
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark as bought"
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

          <View className="flex-1 gap-5 px-6 pb-8">
            <View>
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${category?.name ?? "none"}. Change category`}
                  accessibilityState={{ disabled: !canEdit }}
                  disabled={!canEdit}
                  onPress={() => openPicker("category")}
                  allowDoublePress
                  className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
                >
                  <ItemCategoryImage name={category?.name} size={40} />
                </Pressable>
                <TextInput
                  accessibilityLabel="Item name"
                  accessibilityHint={form.nameError ?? undefined}
                  editable={canEdit}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={ITEM_NAME_MAX_LENGTH}
                  placeholder="Item name"
                  placeholderTextColor={palette.mutedForeground}
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

            <View className="flex-row items-center gap-3">
              <TextInput
                accessibilityLabel="Quantity"
                keyboardType="decimal-pad"
                maxLength={ITEM_QUANTITY_MAX_LENGTH}
                placeholder="Qty"
                placeholderTextColor={palette.mutedForeground}
                value={form.quantity}
                onChangeText={form.setQuantity}
                className="h-12 w-20 rounded-xl bg-muted text-center font-display-normal text-foreground"
                style={{ fontSize: 16, paddingVertical: 0 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unit: ${form.unit ?? "none"}. Change unit`}
                onPress={() => openPicker("unit")}
                allowDoublePress
                className={`${FIELD} w-20 justify-between pl-5 pr-3.5 active:opacity-80`}
              >
                <Text
                  className={`font-display-normal text-base ${
                    form.unit ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {form.unit ?? "Unit"}
                </Text>
                <CaretDownIcon size={9} color={palette.foreground} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Date bought: ${dateLabel}. Change date`}
                onPress={() => openPicker("date")}
                allowDoublePress
                className={`${FIELD} min-w-0 flex-1 gap-2 px-3.5 active:opacity-80`}
              >
                <CalendarIcon size={16} color={palette.foreground} />
                <Text className="font-display-normal text-base text-foreground">{dateLabel}</Text>
              </Pressable>
            </View>

            <View className="my-3">
              <View className="flex-row items-center gap-3 border-b border-border pb-1">
                <RupeeIcon size={28} color={palette.foreground} />
                <TextInput
                  autoFocus
                  accessibilityLabel="Amount paid"
                  accessibilityHint={form.priceError ?? undefined}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.mutedForeground}
                  value={form.price}
                  onChangeText={form.setPrice}
                  className="h-14 min-w-0 flex-1 font-display-medium text-foreground"
                  style={{ fontSize: 34, lineHeight: 44, paddingVertical: 0 }}
                />
              </View>
              {form.priceError ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 font-display-normal text-sm text-destructive"
                >
                  {form.priceError}
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
          </View>
        </View>
      </TouchableWithoutFeedback>

      <OptionSheet
        open={picker === "category"}
        onClose={closePicker}
        title="Category"
        columns={3}
        scrollable={false}
        showTitle={false}
        options={form.categories.map((c) => ({
          id: c.id,
          label: c.name,
          icon: () => <ItemCategoryImage name={c.name} size={48} />,
        }))}
        selectedId={form.categoryId}
        onSelect={(id) => {
          form.setCategory(id);
          closePicker();
        }}
      />
      <OptionSheet
        open={picker === "unit"}
        onClose={closePicker}
        title="Unit"
        columns={3}
        showTitle={false}
        options={unitOptions}
        selectedId={form.unit ?? NO_UNIT}
        onSelect={(id) => {
          form.setUnit(id === NO_UNIT ? null : id);
          closePicker();
        }}
      />
      <PayerSheet open={picker === "payers"} onClose={closePicker} payers={payers} />
      <SplitSheet open={picker === "split"} onClose={closePicker} split={expenseSplit} />
      <DatePickerSheet
        open={picker === "date"}
        onClose={closePicker}
        value={form.date}
        onSelect={form.setDate}
      />
    </KeyboardAvoidingView>
  );
}
