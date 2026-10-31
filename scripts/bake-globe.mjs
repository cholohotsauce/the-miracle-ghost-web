// Bakes the textures for the Ghost Sightings globe on the Shows page (Aes, 2026-10-30):
// grey ocean and toxic green land, from Natural Earth 1:50m (public domain, via world-atlas),
// drawn flat (equirectangular) so they wrap straight onto a sphere.
//   public/sightings/globe-color.webp  the colors
//   public/sightings/globe-bump.webp   land raised over the ocean, for the light to catch the coasts
//   public/sightings/ghost-pin-mask.png  the pin's body as a see-through mask for CSS, made from
//                                        ghost-pin-body.png (scripts/make-icons.mjs; white = inside)
//
// Usage: node scripts/bake-globe.mjs

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const topo = require("world-atlas/land-50m.json");
const land = feature(topo, topo.objects.land);

const OCEAN = "#9a9ea6";
const LAND = "#39ff14"; // --color-neon-green
const COAST = "#22b80a";

async function bake(W, file, svgBody, quality) {
  const H = W / 2;
  const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.1);
  const d = geoPath(projection)(land);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgBody(d, W, H)}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality }).toFile(path.join(ROOT, "public/sightings", file));
  console.log(`wrote ${file}: ${W}x${H}, ${(fs.statSync(path.join(ROOT, "public/sightings", file)).size / 1024).toFixed(0)} KB`);
}

await bake(
  4096,
  "globe-color.webp",
  (d, W, H) =>
    `<rect width="${W}" height="${H}" fill="${OCEAN}"/><path d="${d}" fill="${LAND}" stroke="${COAST}" stroke-width="2.5" stroke-linejoin="round"/>`,
  88,
);
await bake(
  2048,
  "globe-bump.webp",
  (d, W, H) => `<rect width="${W}" height="${H}" fill="#000"/><path d="${d}" fill="#fff" stroke="#888" stroke-width="3"/>`,
  80,
);

// CSS masks read transparency, not brightness, so turn the white-inside body into alpha
{
  const src = path.join(ROOT, "public/sightings/ghost-pin-body.png");
  const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = data[i];
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, "public/sightings/ghost-pin-mask.png"));
  console.log("wrote ghost-pin-mask.png");
}
