import {
  categoryFromHistory,
  DEFAULT_ITEM_QUANTITY,
  DEFAULT_ITEM_UNIT,
  DEFAULT_ITEM_URGENCY,
  FALLBACK_CATEGORY,
  findOpenItemByName,
  itemNameErrorMessage,
  itemSuggestions,
  parseItemQuantity,
  suggestCategory,
  suggestItemDefaults,
  validateItemName,
  type ItemSuggestion,
  type ItemUrgency,
} from "@kinwoo/core/grocery";
import { useMemo, useState } from "react";

import { toast } from "../toast";
import { useAuth } from "../auth/use-auth";
import { useAddItem } from "./mutations";
import { useGroceryCategories, useGroceryItems, useGroceryLists } from "./queries";

export type AddItemSubmitMode = "close" | "again";

function idempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useAddItemForm({
  houseId,
  listId: initialListId,
  onAdded,
}: {
  houseId: string;
  listId?: string | null;
  onAdded: (mode: AddItemSubmitMode) => void;
}) {
  const [selectedListId, setListId] = useState(initialListId ?? "");
  const [name, setName] = useState("");
  // undefined follows the defaults suggested from the name; once edited the choice sticks.
  const [quantityChoice, setQuantityChoice] = useState<string | undefined>(undefined);
  const [unitChoice, setUnitChoice] = useState<string | null | undefined>(undefined);
  const [urgency, setUrgency] = useState<ItemUrgency>(DEFAULT_ITEM_URGENCY);
  // undefined follows the category suggested from the name; null is an explicit "no category".
  const [categoryChoice, setCategoryChoice] = useState<string | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<AddItemSubmitMode | null>(null);

  const { data: lists } = useGroceryLists(houseId || null);
  const activeLists = useMemo(() => lists ?? [], [lists]);

  // A stale or missing list id (deleted list, bare deep link) falls back to the default list.
  const fallbackList = activeLists.find((l) => l.isDefault) ?? activeLists[0];
  const listId =
    lists && !activeLists.some((l) => l.id === selectedListId)
      ? (fallbackList?.id ?? "")
      : selectedListId;

  const { data: categories } = useGroceryCategories(houseId || null);
  const { data: items } = useGroceryItems(houseId || null, listId || null);
  const { user } = useAuth();
  const addItem = useAddItem(houseId, listId, user?.id);

  const suggestedCategoryId = useMemo(() => {
    const known = (id: string | null) => (id && categories?.some((c) => c.id === id) ? id : null);
    const fromHistory = known(categoryFromHistory(items ?? [], name));
    if (fromHistory) return fromHistory;
    const suggested = suggestCategory(name)?.toLowerCase();
    if (!suggested) return null;
    return categories?.find((c) => c.name.toLowerCase() === suggested)?.id ?? null;
  }, [name, items, categories]);

  const fallbackCategoryId = useMemo(
    () =>
      categories?.find((c) => c.name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase())?.id ?? null,
    [categories],
  );

  const categoryId =
    categoryChoice === undefined ? (suggestedCategoryId ?? fallbackCategoryId) : categoryChoice;
  const categoryName = categories?.find((c) => c.id === categoryId)?.name;
  const suggestedDefaults = useMemo(
    () => suggestItemDefaults(name, categoryName),
    [name, categoryName],
  );
  const quantity =
    quantityChoice ??
    (suggestedDefaults ? String(suggestedDefaults.quantity) : DEFAULT_ITEM_QUANTITY);
  const unit =
    unitChoice === undefined ? (suggestedDefaults?.unit ?? DEFAULT_ITEM_UNIT) : unitChoice;
  const duplicate = useMemo(() => findOpenItemByName(items ?? [], name), [items, name]);
  const suggestions = useMemo(() => itemSuggestions(items ?? [], name), [items, name]);

  const resetItemFields = () => {
    setName("");
    setQuantityChoice(undefined);
    setUnitChoice(undefined);
    setCategoryChoice(undefined);
    setNote("");
    setError(null);
  };

  const submit = async (mode: AddItemSubmitMode) => {
    if (addItem.isPending || !listId) return;

    const result = validateItemName(name);
    if (!result.ok) {
      setError(itemNameErrorMessage(result.error));
      return;
    }

    setPendingMode(mode);
    try {
      await addItem.mutateAsync({
        name: result.value,
        quantity: parseItemQuantity(quantity),
        unit,
        categoryId,
        urgency,
        note: note.trim() || null,
        idempotencyKey: idempotencyKey(),
      });
      toast.success(`Added "${result.value}"`);
      resetItemFields();
      onAdded(mode);
    } catch {
      toast.error("Couldn't add that item. Try again.");
    } finally {
      setPendingMode(null);
    }
  };

  return {
    listId,
    lists: activeLists,
    categories: categories ?? [],
    name,
    quantity,
    unit,
    urgency,
    categoryId,
    suggestedCategoryId,
    note,
    error,
    duplicate,
    suggestions,
    pendingMode,
    submitting: addItem.isPending,
    canSubmit: name.trim().length > 0 && listId.length > 0,
    setListId,
    setName: (value: string) => {
      setName(value);
      setError(null);
    },
    setQuantity: setQuantityChoice,
    setUnit: setUnitChoice,
    setUrgency,
    setCategory: (id: string) => setCategoryChoice(id),
    setNote,
    applySuggestion: (suggestion: ItemSuggestion) => {
      setName(suggestion.name);
      setQuantityChoice(undefined);
      setUnitChoice(undefined);
      setCategoryChoice(undefined);
      setError(null);
    },
    submit,
  };
}
