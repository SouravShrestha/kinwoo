import catalogData from "./item-catalog.json";
import { bestKeywordMatch, prepareKeywords, type PreparedKeyword } from "./keyword-match";

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

type CatalogIndex = {
  entries: readonly CatalogEntry[];
  termToName: Map<string, string>;
  keywords: Map<string, CatalogMatch>;
  prepared: readonly PreparedKeyword<string>[];
  fallbacks: Map<string, ItemDefaults>;
};

// Built on first use: the catalog is large, and most screens and API routes never touch it.
let index: CatalogIndex | null = null;

function catalogIndex(): CatalogIndex {
  if (index) return index;

  const entries = Object.values(ITEM_CATALOG).flatMap(({ items }) =>
    Object.entries(items).map(([name, { aliases = [] }]) => ({ name, aliases })),
  );
  const keywords = new Map<string, CatalogMatch>(
    Object.entries(ITEM_CATALOG).flatMap(([category, { items }]) =>
      Object.entries(items).flatMap(([name, { aliases = [], ...defaults }]) =>
        [name, ...aliases].map((term): [string, CatalogMatch] => [
          term.replaceAll("-", " "),
          { category, defaults },
        ]),
      ),
    ),
  );

  index = {
    entries,
    termToName: new Map(
      entries.flatMap(({ name, aliases }) =>
        [name, ...aliases].map((term): [string, string] => [term, name]),
      ),
    ),
    keywords,
    prepared: prepareKeywords([...keywords.keys()]),
    fallbacks: new Map(
      Object.entries(ITEM_CATALOG).map(([category, { fallback }]) => [
        category.toLowerCase(),
        fallback,
      ]),
    ),
  };
  return index;
}

export function catalogEntries(): readonly CatalogEntry[] {
  return catalogIndex().entries;
}

// Resolves a lowercase item name that is exactly a catalog name or alias to the catalog name.
export function canonicalCatalogName(term: string): string {
  return catalogIndex().termToName.get(term) ?? term;
}

// The add-item form asks for the category and the defaults of the same name in one render.
let lastMatch: { itemName: string; match: CatalogMatch | null } | null = null;

export function matchCatalogItem(itemName: string): CatalogMatch | null {
  if (lastMatch?.itemName === itemName) return lastMatch.match;
  const { keywords, prepared } = catalogIndex();
  const keyword = bestKeywordMatch(itemName, prepared);
  const match = keyword ? (keywords.get(keyword) ?? null) : null;
  lastMatch = { itemName, match };
  return match;
}

export function categoryFallbackDefaults(
  categoryName: string | null | undefined,
): ItemDefaults | null {
  return categoryName ? (catalogIndex().fallbacks.get(categoryName.toLowerCase()) ?? null) : null;
}
