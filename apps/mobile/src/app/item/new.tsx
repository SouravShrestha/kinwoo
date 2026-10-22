import { useAddItemForm } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import {
  ITEM_NAME_MAX_LENGTH,
  ITEM_NOTE_MAX_LENGTH,
  ITEM_QUANTITY_MAX_LENGTH,
  ITEM_URGENCY_OPTIONS,
  itemUnitOptions,
  listIconOption,
} from "@kinwoo/core/grocery";
import {
  ArrowRightIcon,
  CaretDownIcon,
  CategoryIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  PlusCircleIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NewListSheet } from "@/components/grocery/NewListSheet";
import { OptionSheet, type SheetOption } from "@/components/OptionSheet";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack, goHome } from "@/lib/house-navigation";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

type Picker = "list" | "category" | "unit" | "urgency";

const NO_UNIT = "__none__";
const NEW_LIST = "__new_list__";

const FIELD = "h-12 flex-row items-center rounded-xl bg-muted";

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const { activeHouse, ready } = useActiveHouse();
  const [addAnother, setAddAnother] = useState(true);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const form = useAddItemForm({
    houseId: activeHouse?.house.id ?? "",
    listId: listId ?? null,
    onAdded: (mode) => {
      if (mode === "close") {
        goBack();
      } else {
        nameRef.current?.focus();
      }
    },
  });

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  const submit = () => void form.submit(addAnother ? "again" : "close");

  const activeList = form.lists.find((list) => list.id === form.listId);
  const category = form.categories.find((c) => c.id === form.categoryId);
  const urgency = ITEM_URGENCY_OPTIONS.find((option) => option.value === form.urgency);
  const submitDisabled = !form.canSubmit || form.pendingMode !== null;

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
  const { pan, sheetStyle } = useSwipeDownToDismiss(goBack);

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
          <View className="flex-1">
            <View
              className="flex-row items-center justify-between px-6 pb-12"
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
              <View className="min-w-0 flex-1 items-center">
                {form.lists.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Adding to ${activeList?.name ?? ""}. Change list`}
                    onPress={() => openPicker("list")}
                    allowDoublePress
                    hitSlop={8}
                    className="flex-row items-center gap-3"
                  >
                    <Text
                      numberOfLines={1}
                      className="shrink font-display-medium-italic text-lg text-foreground underline"
                    >
                      {activeList?.name}
                    </Text>
                    <CaretDownIcon size={9} color={palette.foreground} />
                  </Pressable>
                ) : (
                  <Text
                    numberOfLines={1}
                    className="font-display-medium-italic text-lg text-foreground underline"
                  >
                    {activeList?.name}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={addAnother ? "Add item and keep adding" : "Add item"}
                accessibilityState={{ disabled: submitDisabled }}
                disabled={submitDisabled}
                onPress={submit}
                allowDoublePress
                hitSlop={12}
                className={`size-10 items-end justify-center ${submitDisabled ? "opacity-40" : ""}`}
              >
                <CheckCircleIcon size={26} color={palette.foreground} />
              </Pressable>
            </View>

            <View className="flex-1 gap-8 px-6 pb-8">
              <View>
                <View className="flex-row gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Category: ${category?.name ?? "none"}. Change category`}
                    onPress={() => openPicker("category")}
                    allowDoublePress
                    className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
                  >
                    <CategoryIcon name={category?.name} size={26} color={palette.foreground} />
                  </Pressable>
                  <TextInput
                    ref={nameRef}
                    autoFocus
                    accessibilityLabel="Item name"
                    accessibilityHint={form.error ?? undefined}
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    returnKeyType="done"
                    submitBehavior="submit"
                    onSubmitEditing={submit}
                    maxLength={ITEM_NAME_MAX_LENGTH}
                    placeholder="What do you wanna buy?"
                    placeholderTextColor={palette.mutedForeground}
                    value={form.name}
                    onChangeText={form.setName}
                    // No `text-*` size class: its lineHeight misaligns iOS text and caret.
                    className="h-12 flex-1 rounded-xl bg-muted px-5 font-display-normal text-foreground"
                    style={{ fontSize: 16, paddingVertical: 0 }}
                  />
                </View>
                {form.error || form.duplicate ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className={`mt-2 text-right font-display-normal text-sm ${
                      form.error ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {form.error ?? (
                      <>
                        <Text className="font-display-medium-italic">{form.duplicate?.name}</Text>{" "}
                        is already on the list
                      </>
                    )}
                  </Text>
                ) : null}

                {form.suggestions.length > 0 ? (
                  <View className="mt-4">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      className="-mx-6"
                      contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "flex-end",
                        paddingHorizontal: 24,
                        gap: 8,
                      }}
                    >
                      {form.suggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion.name}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${suggestion.name}`}
                          onPress={() => {
                            form.applySuggestion(suggestion);
                            nameRef.current?.focus();
                          }}
                          allowDoublePress
                          className="flex-row items-center rounded-full border border-dashed border-border px-3.5 py-2 active:bg-muted"
                        >
                          <Text
                            numberOfLines={1}
                            className="font-display-medium text-sm text-foreground"
                          >
                            {suggestion.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
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
                  accessibilityLabel={`When: ${urgency?.label}. Change`}
                  onPress={() => openPicker("urgency")}
                  allowDoublePress
                  className={`${FIELD} ml-auto w-36 justify-between px-3.5 active:opacity-80`}
                >
                  <ClockIcon size={16} color={palette.foreground} />
                  <Text className="font-display-normal text-base text-foreground">
                    {urgency?.label}
                  </Text>
                  <CaretDownIcon size={9} color={palette.foreground} />
                </Pressable>
              </View>

              <TextInput
                accessibilityLabel="Note"
                returnKeyType="done"
                maxLength={ITEM_NOTE_MAX_LENGTH}
                placeholder="(optional) brand, size, anything"
                placeholderTextColor={palette.mutedForeground}
                value={form.note}
                onChangeText={form.setNote}
                className="h-12 rounded-xl bg-muted px-5 font-display-normal text-foreground"
                style={{ fontSize: 16, paddingVertical: 0 }}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: addAnother }}
                accessibilityLabel="Add another item"
                onPress={() => setAddAnother((value) => !value)}
                allowDoublePress
                className="flex-row items-center gap-3 self-end"
              >
                <Text className="font-display-normal text-base text-foreground">
                  add another item
                </Text>
                <View
                  className={`size-5 items-center justify-center rounded-md ${
                    addAnother ? "bg-foreground" : "border border-border"
                  }`}
                >
                  {addAnother ? <CheckIcon size={10} color={palette.background} /> : null}
                </View>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>

        <OptionSheet
          open={picker === "list"}
          onClose={closePicker}
          title="Choose a list"
          columns={3}
          options={[
            ...form.lists.map((list) => ({
              id: list.id,
              label: list.name,
              icon: (color: string) => (
                <CategoryIcon name={listIconOption(list.icon).label} size={24} color={color} />
              ),
            })),
            {
              id: NEW_LIST,
              label: "New list",
              icon: (color: string) => <PlusCircleIcon size={24} color={color} />,
              dashed: true,
            },
          ]}
          selectedId={form.listId}
          onSelect={(id) => {
            closePicker();
            if (id === NEW_LIST) {
              setNewListOpen(true);
              return;
            }
            form.setListId(id);
          }}
        />
        <NewListSheet
          open={newListOpen}
          onClose={() => setNewListOpen(false)}
          houseId={activeHouse?.house.id ?? ""}
          onCreated={(list) => form.setListId(list.id)}
        />
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
            icon: (color) => <CategoryIcon name={c.name} size={32} color={color} />,
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
        <OptionSheet
          open={picker === "urgency"}
          onClose={closePicker}
          title="When do you need it?"
          columns={2}
          options={ITEM_URGENCY_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
          }))}
          selectedId={form.urgency}
          onSelect={(id) => {
            const option = ITEM_URGENCY_OPTIONS.find((o) => o.value === id);
            if (option) form.setUrgency(option.value);
            closePicker();
          }}
        />
      </KeyboardAvoidingView>
    </SwipeDownScreen>
  );
}
