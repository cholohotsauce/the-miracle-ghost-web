/**
 * Builds the small images made from Aes's own drawings in scripts/art/:
 *   public/sightings/ghost-pin-body.png  the map pin's body mask (white = inside), from original-ghost-dropless.png
 *   public/sightings/ghost-pin-ink.png   the map pin's black outline, without the face (Aes, 2026-10-20)
 *   public/sightings/ghost-pin-ink-face.png  the same outline with his eyes and smile, for ?map=classic
 *   src/app/icon.png, src/app/apple-icon.png  the browser and home-screen icons, from ghost-silhouette.png
 *
 * Usage: node scripts/make-icons.mjs
 * Re-run when Aes sends a new pin or icon drawing (keep the same file names in scripts/art/).
 */

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

// Icons: the black silhouette, centered. The browser icon stays transparent; the home-screen icon sits on white.
for (const [file, size, background] of [
  ["src/app/icon.png", 512, "#ffffff00"],
  ["src/app/apple-icon.png", 180, "#ffffff"],
]) {
  const inner = Math.round(size * 0.86);
  const ghost = await sharp(ICON_SRC)
    .trim({ threshold: 1 })
    .resize({ width: inner, height: inner, fit: "contain", background: "#ffffff00" })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: ghost, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}
console.log("Wrote the map pin and the icons.");
