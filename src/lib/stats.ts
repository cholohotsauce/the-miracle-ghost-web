"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Visitor stats, sent to Vercel Web Analytics (Vercel → Project → Analytics).
 * Page views are counted on every plan. Named events (the list below) need a plan that includes custom events.
 * Values must be strings, numbers, or booleans. Never put anything a visitor typed in here.
 */
export type StatEvent =
  | "ghost_enter"
  | "ghost_trick"
  | "ghost_tenth_click"
  | "ghost_message_sent"
  | "ghost_card_saved"
  | "ghost_woke_up"
  | "paint_mode"
  | "mini_ghost_poke"
  | "product_view"
  | "add_to_cart"
  | "early_access_signup"
  | "contact_sent";

export function track(event: StatEvent, props?: Record<string, string | number | boolean>) {
  try {
    vercelTrack(event, props);
  } catch {
    // Stats must never break the page
  }
}
