import { useGroceryItemActivity, type EditItemForm } from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import {
  ITEM_NAME_MAX_LENGTH,
  ITEM_NOTE_MAX_LENGTH,
  ITEM_QUANTITY_MAX_LENGTH,
  ITEM_URGENCY_OPTIONS,
  itemLastEdit,
  itemUnitOptions,
  storeSearchLinks,
  type GroceryItem,
  type StoreId,
} from "@kinwoo/core/grocery";
import { CaretDownIcon, CheckCircleIcon, ClockIcon, CloseIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState, type ReactNode } from "react";
import { Image, Keyboard, Text, View } from "react-native";

import { SheetTextInput } from "@/components/BottomSheet";
import { Avatar } from "@/components/houses/Avatar";
import { OptionSheet, type SheetOption } from "@/components/OptionSheet";
import { Pressable } from "@/components/Pressable";
import { openAppLinkAsync } from "@/lib/app-links";
import { blinkitLogo, instamartLogo, zeptoLogo } from "@/lib/images";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

import { ItemCategoryImage } from "./ItemCategoryImage";

type Picker = "category" | "unit" | "urgency";

const NO_UNIT = "__none__";

export const SHEET_INSET = 24;
export const FOOTER_GAP = 32;
export const FOOTER_BOTTOM_PADDING = 16;
export const BUTTON_ROW_HEIGHT = 48;

const STORE_LOGOS: Record<StoreId, number> = {
  blinkit: blinkitLogo,
  zepto: zeptoLogo,
  instamart: instamartLogo,
};

const FIELD = "h-12 flex-row items-center rounded-xl bg-muted";
// No `text-*` size class on inputs: its lineHeight misaligns iOS text and caret.
const INPUT_STYLE = { fontSize: 16, paddingVertical: 0 } as const;

// Footer actions act on the item as shown, so unsaved edits go in first.
export async function saveItemEdits(form: EditItemForm, canEdit: boolean): Promise<boolean> {
  Keyboard.dismiss();
  return !canEdit || !form.dirty || (await form.save());
}

export function ItemDetailsEditor({
  item,
  form,
  houseId,
  listId,
  currentUserId,
  currentUserName,
  canEdit,
  onClose,
  footer,
}: {
  item: GroceryItem;
  form: EditItemForm;
  houseId: string;
  listId: string;
  currentUserId: string;
  currentUserName: string | null;
  canEdit: boolean;
  onClose: () => void;
  footer: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [picker, setPicker] = useState<Picker | null>(null);
  // While typing only the fields show, so the sheet sits compactly on the keyboard.
  const keyboardVisible = useKeyboardVisible();

  const { data: activity } = useGroceryItemActivity(houseId, listId, item.id);
  const { data: members } = useHouseMembers(houseId);

  const draft = form.draft;
  if (!draft) return null;

  const category = form.categories.find((c) => c.id === draft.categoryId);
  const urgency = ITEM_URGENCY_OPTIONS.find((option) => option.value === draft.urgency);
  const unitOptions: SheetOption[] = [
    { id: NO_UNIT, label: "No unit" },
    ...itemUnitOptions(draft.unit).map((unit) => ({
      id: unit.value,
      label: unit.label,
      detail: unit.label === unit.value ? undefined : unit.value,
    })),
  ];

  const lastEdit = itemLastEdit(item, activity);
  const editor = members?.find((m) => m.userId === lastEdit.userId);
  const editorName =
    editor?.displayName ??
    (lastEdit.userId === currentUserId ? currentUserName : null) ??
    lastEdit.name ??
    "A housemate";

  const searchName = draft.name.trim() || item.name;
  const saveDisabled = !form.dirty || form.saving;
  const openPicker = (next: Picker) => {
    Keyboard.dismiss();
    setPicker(next);
  };
  const closePicker = () => setPicker(null);

  const handleSave = async () => {
    if (!form.dirty) return;
    Keyboard.dismiss();
    if (await form.save()) {
      toast.success("Changes saved");
      onClose();
    }
  };

  const handleOpenStore = async (url: string) => {
    try {
      await openAppLinkAsync(url);
    } catch {
      toast.error("Could not open link");
    }
  };

  return (
    <>
      <View className="gap-6">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            className="-ml-2 size-10 items-center justify-center active:opacity-60"
          >
            <CloseIcon size={22} color={palette.foreground} />
          </Pressable>
          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save changes"
              accessibilityState={{ disabled: saveDisabled }}
              disabled={saveDisabled}
              onPress={() => void handleSave()}
              hitSlop={12}
              className={`size-10 items-end justify-center ${saveDisabled ? "opacity-40" : ""}`}
            >
              <CheckCircleIcon size={26} color={palette.foreground} />
            </Pressable>
          ) : null}
        </View>

        <View>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Category: ${category?.name ?? "none"}${canEdit ? ". Change category" : ""}`}
              disabled={!canEdit}
              onPress={() => openPicker("category")}
              allowDoublePress
              className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
            >
              <ItemCategoryImage name={category?.name} size={40} />
            </Pressable>
            <SheetTextInput
              accessibilityLabel="Item name"
              accessibilityHint={form.error ?? undefined}
              editable={canEdit}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
              maxLength={ITEM_NAME_MAX_LENGTH}
              placeholder="What do you wanna buy?"
              placeholderTextColor={palette.mutedForeground}
              value={draft.name}
              onChangeText={form.setName}
              className="h-12 min-w-0 flex-1 rounded-xl bg-muted px-5 font-display-normal text-foreground"
              style={INPUT_STYLE}
            />
          </View>
          {form.error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-2 text-right font-display-normal text-sm text-destructive"
            >
              {form.error}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-3">
          <SheetTextInput
            accessibilityLabel="Quantity"
            editable={canEdit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            maxLength={ITEM_QUANTITY_MAX_LENGTH}
            placeholder="Qty"
            placeholderTextColor={palette.mutedForeground}
            value={draft.quantity}
            onChangeText={form.setQuantity}
            className="h-12 w-20 rounded-xl bg-muted text-center font-display-normal text-foreground"
            style={INPUT_STYLE}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unit: ${draft.unit ?? "none"}${canEdit ? ". Change unit" : ""}`}
            disabled={!canEdit}
            onPress={() => openPicker("unit")}
            allowDoublePress
            className={`${FIELD} w-20 justify-between pl-5 pr-3.5 active:opacity-80`}
          >
            <Text
              className={`font-display-normal text-base ${
                draft.unit ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {draft.unit ?? "Unit"}
            </Text>
            {canEdit ? <CaretDownIcon size={9} color={palette.foreground} /> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`When: ${urgency?.label}${canEdit ? ". Change" : ""}`}
            disabled={!canEdit}
            onPress={() => openPicker("urgency")}
            allowDoublePress
            className={`${FIELD} ml-auto w-36 justify-between px-3.5 active:opacity-80`}
          >
            <ClockIcon size={16} color={palette.foreground} />
            <Text className="font-display-normal text-base text-foreground">{urgency?.label}</Text>
            {canEdit ? (
              <CaretDownIcon size={9} color={palette.foreground} />
            ) : (
              <View style={{ width: 9 }} />
            )}
          </Pressable>
        </View>

        <SheetTextInput
          accessibilityLabel="Note"
          editable={canEdit}
          returnKeyType="done"
          maxLength={ITEM_NOTE_MAX_LENGTH}
          placeholder={canEdit ? "(optional) brand, size, anything" : "No note"}
          placeholderTextColor={palette.mutedForeground}
          value={draft.note}
          onChangeText={form.setNote}
          className="h-12 rounded-xl bg-muted px-5 font-display-normal text-foreground"
          style={INPUT_STYLE}
        />

        {keyboardVisible ? null : (
          <>
            <View
              accessible
              accessibilityLabel={`Last edited by ${editorName}`}
              className="max-w-full items-end gap-1 self-end"
            >
              <Text className="font-display-normal text-[11px] text-muted-foreground">
                Last edited by
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Avatar
                  name={editor?.displayName ?? editorName}
                  url={editor?.avatarUrl ?? null}
                  size={16}
                />
                <Text
                  numberOfLines={1}
                  className="shrink font-display-medium text-xs text-foreground"
                >
                  {editorName}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              {storeSearchLinks(searchName).map((store) => (
                <Pressable
                  key={store.id}
                  accessibilityRole="link"
                  accessibilityLabel={`Search ${store.name} for ${searchName}`}
                  onPress={() => void handleOpenStore(store.url)}
                  className="h-12 grow flex-row items-center justify-center gap-1.5 rounded-xl border border-border px-1.5 active:bg-muted"
                >
                  <Image
                    source={STORE_LOGOS[store.id]}
                    accessibilityIgnoresInvertColors
                    style={{ width: 18, height: 18, borderRadius: 6 }}
                  />
                  <Text numberOfLines={1} className="font-display-medium text-sm text-foreground">
                    {store.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {footer}

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
        selectedId={draft.categoryId}
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
        selectedId={draft.unit ?? NO_UNIT}
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
        options={ITEM_URGENCY_OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
        selectedId={draft.urgency}
        onSelect={(id) => {
          const option = ITEM_URGENCY_OPTIONS.find((o) => o.value === id);
          if (option) form.setUrgency(option.value);
          closePicker();
        }}
      />
    </>
  );
}
