"use client";

import { useEffect, useRef } from "react";

/**
 * Things that happen elsewhere on the site that the ghost should react to.
 * The big ghost on Home and the mini ghost on other pages both listen.
 */
export type GhostEvent =
  /** Something went into the Shopify cart */
  | { type: "cart-add" }
  /** The last item came out of the cart */
  | { type: "cart-empty" }
  /** Something went well (a form was sent); the ghost celebrates and may say a line */
  | { type: "cheer"; line?: string }
  /** The visitor came back to this browser tab */
  | { type: "welcome-back" }
  /** The visitor hovers or focuses a product, at this point on screen */
  | { type: "look"; x: number; y: number }
  | { type: "look-away" };

const NAME = "tmg:ghost";

export function emitGhost(event: GhostEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GhostEvent>(NAME, { detail: event }));
}

export function useGhostEvents(handler: (event: GhostEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const listener = (e: Event) => ref.current((e as CustomEvent<GhostEvent>).detail);
    window.addEventListener(NAME, listener);
    return () => window.removeEventListener(NAME, listener);
  }, []);
}
