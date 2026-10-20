"use client";

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
} from "@kinwoo/icons";
import { useState, type AnimationEvent } from "react";

import { DatePickerSheet } from "@/components/grocery/DatePickerSheet";
import { OptionSheet } from "@/components/grocery/OptionSheet";
import { useHouseNavigation } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

import { PayerSheet } from "./PayerSheet";
import { SplitSheet } from "./SplitSheet";

type Picker = "category" | "date" | "payers" | "split";

const FIELD =
  "flex h-12 items-center rounded-xl bg-muted font-display text-base text-foreground focus-within:outline-2 focus-within:outline-foreground";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const CHIP =
  "rounded-lg bg-muted px-3.5 py-1.5 font-medium text-foreground transition-opacity hover:cursor-pointer hover:opacity-80";

export function ExpenseFormScreen({
  houseId,
  expense,
}: {
  houseId: string;
  expense?: Expense | null;
}) {
  const { user } = useAuth();
  const { goBack } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const form = useExpenseForm({
    houseId,
    currentUserId: user?.id ?? null,
    expense,
    onSaved: () => setClosing(true),
  });
  const { payers, split } = form;
  const [noteOpen, setNoteOpen] = useState(Boolean(expense?.note));

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  const dateLabel = formatPickedDate(form.date);
  const closePicker = () => setPicker(null);
  const heading = form.isEditing ? "Edit expense" : "Add expense";

  return (
    <main
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "form-screen-out" : "form-screen-in",
      )}
    >
      <form
        className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-6 pb-10"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <header className="flex items-center justify-between pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
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
          <h1 className="font-display text-lg font-medium text-foreground">{heading}</h1>
          <button
            type="submit"
            aria-label={form.isEditing ? "Save expense" : "Add expense"}
            aria-busy={form.submitting || undefined}
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
                aria-label={`Category: ${EXPENSE_CATEGORY_LABELS[form.category]}. Change category`}
                onClick={() => setPicker("category")}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80",
                  FOCUS_RING,
                )}
              >
                <ExpenseCategoryIcon category={form.category} size={24} />
              </button>
              <label htmlFor="expense-title" className="sr-only">
                Title
              </label>
              <input
                id="expense-title"
                type="text"
                autoFocus={!form.isEditing}
                autoComplete="off"
                enterKeyHint="next"
                maxLength={EXPENSE_TITLE_MAX}
                placeholder="What was it for?"
                value={form.title}
                onChange={(event) => form.setTitle(event.target.value)}
                aria-invalid={form.titleError ? true : undefined}
                aria-describedby={form.titleError ? "expense-title-hint" : undefined}
                className={cn(
                  FIELD,
                  "min-w-0 flex-1 px-5 outline-none placeholder:text-muted-foreground",
                )}
              />
            </div>
            {form.titleError ? (
              <p
                id="expense-title-hint"
                role="alert"
                className="mt-2 text-right font-display text-sm text-destructive"
              >
                {form.titleError}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="expense-amount"
                className="flex items-center gap-3 border-b border-border pb-1 font-display text-foreground"
              >
                <span className="sr-only">Amount</span>
                <RupeeIcon size={28} />
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) => form.setAmount(event.target.value)}
                  aria-invalid={form.amountError ? true : undefined}
                  aria-describedby={form.amountError ? "expense-amount-hint" : undefined}
                  className="h-11 min-w-0 flex-1 bg-transparent text-[34px] font-medium outline-none placeholder:text-muted-foreground"
                />
              </label>
              {form.amountError ? (
                <p
                  id="expense-amount-hint"
                  role="alert"
                  className="mt-2 font-display text-sm text-destructive"
                >
                  {form.amountError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Date: ${dateLabel}. Change date`}
              onClick={() => setPicker("date")}
              className={cn(
                FIELD,
                "w-36 shrink-0 gap-2 px-3.5 transition-opacity hover:cursor-pointer hover:opacity-80",
                FOCUS_RING,
              )}
            >
              <CalendarIcon size={16} />
              <span>{dateLabel}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-3 font-display text-base">
            <span className="text-muted-foreground">Paid by</span>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Paid by ${payers.label}. Change who paid`}
              onClick={() => setPicker("payers")}
              className={cn(CHIP, FOCUS_RING)}
            >
              {payers.label}
            </button>
            <span className="text-muted-foreground">and split</span>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Split ${split.label.toLowerCase()}. Change how it is split`}
              onClick={() => setPicker("split")}
              className={cn(CHIP, FOCUS_RING)}
            >
              {split.label}
            </button>
          </div>

          <div>
            <button
              type="button"
              aria-expanded={noteOpen}
              aria-controls="expense-note"
              onClick={() => setNoteOpen((open) => !open)}
              className={cn(
                "flex items-center gap-2 py-1 font-display text-base text-muted-foreground transition-opacity hover:cursor-pointer hover:opacity-80",
                FOCUS_RING,
              )}
            >
              <ArrowRightIcon size={18} className={noteOpen ? "rotate-90" : undefined} />
              {form.note && !noteOpen ? "Note added" : "Add a note"}
            </button>
            <label htmlFor="expense-note" className="sr-only">
              Note
            </label>
            <div
              inert={!noteOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                noteOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              {/* Padding keeps the focus outline from being clipped by the collapse. */}
              <div className="-m-1 min-h-0 overflow-hidden p-1">
                <textarea
                  id="expense-note"
                  rows={2}
                  maxLength={EXPENSE_NOTE_MAX}
                  placeholder="e.g. Electricity bill for March, paid via UPI"
                  value={form.note}
                  onChange={(event) => form.setNote(event.target.value)}
                  aria-invalid={form.noteError ? true : undefined}
                  aria-describedby={form.noteError ? "expense-note-hint" : undefined}
                  className="mt-2 block w-full resize-none rounded-xl bg-muted px-5 py-3 font-display text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-foreground"
                />
              </div>
            </div>
            {form.noteError ? (
              <p
                id="expense-note-hint"
                role="alert"
                className="mt-2 font-display text-sm text-destructive"
              >
                {form.noteError}
              </p>
            ) : null}
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
        options={EXPENSE_CATEGORIES.map((category) => ({
          id: category,
          label: EXPENSE_CATEGORY_LABELS[category],
          icon: <ExpenseCategoryIcon category={category} size={32} />,
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
    </main>
  );
}
