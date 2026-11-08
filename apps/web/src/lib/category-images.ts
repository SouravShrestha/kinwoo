const dir = "/images/icons";
const file = (name: string) => `${dir}/${name}.webp`;

const EXPENSE_CATEGORY_IMAGES: Record<string, string> = {
  others: file("others"),
  rent: file("rent"),
  groceries: file("groceries"),
  utilities: file("utilities"),
  food: file("food"),
  transport: file("transport"),
  household: file("household"),
  shopping: file("shopping_expense"),
  entertainment: file("entertainment"),
  subscriptions: file("subscriptions"),
  travel: file("travel_expense"),
  health: file("health_expense"),
  personal_care: file("personal_care"),
  clothing: file("clothing"),
  maintenance: file("maintenance"),
  internet: file("internet"),
  insurance: file("insurance"),
  loan_emi: file("loan_emi"),
  education: file("education"),
  fitness: file("fitness"),
  pets: file("pets"),
  childcare: file("childcare"),
  furniture: file("furniture_appliances"),
  gifts: file("gifts_donations"),
  taxes: file("taxes"),
};

const ITEM_CATEGORY_IMAGES: Record<string, string> = {
  Fruits: file("fruits"),
  Vegetables: file("vegetables"),
  Staples: file("grains"),
  Spices: file("spices"),
  Dairy: file("dairy"),
  Meat: file("meat_fish"),
  Bakery: file("bakery"),
  Snacks: file("snacks"),
  Beverages: file("beverages"),
  Household: file("cleaning"),
  Personal: file("personal_care"),
  Frozen: file("frozen_ready_to_eat"),
  Baby: file("baby_care"),
  Pet: file("pet_care"),
  Health: file("health_expense"),
  Kitchenware: file("kitchenware"),
  Stationery: file("stationery_school"),
  Electrical: file("electrical_hardware"),
  Fuel: file("fuel"),
  Utilities: file("utilities_2"),
  Pooja: file("pooja_festival"),
  Laundry: file("laundry_clothing_care"),
};

const LIST_ICON_IMAGES: Record<string, string> = {
  Grocery: file("groceries_lists"),
  "To-do": file("checklist_lists"),
  Wallet: file("wallet_lists"),
  Events: file("calendar_lists"),
  Shopping: file("shopping_expense"),
  Dining: file("food"),
  Home: file("home_lists"),
  Travel: file("travel_expense"),
  Bills: file("utilities"),
  Health: file("health_expense"),
  Drinks: file("cafe_lists"),
};

export const expenseCategoryImage = (category: string) =>
  EXPENSE_CATEGORY_IMAGES[category] ?? EXPENSE_CATEGORY_IMAGES.others;

export const itemCategoryImage = (name: string | null | undefined) =>
  (name && ITEM_CATEGORY_IMAGES[name]) || EXPENSE_CATEGORY_IMAGES.others;

export const listIconImage = (label: string) =>
  LIST_ICON_IMAGES[label] ?? EXPENSE_CATEGORY_IMAGES.others;

export const PAYMENT_IMAGE = file("note");

export const CATEGORY_IMAGE_SRCS = [
  ...new Set([
    PAYMENT_IMAGE,
    ...Object.values(EXPENSE_CATEGORY_IMAGES),
    ...Object.values(ITEM_CATEGORY_IMAGES),
    ...Object.values(LIST_ICON_IMAGES),
  ]),
];
