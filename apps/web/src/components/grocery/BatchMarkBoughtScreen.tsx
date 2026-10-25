"use client";

import { useAuth } from "@kinwoo/client/auth";
import { expensePartsFromForms, useExpenseSplit, usePayerSplit } from "@kinwoo/client/expenses";
import { useBatchMarkBoughtForm, useGroceryList } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { BATCH_NAME_MAX_LENGTH, MIN_BATCH_ITEMS, type GroceryItem } from "@kinwoo/core/grocery";
import { ArrowRightIcon, BasketIcon, CheckCircleIcon, CheckIcon, RupeeIcon } from "@kinwoo/icons";
import { ItemCategoryImage } from "@/components/CategoryImages";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { PayerSheet } from "@/components/expenses/PayerSheet";
import { SplitSheet } from "@/components/expenses/SplitSheet";
import { useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { ItemFormSkeleton } from "@/components/skeleton/skeletons";
import { cn } from "@/lib/utils";

type Picker = "payers" | "split";

const FIELD =
  "flex h-12 items-center rounded-xl bg-muted font-display text-base font-normal text-foreground focus-within:outline-2 focus-within:outline-foreground";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

function quantityUnit(item: GroceryItem): string {
  return [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function BatchMarkBoughtScreen({
  listId,
  itemIds,
}: {
  listId: string | null;
  itemIds: string[];
}) {
  const { user } = useAuth();
  const { activeHouse, ready } = useActiveHouse();
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, !closing, () => setClosing(true));
  const [picker, setPicker] = useState<Picker | null>(null);
  const [split, setSplit] = useState(true);
  const houseId = activeHouse?.house.id ?? "";
  const { data: list } = useGroceryList(houseId || null, listId);
  const invalidLink = !listId || itemIds.length < MIN_BATCH_ITEMS;

  const form = useBatchMarkBoughtForm({
    houseId,
    listId: listId ?? "",
    itemIds,
    currentUserId: user?.id ?? "",
    currentUserName: user?.user_metadata?.displayName ?? user?.email ?? null,
    onBought: () => setClosing(true),
  });

  const payers = usePayerSplit({ houseId, currentUserId: user?.id ?? null, price: form.total });
  const expenseSplit = useExpenseSplit({ members: payers.members, totalPaise: payers.totalPaise });

  useEffect(() => {
    if ((ready && !activeHouse) || invalidLink) goHome();
  }, [ready, activeHouse, invalidLink, goHome]);

  useEffect(() => {
    if (!form.unavailable) return;
    toast.error("Those items are no longer waiting to be bought.");
    goBack();
  }, [form.unavailable, goBack]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  // Private lists stay private, so their purchases are never split into expenses.
  const showSplit = payers.totalPaise > 0 && list?.visibility === "shared";
  const closePicker = () => setPicker(null);

  return (
    <main
      ref={screenRef}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex min-h-dvh flex-col bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <form
        noValidate
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]"
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
            aria-label={`Mark ${form.items.length} items as bought`}
            disabled={!form.canSubmit || closing}
            className={cn(
              "flex size-10 items-center justify-end text-foreground transition-opacity hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
              FOCUS_RING,
            )}
          >
            <CheckCircleIcon size={26} />
          </button>
        </header>
        {!form.ready ? (
          <ItemFormSkeleton variant="batch" />
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
                >
                  <BasketIcon size={24} />
                </span>
                <label htmlFor="batch-name" className="sr-only">
                  Group name (optional)
                </label>
                <input
                  id="batch-name"
                  type="text"
                  autoComplete="off"
                  enterKeyHint="next"
                  maxLength={BATCH_NAME_MAX_LENGTH}
                  placeholder="Group name"
                  value={form.name}
                  onChange={(event) => form.setName(event.target.value)}
                  aria-invalid={form.nameError ? true : undefined}
                  aria-describedby={form.nameError ? "batch-name-hint" : undefined}
                  className={cn(
                    FIELD,
                    "min-w-0 flex-1 px-5 outline-none placeholder:text-muted-foreground",
                  )}
                />
              </div>
              {form.nameError ? (
                <p
                  id="batch-name-hint"
                  role="alert"
                  className="mt-2 text-right font-display text-sm font-normal text-destructive"
                >
                  {form.nameError}
                </p>
              ) : null}
            </div>

            <div className="py-3">
              <label
                htmlFor="batch-total"
                className="flex items-center gap-3 border-b border-border pb-1 font-display text-foreground"
              >
                <span className="sr-only">Total paid</span>
                <RupeeIcon size={28} />
                <input
                  id="batch-total"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="0.00"
                  value={form.total}
                  onChange={(event) => form.setTotal(event.target.value)}
                  aria-invalid={form.totalError ? true : undefined}
                  aria-describedby={form.totalError ? "batch-total-hint" : undefined}
                  className="h-11 min-w-0 flex-1 bg-transparent text-[calc(34px*var(--font-scale,1))] font-medium outline-none placeholder:text-muted-foreground"
                />
              </label>
              {form.totalError ? (
                <p
                  id="batch-total-hint"
                  role="alert"
                  className="mt-2 font-display text-sm font-normal text-destructive"
                >
                  {form.totalError}
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
                    "flex w-fit items-center gap-3 font-display text-base font-normal text-foreground hover:cursor-pointer",
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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 pt-4 font-display text-base font-normal">
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

            {form.items.length > 0 ? (
              <div role="group" aria-labelledby="batch-items-label" className={"pt-6"}>
                <p
                  id="batch-items-label"
                  className="pb-5 font-display text-sm font-normal text-muted-foreground"
                >
                  {form.items.length} items
                </p>
                <p
                  role="status"
                  className="mb-5 font-display text-sm font-normal text-warning empty:hidden"
                >
                  {form.amountMismatch}
                </p>
                <ul className="space-y-7">
                  {form.items.map((item) => {
                    const inputId = `batch-item-${item.id}`;
                    const error = form.itemErrorOf(item.id);
                    const detail = quantityUnit(item);
                    return (
                      <li key={item.id}>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
                          >
                            <ItemCategoryImage name={item.categoryName ?? undefined} size={40} />
                          </span>
                          <label
                            htmlFor={inputId}
                            className="min-w-0 flex-1 font-display font-normal"
                          >
                            <span className="block truncate text-base text-foreground">
                              {item.name}
                            </span>
                            {detail ? (
                              <span className="block truncate text-sm text-muted-foreground">
                                {detail}
                              </span>
                            ) : null}
                          </label>
                          <div className={cn(FIELD, "w-28 shrink-0 gap-1.5 px-3")}>
                            <RupeeIcon size={14} className="shrink-0 text-muted-foreground" />
                            <input
                              id={inputId}
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder="0.00"
                              value={form.amountOf(item.id)}
                              onChange={(event) => form.setAmount(item.id, event.target.value)}
                              aria-invalid={error ? true : undefined}
                              aria-describedby={error ? `${inputId}-hint` : undefined}
                              className="h-full min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        {error ? (
                          <p
                            id={`${inputId}-hint`}
                            role="alert"
                            className="mt-2 text-right font-display text-sm font-normal text-destructive"
                          >
                            {error}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </form>

      <PayerSheet open={picker === "payers"} onClose={closePicker} payers={payers} />
      <SplitSheet open={picker === "split"} onClose={closePicker} split={expenseSplit} />
    </main>
  );
}
