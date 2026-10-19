"use client";

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
} from "@kinwoo/icons";
import { useEffect, useState, type AnimationEvent } from "react";

import { PayerSheet } from "@/components/expenses/PayerSheet";
import { SplitSheet } from "@/components/expenses/SplitSheet";
import { useHouseNavigation } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

import { CategoryIcon } from "./CategoryIcon";
import { DatePickerSheet } from "./DatePickerSheet";
import { OptionSheet, type SheetOption } from "./OptionSheet";

type Picker = "category" | "unit" | "date" | "payers" | "split";

const NO_UNIT = "__none__";

const FIELD =
  "flex h-12 items-center rounded-xl bg-muted font-display text-base text-foreground focus-within:outline-2 focus-within:outline-foreground";
const FIELD_BUTTON =
  "gap-2 px-3.5 transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function MarkBoughtScreen({
  listId,
  itemId,
}: {
  listId: string | null;
  itemId: string | null;
}) {
  const { user } = useAuth();
  const { activeHouse, ready } = useActiveHouse();
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [split, setSplit] = useState(true);
  const houseId = activeHouse?.house.id ?? "";

  const { data: item } = useGroceryItem(houseId || null, listId, itemId);
  const { data: list } = useGroceryList(houseId || null, listId);
  const canEdit =
    !!item &&
    (activeHouse?.role === "admin" || item.createdBy === user?.id || item.claimedBy === user?.id);
  const form = useMarkBoughtForm({
    houseId,
    listId: listId ?? "",
    item,
    canEdit,
    onBought: () => setClosing(true),
  });

  const payers = usePayerSplit({ houseId, currentUserId: user?.id ?? null, price: form.price });
  const expenseSplit = useExpenseSplit({ members: payers.members, totalPaise: payers.totalPaise });

  useEffect(() => {
    if ((ready && !activeHouse) || !listId || !itemId) goHome();
  }, [ready, activeHouse, listId, itemId, goHome]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  // Private lists stay private, so their purchases are never split into expenses.
  const showSplit = payers.totalPaise > 0 && list?.visibility === "shared";
  const dateLabel = formatPickedDate(form.date);
  const category = form.categories.find((c) => c.id === form.categoryId);
  const closePicker = () => setPicker(null);

  const unitOptions: SheetOption[] = [
    { id: NO_UNIT, label: "No unit" },
    ...itemUnitOptions(form.unit).map((unit) => ({
      id: unit.value,
      label: unit.label,
      detail: unit.label === unit.value ? undefined : unit.value,
    })),
  ];

  return (
    <main
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <form
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit(split && showSplit ? expensePartsFromForms(payers, expenseSplit) : null);
        }}
      >
        <header className="flex items-center justify-between pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))]">
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
          <button
            type="submit"
            aria-label="Mark as bought"
            disabled={!form.canSubmit || closing}
            className={cn(
              "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
              FOCUS_RING,
            )}
          >
            <CheckCircleIcon size={26} />
          </button>
        </header>

        <div className="space-y-5">
          <div>
            <div className="flex gap-3">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Category: ${category?.name ?? "none"}. Change category`}
                disabled={!canEdit}
                onClick={() => setPicker("category")}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80 disabled:cursor-default disabled:opacity-100",
                  FOCUS_RING,
                )}
              >
                <CategoryIcon name={category?.name} size={26} />
              </button>
              <label htmlFor="bought-name" className="sr-only">
                Item name
              </label>
              <input
                id="bought-name"
                type="text"
                autoComplete="off"
                enterKeyHint="done"
                readOnly={!canEdit}
                maxLength={ITEM_NAME_MAX_LENGTH}
                placeholder="Item name"
                value={form.name}
                onChange={(event) => form.setName(event.target.value)}
                aria-invalid={form.nameError ? true : undefined}
                aria-describedby={form.nameError ? "bought-name-hint" : undefined}
                className={cn(
                  FIELD,
                  "min-w-0 flex-1 px-5 outline-none placeholder:text-muted-foreground",
                )}
              />
            </div>
            {form.nameError ? (
              <p
                id="bought-name-hint"
                role="alert"
                className="mt-2 text-right font-display text-sm text-destructive"
              >
                {form.nameError}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="bought-qty" className="sr-only">
              Quantity
            </label>
            <input
              id="bought-qty"
              type="text"
              inputMode="decimal"
              maxLength={ITEM_QUANTITY_MAX_LENGTH}
              autoComplete="off"
              placeholder="Qty"
              value={form.quantity}
              onChange={(event) => form.setQuantity(event.target.value)}
              className={cn(
                FIELD,
                "w-20 shrink-0 justify-center px-2 text-center outline-none placeholder:text-muted-foreground",
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
              aria-label={`Date bought: ${dateLabel}. Change date`}
              onClick={() => setPicker("date")}
              className={cn(FIELD, FIELD_BUTTON, "min-w-0 flex-1")}
            >
              <CalendarIcon size={16} />
              <span>{dateLabel}</span>
            </button>
          </div>

          <div className="py-3">
            <label
              htmlFor="bought-price"
              className="flex items-center gap-3 border-b border-border pb-1 font-display text-foreground"
            >
              <span className="sr-only">Amount paid</span>
              <RupeeIcon size={28} />
              <input
                id="bought-price"
                type="text"
                inputMode="decimal"
                autoFocus
                autoComplete="off"
                enterKeyHint="done"
                placeholder="0.00"
                value={form.price}
                onChange={(event) => form.setPrice(event.target.value)}
                aria-invalid={form.priceError ? true : undefined}
                aria-describedby={form.priceError ? "bought-price-hint" : undefined}
                className="h-11 min-w-0 flex-1 bg-transparent text-[34px] font-medium outline-none placeholder:text-muted-foreground"
              />
            </label>
            {form.priceError ? (
              <p
                id="bought-price-hint"
                role="alert"
                className="mt-2 font-display text-sm text-destructive"
              >
                {form.priceError}
              </p>
            ) : null}
          </div>

          <div
            inert={!showSplit}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              showSplit ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            {/* Padding keeps focus outlines from being clipped by the collapse. */}
            <div className="-m-1 min-h-0 overflow-hidden p-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={split}
                onClick={() => setSplit((value) => !value)}
                className={cn(
                  "flex w-fit items-center gap-3 font-display text-base text-foreground hover:cursor-pointer",
                  FOCUS_RING,
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 items-center justify-center rounded-[6px]",
                    split ? "bg-foreground text-background" : "border border-border",
                  )}
                >
                  {split ? <CheckIcon size={10} /> : null}
                </span>
                I want to split expenses
              </button>

              <div
                inert={!split}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                  split ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-3 pt-4 font-display text-base">
                    <span className="text-muted-foreground">Paid by</span>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Paid by ${payers.label}. Change who paid`}
                      onClick={() => setPicker("payers")}
                      className={cn(
                        "rounded-lg bg-muted px-3.5 py-1.5 font-medium text-foreground transition-opacity hover:cursor-pointer hover:opacity-80",
                        FOCUS_RING,
                      )}
                    >
                      {payers.label}
                    </button>
                    <span className="text-muted-foreground">and split</span>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Split ${expenseSplit.label.toLowerCase()}. Change how it is split`}
                      onClick={() => setPicker("split")}
                      className={cn(
                        "rounded-lg bg-muted px-3.5 py-1.5 font-medium text-foreground transition-opacity hover:cursor-pointer hover:opacity-80",
                        FOCUS_RING,
                      )}
                    >
                      {expenseSplit.label}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

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
          icon: <CategoryIcon name={c.name} size={32} />,
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
    </main>
  );
}
