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
  type IconProps,
} from "@kinwoo/icons/native";
import type { ComponentType } from "react";

const ICONS: Record<ExpenseCategory, ComponentType<IconProps>> = {
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
  color,
}: {
  category: ExpenseCategory;
  size: number;
  color: string;
}) {
  const Icon = ICONS[category] ?? OtherIcon;
  return <Icon size={size} color={color} />;
}
