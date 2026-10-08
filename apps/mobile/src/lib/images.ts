/*
 * Static assets, in one place so the require() exception is made once.
 *
 * Metro resolves bundled assets through require(), and a static ESM import is
 * not a drop-in replacement here: expo/tsconfig.base sets
 * allowArbitraryExtensions, which makes tsc resolve "./x.png" to a sibling
 * "x.d.png.ts" declaration rather than to an ambient `declare module "*.png"`.
 * That would mean a hand-written declaration file per image.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

export const landingImage = require("../../assets/images/landing-screen-image.png") as number;

export const landingImageDark =
  require("../../assets/images/landing-screen-image-dark-theme.png") as number;

export const profileImage = require("../../assets/images/profile-image.png") as number;
