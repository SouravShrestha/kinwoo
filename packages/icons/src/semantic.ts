import {
  arrowRightIcon,
  bagDollarIcon,
  bakeryIcon,
  beveragesIcon,
  boltIcon,
  carIcon,
  cartCheckIcon,
  cartCrossIcon,
  cartMinusIcon,
  cartPlusIcon,
  dairyIcon,
  diningIcon,
  emailIcon,
  eventsIcon,
  filePlusIcon,
  frownIcon,
  fruitsIcon,
  groceryIcon,
  heartIcon,
  homeIcon,
  householdIcon,
  housePlusIcon,
  inviteIcon,
  listSettingsIcon,
  meatFishIcon,
  otherIcon,
  personalCareIcon,
  pulseIcon,
  shieldCheckIcon,
  shoppingIcon,
  snacksIcon,
  spicesIcon,
  staplesIcon,
  todoIcon,
  transactionIcon,
  trashOutlineIcon,
  userCheckIcon,
  userCrossIcon,
  vegetablesIcon,
  walletIcon,
  worldIcon,
  type IconGeometry,
} from "./data";

// Names to shapes, shared by the web and native entry points so both apps draw the same icon for
// the same thing. Geometry objects (not names) keep the lookup tree-shakeable.

// Keyed by grocery category and list icon names, matching the system category names.
const GROCERY_CATEGORY: Record<string, IconGeometry> = {
  Fruits: fruitsIcon,
  Vegetables: vegetablesIcon,
  Staples: staplesIcon,
  Spices: spicesIcon,
  Dairy: dairyIcon,
  "Meat & Fish": meatFishIcon,
  Bakery: bakeryIcon,
  Snacks: snacksIcon,
  Beverages: beveragesIcon,
  Household: householdIcon,
  "Personal Care": personalCareIcon,
  Grocery: groceryIcon,
  "To-do": todoIcon,
  Wallet: walletIcon,
  Events: eventsIcon,
  Shopping: shoppingIcon,
  Dining: diningIcon,
};

// Keyed by ExpenseCategory from @kinwoo/core/expenses.
const EXPENSE_CATEGORY: Record<string, IconGeometry> = {
  rent: homeIcon,
  utilities: boltIcon,
  groceries: groceryIcon,
  internet: worldIcon,
  household: householdIcon,
  food_dining: diningIcon,
  transport: carIcon,
  other: otherIcon,
};

// Keyed by ActivityIconName from @kinwoo/core/grocery.
const ACTIVITY: Record<string, IconGeometry> = {
  "cart-plus": cartPlusIcon,
  "cart-check": cartCheckIcon,
  "cart-minus": cartMinusIcon,
  "cart-cross": cartCrossIcon,
  "bag-dollar": bagDollarIcon,
  transaction: transactionIcon,
  "user-check": userCheckIcon,
  "user-cross": userCrossIcon,
  heart: heartIcon,
  frown: frownIcon,
  "file-plus": filePlusIcon,
  "list-settings": listSettingsIcon,
  trash: trashOutlineIcon,
  "house-plus": housePlusIcon,
  "shield-check": shieldCheckIcon,
  invite: inviteIcon,
  email: emailIcon,
  "arrow-right": arrowRightIcon,
  pulse: pulseIcon,
};

export function groceryCategoryGeometry(name: string | null | undefined): IconGeometry {
  return (name && GROCERY_CATEGORY[name]) || otherIcon;
}

export function expenseCategoryGeometry(category: string): IconGeometry {
  return EXPENSE_CATEGORY[category] ?? otherIcon;
}

export function activityGeometry(name: string): IconGeometry {
  return ACTIVITY[name] ?? pulseIcon;
}
