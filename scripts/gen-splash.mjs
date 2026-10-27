// Renders the iOS launch images (apple-touch-startup-image) shown before the web app loads.
// Colours and logo mirror the mobile splash. Run: node scripts/gen-splash.mjs
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const devices = JSON.parse(readFileSync("apps/web/src/lib/splash-devices.json", "utf8"));
const themes = {
  light: { background: "#fefefe", logo: "apps/web/public/images/splash-icon-black.png" },
  dark: { background: "#0e0e0e", logo: "apps/web/public/images/splash-icon-white.png" },
};
const LOGO_WIDTH_PT = 200;
const out = "apps/web/public/splash";
mkdirSync(out, { recursive: true });

for (const [w, h, ratio] of devices) {
  const width = w * ratio;
  const height = h * ratio;
  for (const [theme, { background, logo }] of Object.entries(themes)) {
    const logoBuffer = await sharp(logo)
      .resize({ width: LOGO_WIDTH_PT * ratio })
      .toBuffer();
    await sharp({ create: { width, height, channels: 3, background } })
      .composite([{ input: logoBuffer, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(`${out}/${width}x${height}-${theme}.png`);
  }
}
