import type { ExpenseCategory } from "@kinwoo/core/expenses";
import {
  BoltIcon,
  CarIcon,
  DiningIcon,
  GroceryIcon,
  HomeIcon,
  HouseholdIcon,
  OtherIcon,
  WorldIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import type { ComponentType } from "react";

const ICONS: Record<ExpenseCategory, ComponentType<WebIconProps>> = {
  rent: HomeIcon,
  utilities: BoltIcon,
  groceries: GroceryIcon,
  internet: WorldIcon,
  household: HouseholdIcon,
  food_dining: DiningIcon,
  transport: CarIcon,
  other: OtherIcon,
};

export function ExpenseCategoryIcon({
  category,
  size,
}: {
  category: ExpenseCategory;
  size: number;
}) {
  const Icon = ICONS[category] ?? OtherIcon;
  return <Icon size={size} />;
}
