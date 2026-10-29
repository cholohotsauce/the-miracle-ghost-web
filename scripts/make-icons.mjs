/**
 * Builds the small images made from Aes's own drawings in scripts/art/:
 *   public/sightings/ghost-pin-body.png  the map pin's body mask (white = inside), from original-ghost-dropless.png
 *   public/sightings/ghost-pin-ink.png   the map pin's black outline, without the face (Aes, 2026-10-20)
 *   public/sightings/ghost-pin-ink-face.png  the same outline with his eyes and smile, for ?map=classic
 *   src/app/icon.png, src/app/favicon.ico, src/app/apple-icon.png  the browser and home-screen icons, from ghost-silhouette.png
 *
 * Usage: node scripts/make-icons.mjs
 * Re-run when Aes sends a new pin or icon drawing (keep the same file names in scripts/art/).
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const PIN_SRC = "scripts/art/original-ghost-dropless.png";
const ICON_SRC = "scripts/art/ghost-silhouette.png";
const PIN_WIDTH = 240;
/** Aes's lines are thin for a pin about 50px wide on screen, so they are thickened by this many pixels */
const PIN_INK_GROW = 2;

/** Grows an alpha channel by `r` pixels (a square max filter, run once per pixel of growth) */
function dilate(alpha, width, height, r) {
  let src = alpha;
  for (let pass = 0; pass < r; pass++) {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let m = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) m = Math.max(m, src[ny * width + nx]);
          }
        }
        out[y * width + x] = m;
      }
    }
    src = out;
  }
  return src;
}

/** Keeps the largest 8-connected group of set pixels and clears the rest */
function largestPiece(mask, width, height) {
  const group = new Int32Array(mask.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let start = 0, id = 0; start < mask.length; start++) {
    if (!mask[start] || group[start] >= 0) continue;
    const stack = [start];
    group[start] = id;
    let size = 0;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const n = ny * width + nx;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[n] && group[n] < 0) {
            group[n] = id;
            stack.push(n);
          }
        }
      }
    }
    if (size > bestSize) [best, bestSize] = [id, size];
    id++;
  }
  return mask.map((v, i) => (group[i] === best ? v : 0));
}

// Map pin: the drawing is black lines on a white body over a transparent background
{
  const { data, info } = await sharp(PIN_SRC)
    .trim({ threshold: 1 })
    .resize({ width: PIN_WIDTH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const body = Buffer.alloc(width * height * 3);
  const lines = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255;
    const lum = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    body.fill(Math.round(a * 255), i * 3, i * 3 + 3);
    // Solid black wherever there is a fair bit of line, so the thin strokes stay dark once the pin is small
    lines[i] = a * (1 - lum) > 0.25 ? 255 : 0;
  }
  // The faceless pin keeps only the outline: the biggest connected run of line. The eyes and smile are separate strokes.
  const outline = largestPiece(lines, width, height);
  const writeInk = async (src, file) => {
    const grown = dilate(src, width, height, PIN_INK_GROW);
    const ink = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) ink[i * 4 + 3] = grown[i];
    await sharp(ink, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  };
  await sharp(body, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toFile("public/sightings/ghost-pin-body.png");
  await writeInk(outline, "public/sightings/ghost-pin-ink.png");
  await writeInk(lines, "public/sightings/ghost-pin-ink-face.png");
  console.log(`Pin: ${width}×${height} (aspect ${(width / height).toFixed(4)})`);
}

// Icons: the black silhouette, centered. The home-screen icon sits on white. The browser icons are the
// ghost fully black on a transparent background, with no rim (Aes, 2026-10-20: "completamente negro").
const iconGhost = (inner) =>
  sharp(ICON_SRC).trim({ threshold: 1 }).resize({ width: inner, height: inner, fit: "contain", background: "#ffffff00" });

/** The black ghost centered in a transparent size×size PNG */
async function blackIcon(size) {
  const ghost = await iconGhost(size - Math.round(size * 0.04)).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff00" } })
    .composite([{ input: ghost, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** An .ico file holding PNG images, which every current browser reads */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    header[e] = size >= 256 ? 0 : size;
    header[e + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.png)]);
}

await writeFile("src/app/icon.png", await blackIcon(512));
// Small sizes are drawn at their own size, so the edges stay crisp
const icoSizes = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await blackIcon(size) })));
await writeFile("src/app/favicon.ico", ico(icoSizes));
{
  const size = 180;
  const ghost = await iconGhost(Math.round(size * 0.86)).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: ghost, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile("src/app/apple-icon.png");
}
console.log("Wrote the map pin and the icons.");
