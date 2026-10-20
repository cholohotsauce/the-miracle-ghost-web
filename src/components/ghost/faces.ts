import lilmad from "./faceBakes/lilmad.json";
import swag from "./faceBakes/swag.json";
import { EYES, FACE_MAP_URL, FACE_RECT, MOUTH } from "./modelBake";

/**
 * Aes's ghost faces. Each one is a painted face seen from the front, laid over the same body:
 * a map (R = eyes, G = mouth ink, B = white teeth) and where its eyes and mouth sit in model XY.
 * The shader draws the grin, frown, lids and blinks from these landmarks, so every trick works with every face.
 *
 * To add a face (Sleepy next): bake its map with scripts/bake-face-decal.mjs, add an entry here, and give it tricks
 * in TRICK_FACE (tricks.ts).
 */

export type FaceName = "original" | "grim" | "lilmad" | "swag";

type Rect = { minX: number; maxX: number; minY: number; maxY: number };
type Eye = { cx: number; cy: number; halfW: number; halfH: number; top: readonly number[]; bottom: readonly number[] };

export type Face = {
  map: string;
  /** Where the map sits in model XY */
  rect: Rect;
  /** Left eye, then right: its box (for blinking) and the two ends of its stroke */
  eyes: readonly Eye[];
  /** The mouth: its corners reach y = top, its lowest point y = bottom */
  mouth: { top: number; bottom: number; cx: number; halfW: number };
  /** How high a frown's point reaches when the mouth flips over */
  frownTop: number;
  /** False for faces already drawn mad or smug: a trick's frown would flip them into a smile, so it leaves them be */
  frowns: boolean;
};

export const FACES: Record<FaceName, Face> = {
  // The first model's face (3D Thick Ghost finished.obj): two tall line eyes and a simple smile.
  // Map baked from its polypaint in PR #3; landmarks measured from that map.
  original: {
    map: "/models/miracle-ghost-face-original.png",
    rect: { minX: -0.6245, maxX: 0.6245, minY: -0.1284, maxY: 1.1206 },
    eyes: [
      { cx: -0.1909, cy: 0.5729, halfW: 0.022, halfH: 0.4275, top: [-0.1891, 1.0005], bottom: [-0.1914, 0.1454] },
      { cx: 0.1909, cy: 0.5729, halfW: 0.022, halfH: 0.4275, top: [0.1891, 1.0005], bottom: [0.1914, 0.1454] },
    ],
    mouth: { top: 0.1527, bottom: -0.0095, cx: 0, halfW: 0.2958 },
    // The smile sits wide of the eyes, so it can flip in place
    frownTop: 0.1527,
    frowns: true,
  },
  // The 3D artist's Grim Ghost (scripts/bake-ghost-model.mjs): V eyes and a pointed grin full of teeth
  grim: {
    map: FACE_MAP_URL,
    rect: FACE_RECT,
    eyes: EYES,
    mouth: MOUTH,
    // The long grin is squeezed in below the eyes so its point stays clear of them
    frownTop: EYES[1].bottom[1] - 0.08,
    frowns: true,
  },
  // The 3D artist's Lilmad and Swag faces, baked by scripts/bake-face-decal.mjs.
  // Lilmad Ghost: straight V eyes over an upside-down toothy frown
  lilmad: { ...lilmad, frownTop: lilmad.mouth.top, frowns: false },
  // The 3D artist's Swag Ghost ("Hustler" in Aes's list): black V brows over a tall toothy grin
  swag: { ...swag, frownTop: swag.mouth.top, frowns: false },
};

export const FACE_NAMES = Object.keys(FACES) as FaceName[];

/** The face he wears when nothing is happening (Aes, 2026-10-19) */
export const IDLE_FACE: FaceName = "original";
