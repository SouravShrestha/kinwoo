import { parseItemQuantity } from "./add-item";
import type { GroceryActivityEntry, GroceryItem, ItemUrgency, UpdateItemInput } from "./types";
import { itemNameErrorMessage, validateItemName } from "./validation";

export type ItemDraft = {
  name: string;
  quantity: string;
  unit: string | null;
  categoryId: string | null;
  urgency: ItemUrgency;
  note: string;
};

export function itemDraft(item: GroceryItem): ItemDraft {
  return {
    name: item.name,
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit: item.unit,
    categoryId: item.categoryId,
    urgency: item.urgency,
    note: item.note ?? "",
  };
}

// Fields the user has not touched since `previous` follow the server's `next` copy, so a
// housemate's edit arriving mid-session does not overwrite what is being typed.
export function rebaseItemDraft(draft: ItemDraft, previous: ItemDraft, next: ItemDraft): ItemDraft {
  const merged = { ...draft };
  for (const key of Object.keys(next) as (keyof ItemDraft)[]) {
    if (draft[key] === previous[key]) (merged as Record<string, unknown>)[key] = next[key];
  }
  return merged;
}

export type ItemDraftChanges =
  { ok: true; changes: UpdateItemInput; empty: boolean } | { ok: false; error: string };

// The update RPC treats null as "leave unchanged", so clearing the unit or note sends "" and a
// blank or invalid quantity is left out rather than sent.
export function itemDraftChanges(item: GroceryItem, draft: ItemDraft): ItemDraftChanges {
  const name = validateItemName(draft.name);
  if (!name.ok) return { ok: false, error: itemNameErrorMessage(name.error) };

  const changes: UpdateItemInput = {};
  if (name.value !== item.name) changes.name = name.value;

  const quantity = parseItemQuantity(draft.quantity);
  if (quantity !== null && quantity !== item.quantity) changes.quantity = quantity;

  if (draft.unit !== item.unit) changes.unit = draft.unit ?? "";
  if (draft.categoryId && draft.categoryId !== item.categoryId) {
    changes.categoryId = draft.categoryId;
  }
  if (draft.urgency !== item.urgency) changes.urgency = draft.urgency;

  const note = draft.note.trim();
  if (note !== (item.note?.trim() ?? "")) changes.note = note;

  return { ok: true, changes, empty: Object.keys(changes).length === 0 };
}

const EDIT_TYPES = new Set(["grocery_item.added", "grocery_item.updated"]);

export type ItemLastEdit = { userId: string | null; name: string | null; at: string };

export function itemLastEdit(
  item: Pick<GroceryItem, "createdBy" | "createdAt">,
  activity: readonly GroceryActivityEntry[] | undefined,
): ItemLastEdit {
  let latest: GroceryActivityEntry | null = null;
  for (const entry of activity ?? []) {
    if (!EDIT_TYPES.has(entry.type)) continue;
    if (!latest || entry.createdAt > latest.createdAt) latest = entry;
  }
  if (latest) return { userId: latest.actorId, name: latest.actorName, at: latest.createdAt };
  return { userId: item.createdBy, name: null, at: item.createdAt };
}
