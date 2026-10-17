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
  type WebIconProps,
} from "@kinwoo/icons";
import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<WebIconProps>> = {
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

export function CategoryIcon({ name, size }: { name: string | undefined; size: number }) {
  const Icon = (name && ICONS[name]) || OtherIcon;
  return <Icon size={size} />;
}
