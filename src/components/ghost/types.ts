import type { RefObject } from "react";
import type { TrickName } from "./tricks";

/** Live inputs the ghost reads every frame. Kept in a ref so pointer and tilt never re-render React. */
export type GhostState = {
  /** False until the first click; after that the ghost sits lower as the mascot */
  entered: boolean;
  /** Cursor or device tilt, each axis in -1..1 */
  tilt: { x: number; y: number };
  /** The trick to play. Bumping `seq` restarts it, even when the name repeats. */
  trick: { name: TrickName | null; seq: number };
  reducedMotion: boolean;
};

export type GhostControls = RefObject<GhostState>;
