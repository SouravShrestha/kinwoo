export const CROP_VIEW = 256;
export const MAX_ZOOM = 3;

// `x` and `y` are the image's top-left corner inside the square viewport, in viewport pixels.
// At zoom 1 the image just covers the viewport.
export interface Crop {
  zoom: number;
  x: number;
  y: number;
}

export const cropScale = (crop: Crop, width: number, height: number) =>
  (CROP_VIEW / Math.min(width, height)) * crop.zoom;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Keeps the image covering the viewport so the crop never contains empty space.
export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const scale = cropScale(crop, width, height);
  return {
    zoom: crop.zoom,
    x: clamp(crop.x, CROP_VIEW - width * scale, 0),
    y: clamp(crop.y, CROP_VIEW - height * scale, 0),
  };
}

export function centerCrop(width: number, height: number): Crop {
  const scale = cropScale({ zoom: 1, x: 0, y: 0 }, width, height);
  return clampCrop(
    { zoom: 1, x: (CROP_VIEW - width * scale) / 2, y: (CROP_VIEW - height * scale) / 2 },
    width,
    height,
  );
}

// Zooms around the viewport centre so the part of the photo being looked at stays put.
export function zoomCrop(crop: Crop, zoom: number, width: number, height: number): Crop {
  const before = cropScale(crop, width, height);
  const after = cropScale({ ...crop, zoom }, width, height);
  const centre = CROP_VIEW / 2;
  return clampCrop(
    {
      zoom,
      x: centre - ((centre - crop.x) / before) * after,
      y: centre - ((centre - crop.y) / before) * after,
    },
    width,
    height,
  );
}
