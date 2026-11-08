// require() instead of ESM imports: expo's allowArbitraryExtensions makes tsc look for a
// sibling "x.d.png.ts" per image instead of the ambient `declare module "*.png"`.
/* eslint-disable @typescript-eslint/no-require-imports */

export const landingImage = require("../../assets/images/landing-screen-image.png") as number;

export const logoTypedBlack = require("../../assets/images/logo-typed-black.png") as number;

export const logoTypedWhite = require("../../assets/images/logo-typed-white.png") as number;

export const inviteFriends = require("../../assets/images/invite.webp") as number;

export const sharedBill = require("../../assets/images/shared-bill.webp") as number;

const santas = [
  require("../../../../assets/gifs/santa_1.webp") as number,
  require("../../../../assets/gifs/santa_2.webp") as number,
  require("../../../../assets/gifs/santa_3.webp") as number,
  require("../../../../assets/gifs/santa_4.webp") as number,
  require("../../../../assets/gifs/santa_5.webp") as number,
];

// Picked once per JS process, so it changes each time the app is closed and reopened.
export const santa = santas[Math.floor(Math.random() * santas.length)];

export const illustrationModules = [inviteFriends, sharedBill, santa];

export const profileImage = require("../../assets/images/profile-image.png") as number;

export const blinkitLogo = require("../../assets/images/blinkit.jpeg") as number;

export const zeptoLogo = require("../../assets/images/zepto.jpeg") as number;

export const instamartLogo = require("../../assets/images/instamart.jpeg") as number;

export const expenseCategoryImages = {
  others: require("../../assets/icons/others.png") as number,
  rent: require("../../assets/icons/rent.png") as number,
  groceries: require("../../assets/icons/groceries.png") as number,
  utilities: require("../../assets/icons/utilities.png") as number,
  food: require("../../assets/icons/food.png") as number,
  transport: require("../../assets/icons/transport.png") as number,
  household: require("../../assets/icons/household.png") as number,
  shopping: require("../../assets/icons/shopping_expense.png") as number,
  entertainment: require("../../assets/icons/entertainment.png") as number,
  subscriptions: require("../../assets/icons/subscriptions.png") as number,
  travel: require("../../assets/icons/travel_expense.png") as number,
  health: require("../../assets/icons/health_expense.png") as number,
  personal_care: require("../../assets/icons/personal_care.png") as number,
  clothing: require("../../assets/icons/clothing.png") as number,
  maintenance: require("../../assets/icons/maintenance.png") as number,
  internet: require("../../assets/icons/internet.png") as number,
  insurance: require("../../assets/icons/insurance.png") as number,
  loan_emi: require("../../assets/icons/loan_emi.png") as number,
  education: require("../../assets/icons/education.png") as number,
  fitness: require("../../assets/icons/fitness.png") as number,
  pets: require("../../assets/icons/pets.png") as number,
  childcare: require("../../assets/icons/childcare.png") as number,
  furniture: require("../../assets/icons/furniture_appliances.png") as number,
  gifts: require("../../assets/icons/gifts_donations.png") as number,
  taxes: require("../../assets/icons/taxes.png") as number,
};

const itemCategoryImages: Record<string, number> = {
  Fruits: require("../../assets/icons/fruits.png") as number,
  Vegetables: require("../../assets/icons/vegetables.png") as number,
  Staples: require("../../assets/icons/grains.png") as number,
  Spices: require("../../assets/icons/spices.png") as number,
  Dairy: require("../../assets/icons/dairy.png") as number,
  Meat: require("../../assets/icons/meat_fish.png") as number,
  Bakery: require("../../assets/icons/bakery.png") as number,
  Snacks: require("../../assets/icons/snacks.png") as number,
  Beverages: require("../../assets/icons/beverages.png") as number,
  Household: require("../../assets/icons/cleaning.png") as number,
  Personal: require("../../assets/icons/personal_care.png") as number,
  Frozen: require("../../assets/icons/frozen_ready_to_eat.png") as number,
  Baby: require("../../assets/icons/baby_care.png") as number,
  Pet: require("../../assets/icons/pet_care.png") as number,
  Health: require("../../assets/icons/health_expense.png") as number,
  Kitchenware: require("../../assets/icons/kitchenware.png") as number,
  Stationery: require("../../assets/icons/stationery_school.png") as number,
  Electrical: require("../../assets/icons/electrical_hardware.png") as number,
  Fuel: require("../../assets/icons/fuel.png") as number,
  Utilities: require("../../assets/icons/utilities_2.png") as number,
  Pooja: require("../../assets/icons/pooja_festival.png") as number,
  Laundry: require("../../assets/icons/laundry_clothing_care.png") as number,
};

export function itemCategoryImage(name: string | null | undefined): number {
  return (name && itemCategoryImages[name]) || expenseCategoryImages.others;
}

const listIconImages: Record<string, number> = {
  Grocery: require("../../assets/icons/groceries_lists.png") as number,
  "To-do": require("../../assets/icons/checklist_lists.png") as number,
  Wallet: require("../../assets/icons/wallet_lists.png") as number,
  Events: require("../../assets/icons/calendar_lists.png") as number,
  Shopping: require("../../assets/icons/shopping_expense.png") as number,
  Dining: require("../../assets/icons/food.png") as number,
  Home: require("../../assets/icons/home_lists.png") as number,
  Travel: require("../../assets/icons/travel_expense.png") as number,
  Bills: require("../../assets/icons/utilities.png") as number,
  Health: require("../../assets/icons/health_expense.png") as number,
  Drinks: require("../../assets/icons/cafe_lists.png") as number,
};

export function listIconImage(label: string): number {
  return listIconImages[label] ?? expenseCategoryImages.others;
}

export const categoryIconModules = [
  ...new Set([
    ...Object.values(expenseCategoryImages),
    ...Object.values(itemCategoryImages),
    ...Object.values(listIconImages),
  ]),
];

export const paymentImage = require("../../assets/icons/note.png") as number;
