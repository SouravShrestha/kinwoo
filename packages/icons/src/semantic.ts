import {
  archiveIcon,
  bagDollarIcon,
  cartCheckIcon,
  cartCrossIcon,
  cartMinusIcon,
  cartPlusIcon,
  editNoteIcon,
  emailIcon,
  filePlusIcon,
  frownIcon,
  heartIcon,
  housePlusIcon,
  listSettingsIcon,
  moveIcon,
  paperPlaneIcon,
  pulseIcon,
  shieldCheckIcon,
  transactionIcon,
  trashOutlineIcon,
  userCheckIcon,
  userCrossIcon,
  type IconGeometry,
} from "./data";

// Names to shapes, shared by the web and native entry points so both apps draw the same icon for
// the same thing. Geometry objects (not names) keep the lookup tree-shakeable.

// Square viewBoxes that fit each glyph's longest side to 20/24 of the tile, as archive does, so
// every feed icon renders at the same size. Scoped here because the glyphs are shared with other
// screens. Recompute a line when its artwork in data.ts changes.
const ACTIVITY_VIEWBOX: Record<string, string> = {
  "cart-plus": "-0.91 -1.26 25.78 25.78",
  "item-edit": "18.24 20.75 86.4 86.4",
  "cart-check": "-0.91 -1.26 25.78 25.78",
  "cart-minus": "-0.91 -1.26 25.78 25.78",
  "cart-cross": "-11.45 -14.71 137.43 137.43",
  "bag-dollar": "-18.77 -8.96 107.55 107.55",
  transaction: "0 0 24 24",
  "user-check": "-11.37 -8.8 105.6 105.6",
  "user-cross": "-11.37 -8.8 105.6 105.6",
  heart: "-8.4 -14.4 100.8 100.8",
  frown: "-7 -7 84 84",
  "file-plus": "18.38 20.35 87.3 87.3",
  "list-settings": "16 16 96 96",
  trash: "-10.87 -9.41 112.95 112.95",
  "house-plus": "13.57 13.57 100.86 100.86",
  "shield-check": "-17 -9 108 108",
  invite: "14.72 14.72 98.56 98.56",
  "arrow-right": "11.52 11.52 104.96 104.96",
  email: "-8.2 -17.47 98.4 98.4",
  pulse: "-0.9 -0.9 25.8 25.8",
};

// Keyed by ActivityIconName from @kinwoo/core/grocery.
const ACTIVITY_SHAPES: Record<string, IconGeometry> = {
  "cart-plus": cartPlusIcon,
  "item-edit": editNoteIcon,
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
  archive: archiveIcon,
  "house-plus": housePlusIcon,
  "shield-check": shieldCheckIcon,
  invite: paperPlaneIcon,
  email: emailIcon,
  "arrow-right": moveIcon,
  pulse: pulseIcon,
};

const ACTIVITY: Record<string, IconGeometry> = Object.fromEntries(
  Object.entries(ACTIVITY_SHAPES).map(([name, shape]) => [
    name,
    { ...shape, viewBox: ACTIVITY_VIEWBOX[name] ?? shape.viewBox },
  ]),
);

export function activityGeometry(name: string): IconGeometry {
  return ACTIVITY[name] ?? ACTIVITY.pulse;
}
