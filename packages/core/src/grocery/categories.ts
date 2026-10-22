import { matchCatalogItem } from "./item-catalog";

export const FALLBACK_CATEGORY = "Other";

export function suggestCategory(itemName: string): string | null {
  return matchCatalogItem(itemName)?.category ?? null;
}
