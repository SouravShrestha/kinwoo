import {
  BakeryIcon,
  BeveragesIcon,
  DairyIcon,
  DiningIcon,
  EventsIcon,
  FruitsIcon,
  GroceryIcon,
  HouseholdIcon,
  MeatFishIcon,
  OtherIcon,
  PersonalCareIcon,
  ShoppingIcon,
  SnacksIcon,
  SpicesIcon,
  StaplesIcon,
  TodoIcon,
  VegetablesIcon,
  WalletIcon,
  type IconProps,
} from "@kinwoo/icons/native";
import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<IconProps>> = {
  Fruits: FruitsIcon,
  Vegetables: VegetablesIcon,
  Staples: StaplesIcon,
  Spices: SpicesIcon,
  Dairy: DairyIcon,
  "Meat & Fish": MeatFishIcon,
  Bakery: BakeryIcon,
  Snacks: SnacksIcon,
  Beverages: BeveragesIcon,
  Household: HouseholdIcon,
  "Personal Care": PersonalCareIcon,
  Grocery: GroceryIcon,
  "To-do": TodoIcon,
  Wallet: WalletIcon,
  Events: EventsIcon,
  Shopping: ShoppingIcon,
  Dining: DiningIcon,
};

export function CategoryIcon({
  name,
  size,
  color,
}: {
  name: string | undefined;
  size: number;
  color: string;
}) {
  const Icon = (name && ICONS[name]) || OtherIcon;
  return <Icon size={size} color={color} />;
}
