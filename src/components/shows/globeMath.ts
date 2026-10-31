import type { Sighting } from "@/content/shows";

/**
 * The globe's shared numbers and types, kept apart from GlobeScene so the Shows page
 * can use them without loading three.js before the globe itself.
 */

/** The globe's turn, shared by the drag handlers (outside the canvas) and the frame loop (inside) */
export type Spin = {
  yaw: number;
  pitch: number;
  /** Spin speed left over from a drag, in radians per second */
  vYaw: number;
  vPitch: number;
  dragging: boolean;
  /** Where the globe is turning to, when a ghost is open */
  target: { yaw: number; pitch: number } | null;
};

export type PinGroup = { city: string; at: [number, number]; items: { s: Sighting; i: number }[] };

/** Very slow, about two and a half minutes a turn */
export const AUTO_SPEED = 0.042;
/** How far the globe tips up or down, so the poles never flip over */
export const MAX_PITCH = 0.75;
/** The tilt the globe rests at, a little toward the north where most sightings are */
export const REST_PITCH = 0.18;
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** The turn that puts a city at the front */
export const facing = ([lat, lng]: [number, number]) => ({
  yaw: -rad(lng),
  pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, rad(lat))),
});

/** Shortest way around from one angle to another */
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));


/** Moves the globe on by one frame: toward an open city, or coasting after a drag back into the slow turn */
export function stepSpin(s: Spin, dt: number, reducedMotion: boolean) {
  if (s.dragging) return; // the drag handlers move it
  if (s.target) {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
    s.yaw += wrap(s.target.yaw - s.yaw) * k;
    s.pitch += (s.target.pitch - s.pitch) * k;
    return;
  }
  const k = 1 - Math.exp(-dt * 2.5);
  s.vYaw += ((reducedMotion ? 0 : AUTO_SPEED) - s.vYaw) * k;
  s.vPitch -= s.vPitch * k;
  s.yaw += s.vYaw * dt;
  s.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, s.pitch + s.vPitch * dt));
  // Drift back to a slight tilt toward the north
  s.pitch += (REST_PITCH - s.pitch) * (1 - Math.exp(-dt * 0.4));
}
