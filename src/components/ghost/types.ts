import type { RefObject } from "react";

/** Live inputs the ghost reads every frame. Kept in a ref so pointer and tilt never re-render React. */
export type GhostState = {
  awake: boolean;
  color: string;
  /** Cursor or device tilt, each axis in -1..1 */
  tilt: { x: number; y: number };
  /** Increments on every poke */
  pokes: number;
  reducedMotion: boolean;
};

export type GhostControls = RefObject<GhostState>;
