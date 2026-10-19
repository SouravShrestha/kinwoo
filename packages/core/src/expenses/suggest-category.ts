import { bestKeywordMatch } from "../grocery/keyword-match";
import type { ExpenseCategory } from "./categories";
import categoryKeywords from "./category-keywords.json";

const CATEGORY_KEYWORDS: Record<
  Exclude<ExpenseCategory, "other">,
  readonly string[]
> = categoryKeywords;

const KEYWORD_TO_CATEGORY = new Map(
  Object.entries(CATEGORY_KEYWORDS).flatMap(([category, keywords]) =>
    keywords.map((keyword): [string, ExpenseCategory] => [keyword, category as ExpenseCategory]),
  ),
);

export function suggestExpenseCategory(title: string): ExpenseCategory | null {
  const keyword = bestKeywordMatch(title, [...KEYWORD_TO_CATEGORY.keys()]);
  return keyword ? (KEYWORD_TO_CATEGORY.get(keyword) ?? null) : null;
}
