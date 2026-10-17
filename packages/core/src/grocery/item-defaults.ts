import { categoryFallbackDefaults, matchCatalogItem, type ItemDefaults } from "./item-catalog";

// A keyword match wins; otherwise the chosen category's fallback applies.
export function suggestItemDefaults(
  itemName: string,
  categoryName?: string | null,
): ItemDefaults | null {
  return matchCatalogItem(itemName)?.defaults ?? categoryFallbackDefaults(categoryName);
}
