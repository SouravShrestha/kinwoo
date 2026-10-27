import type { ExpenseCategory } from "@kinwoo/core/expenses";
import { Image } from "expo-image";

import { expenseCategoryImages } from "@/lib/images";

export function ExpenseCategoryImage({
  category,
  size,
}: {
  category: ExpenseCategory;
  size: number;
}) {
  return (
    <Image
      source={expenseCategoryImages[category]}
      accessibilityIgnoresInvertColors
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
