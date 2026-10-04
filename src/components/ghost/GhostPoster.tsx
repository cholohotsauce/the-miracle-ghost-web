import { FRAME_HEIGHT, FRAME_WIDTH, GHOST_HEIGHT, LOOK_Y } from "./framing";

/** A still render of Aes's ghost, cropped to the model's outline (scripts/render-ghost-poster.mjs makes it) */
export const POSTER_URL = "/ghost-poster.webp";

/**
 * Shows the still ghost exactly where the 3D ghost will appear, so the page has a ghost
 * from the first paint while three.js and the model load. Its parent must be a size container
 * (`[container-type:size]`) that matches the 3D canvas.
 */
export default function GhostPoster({
  visible,
  scale = 1,
  y = 0,
  priority = false,
}: {
  visible: boolean;
  /** Matches the ghost's scale in the scene (0.92 once entered) */
  scale?: number;
  /** Matches the ghost's height offset in world units (-0.3 once entered) */
  y?: number;
  priority?: boolean;
}) {
  // Pixels per world unit, as the camera fit computes it
  const unit = `min(100cqh / ${FRAME_HEIGHT}, 100cqw / ${FRAME_WIDTH})`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- must render before React hydrates, at a CSS-computed size
    <img
      src={POSTER_URL}
      alt=""
      aria-hidden
      draggable={false}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className="pointer-events-none absolute left-1/2 top-1/2 w-auto max-w-none select-none transition-opacity duration-500"
      style={{
        height: `calc(${unit} * ${GHOST_HEIGHT * scale})`,
        transform: `translate(-50%, -50%) translateY(calc(${unit} * ${-(y - LOOK_Y)}))`,
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
