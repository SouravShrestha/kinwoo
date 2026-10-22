import { bestKeywordMatch, prepareKeywords, type PreparedKeyword } from "../grocery/keyword-match";
import type { ExpenseCategory } from "./categories";
import categoryKeywords from "./category-keywords.json";

const CATEGORY_KEYWORDS: Record<
  Exclude<ExpenseCategory, "other">,
  readonly string[]
> = categoryKeywords;

type KeywordIndex = {
  categories: Map<string, ExpenseCategory>;
  prepared: readonly PreparedKeyword<string>[];
};

// Built on first use, like the item catalog: only the expense form needs it.
let index: KeywordIndex | null = null;

function keywordIndex(): KeywordIndex {
  if (index) return index;
  const categories = new Map(
    Object.entries(CATEGORY_KEYWORDS).flatMap(([category, keywords]) =>
      keywords.map((keyword): [string, ExpenseCategory] => [keyword, category as ExpenseCategory]),
    ),
  );
  index = { categories, prepared: prepareKeywords([...categories.keys()]) };
  return index;
}

export function suggestExpenseCategory(title: string): ExpenseCategory | null {
  const { categories, prepared } = keywordIndex();
  const keyword = bestKeywordMatch(title, prepared);
  return keyword ? (categories.get(keyword) ?? null) : null;
}
