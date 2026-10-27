"use client";

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
import { CaretDownIcon, CheckCircleIcon, ClockIcon, CloseIcon } from "@kinwoo/icons";
import { ItemCategoryImage } from "@/components/CategoryImages";
import Image from "next/image";
import { useState, type ReactNode } from "react";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

import { OptionSheet, type SheetOption } from "./OptionSheet";

type Picker = "category" | "unit" | "urgency";

const NO_UNIT = "__none__";

const STORE_LOGOS: Record<StoreId, string> = {
  blinkit: "/images/blinkit.jpeg",
  zepto: "/images/zepto.jpeg",
  instamart: "/images/instamart.jpeg",
};

const FIELD =
  "flex h-12 items-center rounded-xl bg-muted font-display text-base font-normal text-foreground focus-within:outline-2 focus-within:outline-foreground";
const FIELD_BUTTON =
  "gap-2 px-3.5 transition-opacity enabled:hover:cursor-pointer enabled:hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
export const ICON_BUTTON =
  "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:cursor-pointer hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

// Footer actions act on the item as shown, so unsaved edits go in first.
export async function saveItemEdits(form: EditItemForm, canEdit: boolean): Promise<boolean> {
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
  const [picker, setPicker] = useState<Picker | null>(null);

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
  const closePicker = () => setPicker(null);

  const handleSave = async () => {
    if (!form.dirty) return;
    if (await form.save()) {
      toast.success("Changes saved");
      onClose();
    }
  };

  return (
    <>
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={cn(
              "-ml-2 flex size-10 items-center justify-center text-foreground transition-opacity hover:cursor-pointer hover:opacity-70",
              FOCUS_RING,
            )}
          >
            <CloseIcon size={22} />
          </button>
          <span />
          {canEdit ? (
            <button
              type="submit"
              aria-label="Save changes"
              disabled={!form.dirty || form.saving}
              className={cn(
                "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                FOCUS_RING,
              )}
            >
              <CheckCircleIcon size={26} />
            </button>
          ) : null}
        </header>

        <div>
          <div className="flex gap-3">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Category: ${category?.name ?? "none"}${canEdit ? ". Change category" : ""}`}
              disabled={!canEdit}
              onClick={() => setPicker("category")}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity enabled:hover:cursor-pointer enabled:hover:opacity-80",
                FOCUS_RING,
              )}
            >
              <ItemCategoryImage name={category?.name} size={40} />
            </button>
            <label htmlFor="edit-item-name" className="sr-only">
              Item name
            </label>
            <input
              id="edit-item-name"
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              readOnly={!canEdit}
              maxLength={ITEM_NAME_MAX_LENGTH}
              placeholder="What do you wanna buy?"
              value={draft.name}
              onChange={(event) => form.setName(event.target.value)}
              aria-invalid={form.error ? true : undefined}
              aria-describedby={form.error ? "edit-item-name-error" : undefined}
              className={cn(
                FIELD,
                "min-w-0 flex-1 px-5 outline-none placeholder:text-muted-foreground",
              )}
            />
          </div>
          {form.error ? (
            <p
              id="edit-item-name-error"
              role="alert"
              className="mt-2 text-right font-display text-sm font-normal text-destructive"
            >
              {form.error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="edit-item-qty" className="sr-only">
            Quantity
          </label>
          <input
            id="edit-item-qty"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            readOnly={!canEdit}
            maxLength={ITEM_QUANTITY_MAX_LENGTH}
            placeholder="Qty"
            value={draft.quantity}
            onChange={(event) => form.setQuantity(event.target.value)}
            className={cn(
              FIELD,
              "w-20 shrink-0 justify-center text-center outline-none placeholder:text-muted-foreground",
            )}
          />
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Unit: ${draft.unit ?? "none"}${canEdit ? ". Change unit" : ""}`}
            disabled={!canEdit}
            onClick={() => setPicker("unit")}
            className={cn(FIELD, FIELD_BUTTON, "w-20 shrink-0 justify-between pl-5")}
          >
            <span className={draft.unit ? undefined : "text-muted-foreground"}>
              {draft.unit ?? "Unit"}
            </span>
            {canEdit ? <CaretDownIcon size={9} /> : null}
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`When: ${urgency?.label}${canEdit ? ". Change" : ""}`}
            disabled={!canEdit}
            onClick={() => setPicker("urgency")}
            className={cn(FIELD, FIELD_BUTTON, "ml-auto w-36 justify-between")}
          >
            <ClockIcon size={16} />
            <span>{urgency?.label}</span>
            {canEdit ? <CaretDownIcon size={9} /> : <span aria-hidden className="w-[9px]" />}
          </button>
        </div>

        <div>
          <label htmlFor="edit-item-note" className="sr-only">
            Note
          </label>
          <input
            id="edit-item-note"
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            readOnly={!canEdit}
            maxLength={ITEM_NOTE_MAX_LENGTH}
            placeholder={canEdit ? "(optional) brand, size, anything" : "No note"}
            value={draft.note}
            onChange={(event) => form.setNote(event.target.value)}
            className={cn(FIELD, "w-full px-5 outline-none placeholder:text-muted-foreground")}
          />
        </div>

        <div className="ml-auto flex w-fit max-w-full flex-col items-end gap-1">
          <span className="font-display text-[calc(11px*var(--font-scale,1))] font-normal text-muted-foreground">
            Last edited by
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar
              name={editor?.displayName ?? editorName}
              url={editor?.avatarUrl ?? null}
              size={16}
            />
            <span className="truncate font-display text-xs font-medium text-foreground">
              {editorName}
            </span>
          </span>
        </div>

        <div className="flex gap-2">
          {storeSearchLinks(searchName).map((store) => (
            <a
              key={store.id}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Search ${store.name} for ${searchName} (opens in a new tab)`}
              className={cn(
                "flex h-12 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border px-1.5 font-display text-sm font-medium text-foreground transition-colors hover:cursor-pointer hover:bg-muted",
                FOCUS_RING,
              )}
            >
              <Image
                src={STORE_LOGOS[store.id]}
                alt=""
                width={18}
                height={18}
                className="size-[18px] shrink-0 rounded-md"
              />
              {store.name}
            </a>
          ))}
        </div>
      </form>

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
          icon: <ItemCategoryImage name={c.name} size={48} />,
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
