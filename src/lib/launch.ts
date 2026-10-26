/**
 * The Halloween launch. Until LAUNCH_AT, the public domain (themiracleghost.com) shows the
 * "Spooky soon" teaser on every page, while the Vercel address keeps the full site for review.
 * The switch happens on its own at LAUNCH_AT; see src/proxy.ts.
 *
 * SITE_MODE in Vercel overrides the clock (a redeploy picks up the change):
 *   "teaser": keep the teaser on the public domain, even after LAUNCH_AT
 *   "live":   show the full site on the public domain now
 */

/** Midnight on Halloween, Miami time (still daylight time, UTC-4, on Oct 31 2026) */
export const LAUNCH_AT = Date.parse("2026-10-31T00:00:00-04:00");

/** Addresses that show the teaser before launch */
export const TEASER_HOSTS = ["themiracleghost.com", "www.themiracleghost.com"];

/** Where the teaser lives. It can be opened directly on any address to review it. */
export const TEASER_PATH = "/soon";

export function isLaunched(now = Date.now()) {
  const mode = process.env.SITE_MODE;
  if (mode === "live") return true;
  if (mode === "teaser") return false;
  return now >= LAUNCH_AT;
}
