import { canonicalCatalogName, catalogEntries } from "./item-catalog";
import type { GroceryItem, ItemStatus, ItemUrgency } from "./types";

export type ItemUnitOption = { value: string; label: string };

// `value` is the abbreviation that is stored and shown in lists; `label` is the full name shown in the picker.
export const ITEM_UNITS: readonly ItemUnitOption[] = [
  { value: "pc", label: "Piece" },
  { value: "kg", label: "Kilogram" },
  { value: "g", label: "Gram" },
  { value: "L", label: "Litre" },
  { value: "ml", label: "Millilitre" },
  { value: "p", label: "Pack" },
  { value: "dz", label: "Dozen" },
  { value: "bn", label: "Bunch" },
  { value: "btl", label: "Bottle" },
  { value: "bx", label: "Box" },
  { value: "bg", label: "Bag" },
];

// A unit outside the presets (typed in elsewhere) stays selectable so it is not silently dropped.
export function itemUnitOptions(current: string | null): ItemUnitOption[] {
  if (!current || ITEM_UNITS.some((unit) => unit.value === current)) return [...ITEM_UNITS];
  return [...ITEM_UNITS, { value: current, label: current }];
}

export const ITEM_URGENCY_OPTIONS: readonly { value: ItemUrgency; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "soon", label: "Soon" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "This week" },
  { value: "whenever", label: "Anytime" },
];

export type ItemUrgencyTone = "high" | "medium";

const URGENCY_TONE: Record<ItemUrgency, ItemUrgencyTone | null> = {
  now: "high",
  soon: "high",
  today: "high",
  tomorrow: "medium",
  this_week: "medium",
  whenever: null,
};

export function itemUrgencyTone(urgency: ItemUrgency): ItemUrgencyTone | null {
  return URGENCY_TONE[urgency];
}

export function itemUrgencyLabel(urgency: ItemUrgency): string {
  return ITEM_URGENCY_OPTIONS.find((option) => option.value === urgency)?.label ?? "Anytime";
}

export const DEFAULT_ITEM_URGENCY: ItemUrgency = "whenever";

export const DEFAULT_ITEM_QUANTITY = "500";

export const DEFAULT_ITEM_UNIT = "g";

const OPEN_STATUSES: readonly ItemStatus[] = ["pending", "claimed", "assigned"];

export function isOpenItem(item: Pick<GroceryItem, "status">): boolean {
  return OPEN_STATUSES.includes(item.status);
}

function normalise(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// Names that are the same catalog item under different names ("doodh" and "milk") compare equal.
function identity(name: string): string {
  return canonicalCatalogName(normalise(name));
}

export function findOpenItemByName(
  items: readonly GroceryItem[],
  name: string,
): GroceryItem | null {
  const target = identity(name);
  if (!target) return null;
  return items.find((item) => isOpenItem(item) && identity(item.name) === target) ?? null;
}

// The category of the most recently updated item with this exact name, whatever its status.
export function categoryFromHistory(items: readonly GroceryItem[], name: string): string | null {
  const target = identity(name);
  if (!target) return null;
  let latest: GroceryItem | null = null;
  for (const item of items) {
    if (!item.categoryId || identity(item.name) !== target) continue;
    if (!latest || latest.updatedAt < item.updatedAt) latest = item;
  }
  return latest?.categoryId ?? null;
}

export type ItemSuggestion = { name: string };

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Ranks a catalog item against the query: 0 name prefix, 1 name word, 2 alias prefix, 3 alias word.
function suggestionRank(name: string, aliases: readonly string[], needle: string): number | null {
  const rankTerm = (term: string, base: number) => {
    if (term.startsWith(needle)) return base;
    return ` ${term}`.includes(` ${needle}`) ? base + 1 : null;
  };
  const own = rankTerm(name, 0);
  if (own !== null) return own;
  const ranks = aliases.map((alias) => rankTerm(alias, 2)).filter((rank) => rank !== null);
  return ranks.length ? Math.min(...ranks) : null;
}

// Catalog items are matched by name or alias and suggested by name; name matches rank above alias
// matches, and prefixes above later words. Items already open on the list (under any of their names)
// and the exact query are left out. Nothing is suggested for an empty query or when the query is
// already open on the list.
export function itemSuggestions(
  items: readonly GroceryItem[],
  query: string,
  limit = 3,
): ItemSuggestion[] {
  const needle = normalise(query);
  if (!needle) return [];

  const open = new Set(items.filter(isOpenItem).map((item) => identity(item.name)));
  if (open.has(identity(needle))) return [];

  const ranked: { name: string; rank: number }[] = [];

  for (const { name, aliases } of catalogEntries()) {
    if (name === needle || open.has(name)) continue;
    const rank = suggestionRank(name, aliases, needle);
    if (rank !== null) ranked.push({ name, rank });
  }

  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ name }) => ({ name: capitalise(name) }));
}

export function parseItemQuantity(input: string): number | null {
  const value = Number(input.trim().replace(",", "."));
  if (!input.trim() || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function stepItemQuantity(input: string, delta: 1 | -1): string {
  const current = parseItemQuantity(input) ?? 0;
  const next = Math.max(0, Math.round((current + delta) * 100) / 100);
  return next === 0 ? "" : String(next);
}
