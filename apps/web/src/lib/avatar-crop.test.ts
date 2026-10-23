import { describe, expect, it } from "vitest";

import { CROP_VIEW, centerCrop, clampCrop, cropScale, zoomCrop } from "./avatar-crop";

describe("avatar crop", () => {
  it("centres a landscape photo so it covers the viewport", () => {
    const crop = centerCrop(1000, 500);

    expect(cropScale(crop, 1000, 500)).toBe(CROP_VIEW / 500);
    expect(crop.y).toBe(0);
    expect(crop.x).toBe((CROP_VIEW - 1000 * (CROP_VIEW / 500)) / 2);
  });

  it("never lets the image drift off the viewport", () => {
    const crop = clampCrop({ zoom: 1, x: 500, y: -500 }, 1000, 500);

    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it("keeps the viewport centre on the same point while zooming", () => {
    const start = centerCrop(800, 800);
    const zoomed = zoomCrop(start, 2, 800, 800);

    expect(zoomed.zoom).toBe(2);
    expect(zoomed.x).toBe(-CROP_VIEW / 2);
    expect(zoomed.y).toBe(-CROP_VIEW / 2);
  });
});
