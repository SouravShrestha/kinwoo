import {
  amountErrorMessage,
  BATCH_NAME_MAX_LENGTH,
  batchNameErrorMessage,
  boughtGroupLabel,
  formatPaise,
  MIN_BATCH_ITEMS,
  parseRupeesToPaise,
  validateBatchName,
  type GroceryItem,
} from "@kinwoo/core/grocery";
import { useMemo, useState } from "react";

import { toast } from "../toast";
import { groceryErrorFromCause } from "./errors";
import { useMarkItemsBought } from "./mutations";
import { useGroceryItems } from "./queries";

// Long first names are shortened so the prefilled name always passes batch name validation.
function prefilledName(names: readonly string[]): string {
  const label = boughtGroupLabel(names);
  if (Array.from(label).length <= BATCH_NAME_MAX_LENGTH) return label;
  const suffix = boughtGroupLabel(["", ...names.slice(1)]);
  const room = BATCH_NAME_MAX_LENGTH - Array.from(suffix).length - 1;
  return `${Array.from(names[0] ?? "")
    .slice(0, room)
    .join("")
    .trimEnd()}…${suffix}`;
}

// Item amounts may legitimately differ from the total (bags, discounts), so this only warns.
// Unpriced items can account for a shortfall, so "less" is only reported once all are priced.
function amountMismatch(totalPaise: number | null, prices: (number | null)[] | null) {
  if (totalPaise === null || !prices || prices.every((price) => price === null)) return null;
  const sum = prices.reduce<number>((acc, price) => acc + (price ?? 0), 0);
  const allPriced = prices.every((price) => price !== null);
  const added = `Item amounts add up to ${formatPaise(sum)}`;
  const total = `the ${formatPaise(totalPaise)} total`;
  if (sum > totalPaise) {
    return `${added}, ${formatPaise(sum - totalPaise)} more than ${total}.`;
  }
  if (allPriced && sum < totalPaise) {
    return `${added}, ${formatPaise(totalPaise - sum)} less than ${total}.`;
  }
  return null;
}

// Items are snapshotted on first load: marking them bought flips them optimistically in the
// cache, and the screen keeps showing them while it closes. Split inputs are UI only for now.
export function useBatchMarkBoughtForm({
  houseId,
  listId,
  itemIds,
  currentUserId,
  currentUserName,
  onBought,
}: {
  houseId: string;
  listId: string;
  itemIds: readonly string[];
  currentUserId: string;
  currentUserName: string | null;
  onBought: () => void;
}) {
  const itemsQuery = useGroceryItems(houseId || null, listId || null);
  const markItemsBought = useMarkItemsBought(houseId, listId, currentUserId, currentUserName);
  const [items, setItems] = useState<GroceryItem[] | null>(null);
  const [total, setTotalText] = useState("");
  const [name, setNameText] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [totalError, setTotalError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  if (items === null && itemsQuery.data) {
    const byId = new Map(itemsQuery.data.map((item) => [item.id, item]));
    const snapshot = itemIds
      .map((id) => byId.get(id))
      .filter((item): item is GroceryItem => !!item && item.status !== "bought");
    setItems(snapshot);
    setNameText(prefilledName(snapshot.map((item) => item.name)));
  }

  const list = useMemo(() => items ?? [], [items]);
  const submitting = markItemsBought.isPending;
  const ready = items !== null;
  const unavailable = ready && list.length < MIN_BATCH_ITEMS;

  const mismatch = useMemo(() => {
    const totalResult = parseRupeesToPaise(total);
    const prices: (number | null)[] = [];
    for (const item of list) {
      const result = parseRupeesToPaise(amounts[item.id] ?? "");
      if (!result.ok) return null;
      prices.push(result.value);
    }
    return amountMismatch(totalResult.ok ? totalResult.value : null, prices);
  }, [total, amounts, list]);

  const submit = async () => {
    if (!ready || unavailable || submitting) return;

    const totalResult = parseRupeesToPaise(total);
    const nextTotalError = !totalResult.ok
      ? amountErrorMessage(totalResult.error)
      : totalResult.value === null
        ? "Enter the total you paid."
        : null;

    const nameResult = validateBatchName(name);
    const nextNameError = nameResult.ok ? null : batchNameErrorMessage(nameResult.error);

    const nextItemErrors: Record<string, string> = {};
    const prices = list.map((item) => {
      const result = parseRupeesToPaise(amounts[item.id] ?? "");
      if (result.ok) return result.value;
      nextItemErrors[item.id] = amountErrorMessage(result.error);
      return null;
    });

    setTotalError(nextTotalError);
    setNameError(nextNameError);
    setItemErrors(nextItemErrors);
    if (!totalResult.ok || totalResult.value === null || !nameResult.ok) return;
    if (Object.keys(nextItemErrors).length > 0) return;

    try {
      await markItemsBought.mutateAsync({
        itemIds: list.map((item) => item.id),
        totalPaise: totalResult.value,
        name: nameResult.value,
        store: null,
        itemPricesPaise: prices.some((price) => price !== null) ? prices : undefined,
      });
      toast.success(`Marked ${list.length} items as bought`);
      onBought();
    } catch (cause) {
      toast.error(groceryErrorFromCause(cause, "Couldn't mark those items as bought. Try again."));
    }
  };

  return {
    items: list,
    ready,
    unavailable,
    total,
    name,
    totalError,
    nameError,
    amountMismatch: mismatch,
    submitting,
    canSubmit: ready && !unavailable && !submitting,
    amountOf: (itemId: string) => amounts[itemId] ?? "",
    itemErrorOf: (itemId: string) => itemErrors[itemId] ?? null,
    setTotal: (value: string) => {
      setTotalText(value);
      setTotalError(null);
    },
    setName: (value: string) => {
      setNameText(value);
      setNameError(null);
    },
    setAmount: (itemId: string, value: string) => {
      setAmounts((current) => ({ ...current, [itemId]: value }));
      setItemErrors((current) => {
        if (!(itemId in current)) return current;
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    },
    submit,
  };
}
