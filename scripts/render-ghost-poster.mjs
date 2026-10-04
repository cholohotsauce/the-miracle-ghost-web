/**
 * Renders the still ghost poster that shows while the 3D ghost loads, plus the share images and icons.
 *
 * Usage (with the site running, e.g. `npm run build && npx next start -p 3123`):
 *   node scripts/render-ghost-poster.mjs http://localhost:3123
 *
 * Needs Playwright with Chromium (`npm i -D playwright` once, or a global install).
 * Writes:
 *   public/ghost-poster.webp                            the ghost alone, cropped to its outline
 *   src/app/opengraph-image.png                         link preview, 1200×630
 *   src/app/icon.png, src/app/apple-icon.png            browser and home-screen icons
 * Re-run after Aes sends a new model (after scripts/bake-ghost-model.mjs).
 */

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

// Link preview: the ghost on the white wall, with the name in the site's drip lettering
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(base, { waitUntil: "networkidle" });
await og.evaluate((src) => {
  document.body.innerHTML = `
    <div style="position:fixed;inset:0;background:#fff;display:flex;align-items:center;gap:56px;padding:0 80px 0 90px;z-index:99999">
      <img src="${src}" style="height:520px;width:auto">
      <div>
        <div class="font-drip" style="font-size:108px;line-height:.95;color:#0a0a0a;text-transform:uppercase">The Miracle<br>Ghost</div>
        <div style="margin-top:28px;width:130px;height:9px;background:#39ff14"></div>
        <div style="margin-top:24px;font:600 22px ui-monospace,monospace;letter-spacing:.3em;color:#0a0a0a99">AES · MIAMI</div>
      </div>
    </div>`;
}, `data:image/png;base64,${ghost.toString("base64")}`);
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(300);
await og.screenshot({ path: "src/app/opengraph-image.png", type: "png" });
await browser.close();

// Icons: the ghost centered on white
for (const [file, size] of [["src/app/icon.png", 512], ["src/app/apple-icon.png", 180]]) {
  const inner = Math.round(size * 0.84);
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: await sharp(ghost).resize({ height: inner, width: inner, fit: "contain", background: "#ffffff00" }).toBuffer(), gravity: "center" }])
    .png()
    .toFile(file);
}

console.log("Wrote the poster, share image, and icons.");
