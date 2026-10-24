const dir = "/images/icons";
const file = (name: string) => `${dir}/${name}.webp`;

const EXPENSE_CATEGORY_IMAGES: Record<string, string> = {
  rent: file("home"),
  utilities: file("utilities"),
  groceries: file("groceries"),
  internet: file("internet"),
  household: file("household"),
  food_dining: file("food"),
  transport: file("transport"),
  other: file("other"),
};

const ITEM_CATEGORY_IMAGES: Record<string, string> = {
  Fruits: file("fruits"),
  Vegetables: file("vegetables"),
  Staples: file("grains"),
  Spices: file("spices"),
  Dairy: file("dairy"),
  "Meat & Fish": file("meat_fish"),
  Bakery: file("bakery"),
  Snacks: file("snacks"),
  Beverages: file("beverages"),
  Household: file("cleaning"),
  "Personal Care": file("personal_care"),
};

const LIST_ICON_IMAGES: Record<string, string> = {
  Grocery: file("groceries"),
  "To-do": file("checklist"),
  Wallet: file("wallet"),
  Events: file("calendar"),
  Shopping: file("shopping"),
  Dining: file("dining"),
  Home: file("home"),
  Travel: file("travel"),
  Bills: file("bills"),
  Health: file("health"),
  Drinks: file("cafe"),
};

export const expenseCategoryImage = (category: string) =>
  EXPENSE_CATEGORY_IMAGES[category] ?? EXPENSE_CATEGORY_IMAGES.other;

export const itemCategoryImage = (name: string | null | undefined) =>
  (name && ITEM_CATEGORY_IMAGES[name]) || EXPENSE_CATEGORY_IMAGES.other;

export const listIconImage = (label: string) =>
  LIST_ICON_IMAGES[label] ?? EXPENSE_CATEGORY_IMAGES.other;

export const PAYMENT_IMAGE = file("note");

export const CATEGORY_IMAGE_SRCS = [
  ...new Set([
    PAYMENT_IMAGE,
    ...Object.values(EXPENSE_CATEGORY_IMAGES),
    ...Object.values(ITEM_CATEGORY_IMAGES),
    ...Object.values(LIST_ICON_IMAGES),
  ]),
];
