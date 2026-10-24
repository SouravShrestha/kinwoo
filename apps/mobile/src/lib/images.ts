// require() instead of ESM imports: expo's allowArbitraryExtensions makes tsc look for a
// sibling "x.d.png.ts" per image instead of the ambient `declare module "*.png"`.
/* eslint-disable @typescript-eslint/no-require-imports */

export const landingImage = require("../../assets/images/landing-screen-image.png") as number;

export const logoTypedBlack = require("../../assets/images/logo-typed-black.png") as number;

export const logoTypedWhite = require("../../assets/images/logo-typed-white.png") as number;

export const inviteFriends = require("../../assets/images/invite-friends.png") as number;

export const buildYourHouse = require("../../assets/images/build-your-house.png") as number;

export const emptyList = require("../../assets/images/empty-list.png") as number;
export const noExpense = require("../../assets/images/no-expense.png") as number;
export const noActivity = require("../../assets/images/no-activity.png") as number;

export const noNotifications = require("../../assets/images/no-notifications.png") as number;

export const profileImage = require("../../assets/images/profile-image.png") as number;

export const blinkitLogo = require("../../assets/images/blinkit.jpeg") as number;

export const zeptoLogo = require("../../assets/images/zepto.jpeg") as number;

export const instamartLogo = require("../../assets/images/instamart.jpeg") as number;

export const expenseCategoryImages = {
  rent: require("../../assets/icons/home.png") as number,
  utilities: require("../../assets/icons/utilities.png") as number,
  groceries: require("../../assets/icons/groceries.png") as number,
  internet: require("../../assets/icons/internet.png") as number,
  household: require("../../assets/icons/household.png") as number,
  food_dining: require("../../assets/icons/food.png") as number,
  transport: require("../../assets/icons/transport.png") as number,
  other: require("../../assets/icons/other.png") as number,
};

const itemCategoryImages: Record<string, number> = {
  Fruits: require("../../assets/icons/fruits.png") as number,
  Vegetables: require("../../assets/icons/vegetables.png") as number,
  Staples: require("../../assets/icons/grains.png") as number,
  Spices: require("../../assets/icons/spices.png") as number,
  Dairy: require("../../assets/icons/dairy.png") as number,
  "Meat & Fish": require("../../assets/icons/meat_fish.png") as number,
  Bakery: require("../../assets/icons/bakery.png") as number,
  Snacks: require("../../assets/icons/snacks.png") as number,
  Beverages: require("../../assets/icons/beverages.png") as number,
  Household: require("../../assets/icons/cleaning.png") as number,
  "Personal Care": require("../../assets/icons/personal_care.png") as number,
};

export function itemCategoryImage(name: string | null | undefined): number {
  return (name && itemCategoryImages[name]) || expenseCategoryImages.other;
}

const listIconImages: Record<string, number> = {
  Grocery: require("../../assets/icons/groceries.png") as number,
  "To-do": require("../../assets/icons/checklist.png") as number,
  Wallet: require("../../assets/icons/wallet.png") as number,
  Events: require("../../assets/icons/calendar.png") as number,
  Shopping: require("../../assets/icons/shopping.png") as number,
  Dining: require("../../assets/icons/dining.png") as number,
  Home: require("../../assets/icons/home.png") as number,
  Travel: require("../../assets/icons/travel.png") as number,
  Bills: require("../../assets/icons/bills.png") as number,
  Health: require("../../assets/icons/health.png") as number,
  Drinks: require("../../assets/icons/cafe.png") as number,
};

export function listIconImage(label: string): number {
  return listIconImages[label] ?? expenseCategoryImages.other;
}

export const categoryIconModules = [
  ...new Set([
    ...Object.values(expenseCategoryImages),
    ...Object.values(itemCategoryImages),
    ...Object.values(listIconImages),
  ]),
];

export const paymentImage = require("../../assets/icons/note.png") as number;
