// require() instead of ESM imports: expo's allowArbitraryExtensions makes tsc look for a
// sibling "x.d.png.ts" per image instead of the ambient `declare module "*.png"`.
/* eslint-disable @typescript-eslint/no-require-imports */

export const landingImage = require("../../assets/images/landing-screen-image.png") as number;

export const landingImageDark =
  require("../../assets/images/landing-screen-image-dark-theme.png") as number;

export const profileImage = require("../../assets/images/profile-image.png") as number;
