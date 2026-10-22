import {
  itemDraft,
  itemDraftChanges,
  parseItemQuantity,
  rebaseItemDraft,
  type GroceryItem,
  type ItemDraft,
  type ItemUrgency,
} from "@kinwoo/core/grocery";
import { useState } from "react";

import { toast } from "../toast";
import { useUpdateItem } from "./mutations";
import { useGroceryCategories } from "./queries";

type Synced = { itemId: string | null; key: string | null; base: ItemDraft | null };

// Holds an editable copy of an item. Nothing is sent until `save`; an unchanged draft sends nothing.
export function useEditItemForm({
  houseId,
  listId,
  item,
}: {
  houseId: string;
  listId: string;
  item: GroceryItem | null | undefined;
}) {
  const fresh = item ? itemDraft(item) : null;
  const key = item && fresh ? `${item.id}:${JSON.stringify(fresh)}` : null;

  const [draft, setDraft] = useState<ItemDraft | null>(fresh);
  const [synced, setSynced] = useState<Synced>({ itemId: item?.id ?? null, key, base: fresh });
  const [error, setError] = useState<string | null>(null);

  // Synced during render so the fields never show a stale copy for a frame.
  if (synced.key !== key) {
    setSynced({ itemId: item?.id ?? null, key, base: fresh });
    if (!fresh || !draft || !synced.base || synced.itemId !== item?.id) {
      setDraft(fresh);
      setError(null);
    } else {
      setDraft(rebaseItemDraft(draft, synced.base, fresh));
    }
  }

  const { data: categories } = useGroceryCategories(houseId || null);
  const updateItem = useUpdateItem(houseId, listId, item?.id ?? "");

  const pending = item && draft ? itemDraftChanges(item, draft) : null;
  const dirty = pending ? !pending.ok || !pending.empty : false;

  const update = (patch: Partial<ItemDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const save = async (): Promise<boolean> => {
    if (!item || !draft || updateItem.isPending) return false;

    // A blank or invalid quantity cannot be saved, so the field falls back to the saved one.
    if (parseItemQuantity(draft.quantity) === null) update({ quantity: itemDraft(item).quantity });

    const result = itemDraftChanges(item, draft);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    if (result.empty) return true;

    try {
      await updateItem.mutateAsync(result.changes);
      return true;
    } catch {
      toast.error("Couldn't save your changes. Try again.");
      return false;
    }
  };

  return {
    draft,
    error,
    dirty,
    categories: categories ?? [],
    saving: updateItem.isPending,
    setName: (name: string) => {
      update({ name });
      setError(null);
    },
    setQuantity: (quantity: string) => update({ quantity }),
    setUnit: (unit: string | null) => update({ unit }),
    setCategory: (categoryId: string) => update({ categoryId }),
    setUrgency: (urgency: ItemUrgency) => update({ urgency }),
    setNote: (note: string) => update({ note }),
    save,
  };
}

export type EditItemForm = ReturnType<typeof useEditItemForm>;
