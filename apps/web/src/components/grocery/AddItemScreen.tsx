"use client";

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
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  PlusCircleIcon,
} from "@kinwoo/icons";
import { ItemCategoryImage, ListIconImage } from "@/components/CategoryImages";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

import { NewListSheet } from "./NewListSheet";
import { OptionSheet, type SheetOption } from "./OptionSheet";

type Picker = "list" | "category" | "unit" | "urgency";

const NO_UNIT = "__none__";
const NEW_LIST = "__new_list__";

const FIELD =
  "flex h-12 items-center rounded-xl bg-muted font-display text-base font-normal text-foreground focus-within:outline-2 focus-within:outline-foreground";
const FIELD_BUTTON =
  "gap-2 px-3.5 transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function AddItemScreen({ listId }: { listId: string | null }) {
  const { activeHouse, ready } = useActiveHouse();
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, !closing, () => setClosing(true));
  const [addAnother, setAddAnother] = useState(true);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const form = useAddItemForm({
    houseId: activeHouse?.house.id ?? "",
    listId,
    onAdded: (mode) => {
      if (mode === "close") {
        setClosing(true);
      } else {
        nameRef.current?.focus();
      }
    },
  });

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  const submit = () => void form.submit(addAnother ? "again" : "close");

  const activeList = form.lists.find((list) => list.id === form.listId);
  const category = form.categories.find((c) => c.id === form.categoryId);
  const urgency = ITEM_URGENCY_OPTIONS.find((option) => option.value === form.urgency);

  const unitOptions: SheetOption[] = [
    { id: NO_UNIT, label: "No unit" },
    ...itemUnitOptions(form.unit).map((unit) => ({
      id: unit.value,
      label: unit.label,
      detail: unit.label === unit.value ? undefined : unit.value,
    })),
  ];

  const closePicker = () => setPicker(null);

  return (
    <main
      ref={screenRef}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "form-screen-out" : "form-screen-in",
      )}
    >
      <form
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center pb-12 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={() => setClosing(true)}
            className={cn(
              "flex size-10 items-center justify-start hover:cursor-pointer",
              FOCUS_RING,
            )}
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
          <h1 className="flex min-w-0 items-center justify-center font-display text-lg text-foreground">
            {form.lists.length > 1 ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Adding to ${activeList?.name ?? ""}. Change list`}
                onClick={() => setPicker("list")}
                className={cn("flex min-w-0 items-center gap-3 hover:cursor-pointer", FOCUS_RING)}
              >
                <em className="truncate underline">{activeList?.name}</em>
                <CaretDownIcon size={9} />
              </button>
            ) : (
              <em className="truncate underline">{activeList?.name}</em>
            )}
          </h1>
          <button
            type="submit"
            aria-label={addAnother ? "Add item and keep adding" : "Add item"}
            disabled={!form.canSubmit || closing || form.pendingMode !== null}
            className={cn(
              "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
              FOCUS_RING,
            )}
          >
            <CheckCircleIcon size={26} />
          </button>
        </header>

        <div className="space-y-8 pb-8">
          <div>
            <div className="flex gap-3">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Category: ${category?.name ?? "none"}. Change category`}
                onClick={() => setPicker("category")}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80",
                  FOCUS_RING,
                )}
              >
                <ItemCategoryImage name={category?.name} size={40} />
              </button>
              <label htmlFor="item-name" className="sr-only">
                Item name
              </label>
              <input
                id="item-name"
                ref={nameRef}
                type="text"
                autoFocus
                autoComplete="off"
                enterKeyHint="done"
                maxLength={ITEM_NAME_MAX_LENGTH}
                placeholder="What do you wanna buy?"
                value={form.name}
                onChange={(event) => form.setName(event.target.value)}
                aria-invalid={form.error ? true : undefined}
                aria-describedby={form.error || form.duplicate ? "item-name-hint" : undefined}
                className={cn(
                  FIELD,
                  "min-w-0 flex-1 px-5 outline-none placeholder:text-muted-foreground",
                )}
              />
            </div>
            {form.error || form.duplicate ? (
              <p
                id="item-name-hint"
                role={form.error ? "alert" : undefined}
                className={cn(
                  "mt-2 text-right font-display text-sm font-normal",
                  form.error ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {form.error ?? (
                  <>
                    <em className="font-medium italic">{form.duplicate?.name}</em> is already on the
                    list
                  </>
                )}
              </p>
            ) : null}

            {form.suggestions.length > 0 ? (
              <div className="mt-4">
                <div className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>:first-child]:ml-auto">
                  {form.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      onClick={() => {
                        form.applySuggestion(suggestion);
                        nameRef.current?.focus();
                      }}
                      className={cn(
                        "shrink-0 rounded-full border border-dashed border-border px-3.5 py-2 font-display text-sm font-medium text-foreground transition-colors hover:cursor-pointer hover:bg-muted",
                        FOCUS_RING,
                      )}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="item-qty" className="sr-only">
              Quantity
            </label>
            <input
              id="item-qty"
              type="text"
              inputMode="decimal"
              maxLength={ITEM_QUANTITY_MAX_LENGTH}
              autoComplete="off"
              placeholder="Qty"
              value={form.quantity}
              onChange={(event) => form.setQuantity(event.target.value)}
              className={cn(
                FIELD,
                "w-20 shrink-0 justify-center text-center outline-none placeholder:text-muted-foreground",
              )}
            />
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Unit: ${form.unit ?? "none"}. Change unit`}
              onClick={() => setPicker("unit")}
              className={cn(FIELD, FIELD_BUTTON, "w-20 shrink-0 justify-between pl-5")}
            >
              <span className={form.unit ? undefined : "text-muted-foreground"}>
                {form.unit ?? "Unit"}
              </span>
              <CaretDownIcon size={9} />
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`When: ${urgency?.label}. Change`}
              onClick={() => setPicker("urgency")}
              className={cn(FIELD, FIELD_BUTTON, "ml-auto w-36 justify-between")}
            >
              <ClockIcon size={16} />
              <span>{urgency?.label}</span>
              <CaretDownIcon size={9} />
            </button>
          </div>

          <div>
            <label htmlFor="item-note" className="sr-only">
              Note
            </label>
            <input
              id="item-note"
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              maxLength={ITEM_NOTE_MAX_LENGTH}
              placeholder="(optional) brand, size, anything"
              value={form.note}
              onChange={(event) => form.setNote(event.target.value)}
              className={cn(FIELD, "w-full px-5 outline-none placeholder:text-muted-foreground")}
            />
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={addAnother}
            onClick={() => setAddAnother((value) => !value)}
            className={cn(
              "ml-auto flex w-fit items-center gap-3 font-display text-base font-normal text-foreground hover:cursor-pointer",
              FOCUS_RING,
            )}
          >
            add another item
            <span
              aria-hidden
              className={cn(
                "flex size-5 items-center justify-center rounded-md",
                addAnother ? "bg-foreground text-background" : "border border-border",
              )}
            >
              {addAnother ? <CheckIcon size={10} /> : null}
            </span>
          </button>
        </div>
      </form>

      <OptionSheet
        open={picker === "list"}
        onClose={closePicker}
        title="Choose a list"
        columns={3}
        options={[
          ...form.lists.map((list) => ({
            id: list.id,
            label: list.name,
            icon: <ListIconImage label={listIconOption(list.icon).label} size={36} />,
          })),
          { id: NEW_LIST, label: "New list", icon: <PlusCircleIcon size={24} />, dashed: true },
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
        onCreated={form.setListId}
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
          icon: <ItemCategoryImage name={c.name} size={48} />,
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
        options={ITEM_URGENCY_OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
        selectedId={form.urgency}
        onSelect={(id) => {
          const option = ITEM_URGENCY_OPTIONS.find((o) => o.value === id);
          if (option) form.setUrgency(option.value);
          closePicker();
        }}
      />
    </main>
  );
}
