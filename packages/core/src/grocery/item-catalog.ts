import catalogData from "./item-catalog.json";
import { bestKeywordMatch } from "./keyword-match";

export type ItemDefaults = { quantity: number; unit: string };

export type CatalogItem = ItemDefaults & { aliases?: readonly string[] };

type CatalogCategory = {
  fallback: ItemDefaults;
  items: Record<string, CatalogItem>;
};

// Category keys match system category names exactly; item keys are lowercase keywords or phrases.
// `aliases` are lowercase alternative names (other languages, spellings, variants) that resolve to the item.
// `fallback` applies to items in that category that match no keyword. Units must be ITEM_UNITS values.
export const ITEM_CATALOG: Record<string, CatalogCategory> = catalogData;

export type CatalogMatch = { category: string; defaults: ItemDefaults };

export type CatalogEntry = { name: string; aliases: readonly string[] };

export const CATALOG_ENTRIES: readonly CatalogEntry[] = Object.values(ITEM_CATALOG).flatMap(
  ({ items }) => Object.entries(items).map(([name, { aliases = [] }]) => ({ name, aliases })),
);

const TERM_TO_NAME = new Map<string, string>(
  CATALOG_ENTRIES.flatMap(({ name, aliases }) =>
    [name, ...aliases].map((term): [string, string] => [term, name]),
  ),
);

const KEYWORDS = new Map<string, CatalogMatch>(
  Object.entries(ITEM_CATALOG).flatMap(([category, { items }]) =>
    Object.entries(items).flatMap(([name, { aliases = [], ...defaults }]) =>
      [name, ...aliases].map((term): [string, CatalogMatch] => [
        term.replaceAll("-", " "),
        { category, defaults },
      ]),
    ),
  ),
);

// Resolves a lowercase item name that is exactly a catalog name or alias to the catalog name.
export function canonicalCatalogName(term: string): string {
  return TERM_TO_NAME.get(term) ?? term;
}

const CATEGORY_FALLBACKS = new Map(
  Object.entries(ITEM_CATALOG).map(([category, { fallback }]) => [
    category.toLowerCase(),
    fallback,
  ]),
);

export function matchCatalogItem(itemName: string): CatalogMatch | null {
  const keyword = bestKeywordMatch(itemName, [...KEYWORDS.keys()]);
  return keyword ? (KEYWORDS.get(keyword) ?? null) : null;
}

export function categoryFallbackDefaults(
  categoryName: string | null | undefined,
): ItemDefaults | null {
  return categoryName ? (CATEGORY_FALLBACKS.get(categoryName.toLowerCase()) ?? null) : null;
}
