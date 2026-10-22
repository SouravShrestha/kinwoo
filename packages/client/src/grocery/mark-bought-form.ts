import { spentOnFor, type ExpenseParts } from "@kinwoo/core/expenses";
import {
  amountErrorMessage,
  boughtAtForDate,
  parseItemQuantity,
  parseRupeesToPaise,
  type GroceryItem,
} from "@kinwoo/core/grocery";
import { useState } from "react";

import { toast } from "../toast";
import { useEditItemForm } from "./edit-item-form";
import { groceryErrorFromCause } from "./errors";
import { useMarkBought } from "./mutations";

// Name and category edits are saved to the item first, for people allowed to edit it. Quantity
// and unit always travel with the purchase, so they stay editable for whoever is buying.
// Passing `expense` to `submit` also records the purchase as a split expense.
export function useMarkBoughtForm({
  houseId,
  listId,
  item,
  canEdit,
  onBought,
}: {
  houseId: string;
  listId: string;
  item: GroceryItem | null | undefined;
  canEdit: boolean;
  onBought: () => void;
}) {
  const edit = useEditItemForm({ houseId, listId, item });
  const [price, setPriceText] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [priceError, setPriceError] = useState<string | null>(null);
  const markBought = useMarkBought(houseId, listId);
  const { draft } = edit;
  const submitting = markBought.isPending || edit.saving;

  const submit = async (expense: ExpenseParts | null = null) => {
    if (!item || !draft || submitting) return;

    const priceResult = parseRupeesToPaise(price);
    if (!priceResult.ok) {
      setPriceError(amountErrorMessage(priceResult.error));
      return;
    }

    if (canEdit && edit.dirty && !(await edit.save())) return;

    try {
      await markBought.mutateAsync({
        itemId: item.id,
        input: {
          quantity: parseItemQuantity(draft.quantity),
          unit: draft.unit,
          pricePaise: priceResult.value,
          boughtAt: boughtAtForDate(date),
          expense: expense ? { ...expense, spentOn: spentOnFor(date) } : null,
        },
      });
      toast.success(`Marked "${draft.name.trim() || item.name}" as bought`);
      onBought();
    } catch (cause) {
      toast.error(groceryErrorFromCause(cause, "Couldn't mark that item as bought. Try again."));
    }
  };

  return {
    name: draft?.name ?? "",
    quantity: draft?.quantity ?? "",
    unit: draft?.unit ?? null,
    categoryId: draft?.categoryId ?? null,
    categories: edit.categories,
    price,
    date,
    nameError: edit.error,
    priceError,
    submitting,
    canSubmit: !!draft && !submitting,
    setName: edit.setName,
    setQuantity: edit.setQuantity,
    setUnit: edit.setUnit,
    setCategory: edit.setCategory,
    setPrice: (value: string) => {
      setPriceText(value);
      setPriceError(null);
    },
    setDate,
    submit,
  };
}
