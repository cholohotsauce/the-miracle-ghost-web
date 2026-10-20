/**
 * Renders the still ghost poster that shows while the 3D ghost loads, plus the share image.
 * The icons come from Aes's silhouette drawing instead (scripts/make-icons.mjs).
 *
 * Usage (with the site running, e.g. `npm run build && npx next start -p 3123`):
 *   node scripts/render-ghost-poster.mjs http://localhost:3123
 *
 * Needs Playwright with Chromium (`npm i -D playwright` once, or a global install).
 * Writes:
 *   public/ghost-poster.webp                            the ghost alone, cropped to its outline
 *   src/app/opengraph-image.png, src/app/twitter-image.png   link preview, 1200×630
 * Re-run after Aes sends a new model (after scripts/bake-ghost-model.mjs).
 */

import fs from "node:fs/promises";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const { chromium } = await import("playwright").catch(() => {
  console.error("Playwright is missing. Install it with: npm i -D playwright");
  process.exit(1);
});

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// Reduced motion keeps the ghost still (no float, no blink) for a clean frame
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelector("canvas")?.width > 0);
await page.waitForTimeout(2500);
// Show only the 3D canvas, on a transparent page
await page.addStyleTag({
  content: "html,body{background:transparent!important} body *{visibility:hidden!important} canvas{visibility:visible!important}",
});
await page.waitForTimeout(300);
const shot = await page.screenshot({ omitBackground: true, type: "png" });

// Crop to the ghost's outline
const trimmed = await sharp(shot).trim({ threshold: 1 }).png().toBuffer();
const ghost = await sharp(trimmed).resize({ height: 900, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
await sharp(ghost).webp({ quality: 82, alphaQuality: 90 }).toFile("public/ghost-poster.webp");

// Link preview: the ghost alone on the white wall, the name in the site font, and a neon green/pink/teal tick
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(base, { waitUntil: "networkidle" });
await og.evaluate((src) => {
  const tick = (color) => `<i style="width:26px;height:5px;background:${color}"></i>`;
  document.body.innerHTML = `
    <div style="position:fixed;inset:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999">
      <img src="${src}" style="height:360px;width:auto">
      <div style="margin-top:34px;font:700 58px var(--font-space-grotesk);letter-spacing:.06em;color:#0a0a0a">THE MIRACLE GHOST</div>
      <div style="margin-top:22px;display:flex;gap:5px">${tick("#39ff14")}${tick("#ff00ff")}${tick("#00ffff")}</div>
    </div>`;
}, `data:image/png;base64,${ghost.toString("base64")}`);
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(300);
await og.screenshot({ path: "src/app/opengraph-image.png", type: "png" });
await fs.copyFile("src/app/opengraph-image.png", "src/app/twitter-image.png");
await browser.close();

console.log("Wrote the poster and share image.");
