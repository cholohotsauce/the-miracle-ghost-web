// Bakes the low-poly ghost the clone trick uses for its swarm of about a hundred tiny ghosts:
//   public/models/miracle-ghost-mini.glb
// It starts from the site's own ghost (public/models/miracle-ghost.glb), so re-run it after bake-ghost-model.mjs.
// The face is painted by the shader, so the tiny ghosts keep Aes's face at any triangle count.
//
// Usage: node scripts/bake-mini-ghost.mjs [targetTriangles]

import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const TARGET_TRIANGLES = Number(process.argv[2] ?? 900);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "public/models/miracle-ghost.glb");
const OUT = path.join(ROOT, "public/models/miracle-ghost-mini.glb");

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

// 1. Read the ghost and expand it to model-space floats (the file stores quantized positions and a node scale)
const src = await io.read(SRC);
const node = src.getRoot().listNodes().find((n) => n.getMesh());
const prim = node.getMesh().listPrimitives()[0];
const m = node.getWorldMatrix();
const read = (name, size) => {
  const a = prim.getAttribute(name);
  const out = new Float32Array(a.getCount() * size);
  const el = [];
  for (let i = 0; i < a.getCount(); i++) {
    a.getElement(i, el);
    for (let c = 0; c < size; c++) out[i * size + c] = el[c];
  }
  return out;
};
const local = read("POSITION", 3);
const pos = new Float32Array(local.length);
for (let i = 0; i < local.length; i += 3) {
  const [x, y, z] = [local[i], local[i + 1], local[i + 2]];
  pos[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
  pos[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  pos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
}
const depth = read("_DEPTH", 1);
const idx = Uint32Array.from(prim.getIndices().getArray());

// 2. Decimate, then drop the vertices nothing uses any more
const [simplified, error] = MeshoptSimplifier.simplify(idx, pos, 3, TARGET_TRIANGLES * 3, 0.2, []);
const remap = new Map();
const outPos = [];
const outDepth = [];
const outIdx = new Uint32Array(simplified.length);
simplified.forEach((v, i) => {
  if (!remap.has(v)) {
    remap.set(v, remap.size);
    outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    outDepth.push(depth[v]);
  }
  outIdx[i] = remap.get(v);
});

// 3. Smooth normals, area-weighted
const normals = new Float32Array(outPos.length);
for (let i = 0; i < outIdx.length; i += 3) {
  const [a, b, c] = [outIdx[i] * 3, outIdx[i + 1] * 3, outIdx[i + 2] * 3];
  const e1 = [outPos[b] - outPos[a], outPos[b + 1] - outPos[a + 1], outPos[b + 2] - outPos[a + 2]];
  const e2 = [outPos[c] - outPos[a], outPos[c + 1] - outPos[a + 1], outPos[c + 2] - outPos[a + 2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  for (const v of [a, b, c]) for (let k = 0; k < 3; k++) normals[v + k] += n[k];
}
for (let i = 0; i < normals.length; i += 3) {
  const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
  for (let k = 0; k < 3; k++) normals[i + k] /= l;
}
console.log(`  mini ghost: ${outIdx.length / 3} triangles, ${outDepth.length} vertices (error ${error.toExponential(2)})`);

// 4. Write it the same way as the full ghost
const doc = new Document();
const buffer = doc.createBuffer();
const outPrim = doc
  .createPrimitive()
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(outIdx).setBuffer(buffer))
  .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(outPos)).setBuffer(buffer))
  .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(normals).setBuffer(buffer))
  .setAttribute("_DEPTH", doc.createAccessor().setType("SCALAR").setArray(new Float32Array(outDepth)).setBuffer(buffer));
doc.createScene().addChild(doc.createNode("MiniGhost").setMesh(doc.createMesh("MiniGhost").addPrimitive(outPrim)));
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));
await io.write(OUT, doc);
console.log(`  wrote ${path.relative(ROOT, OUT)}`);
