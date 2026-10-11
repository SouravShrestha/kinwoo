// require() instead of ESM imports: expo's allowArbitraryExtensions makes tsc look for a
// sibling "x.d.png.ts" per image instead of the ambient `declare module "*.png"`.
/* eslint-disable @typescript-eslint/no-require-imports */

export const landingImage = require("../../assets/images/landing-screen-image.png") as number;

export const landingImageDark =
  require("../../assets/images/landing-screen-image-dark-theme.png") as number;

export const logoTypedBlack = require("../../assets/images/logo-typed-black.png") as number;

export const logoTypedWhite = require("../../assets/images/logo-typed-white.png") as number;

export const inviteFriends = require("../../assets/images/invite-friends.png") as number;

export const buildYourHouse = require("../../assets/images/build-your-house.png") as number;

export const profileImage = require("../../assets/images/profile-image.png") as number;
