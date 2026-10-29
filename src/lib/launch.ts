/**
 * The public launch. Until LAUNCH_AT, the public domain (themiracleghost.com) shows the
 * "Spooky soon" teaser on every page, while the Vercel address keeps the full site for review.
 * The switch happens on its own at LAUNCH_AT; see src/proxy.ts.
 *
 * Both are set in Vercel (a redeploy picks up the change):
 *   LAUNCH_AT: the opening moment with its Miami offset, e.g. "2026-12-05T00:00:00-05:00".
 *              Unset (or not a date) means no date yet: the teaser stays up with no countdown.
 *   SITE_MODE: overrides the clock.
 *              "teaser": keep the teaser on the public domain, even after LAUNCH_AT
 *              "live":   show the full site on the public domain now
 */

function readLaunchAt() {
  const at = Date.parse(process.env.LAUNCH_AT ?? "");
  return Number.isNaN(at) ? null : at;
}

/** The opening moment in milliseconds, or null while the date is still to be announced */
export const LAUNCH_AT = readLaunchAt();

/** Addresses that show the teaser before launch */
export const TEASER_HOSTS = ["themiracleghost.com", "www.themiracleghost.com"];

/** Where the teaser lives. It can be opened directly on any address to review it. */
export const TEASER_PATH = "/soon";

export function isLaunched(now = Date.now()) {
  const mode = process.env.SITE_MODE;
  if (mode === "live") return true;
  if (mode === "teaser") return false;
  return LAUNCH_AT !== null && now >= LAUNCH_AT;
}

/** The launch day as the teaser prints it, e.g. "12.05.26", in Miami time */
export function launchDateLabel(at: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("month")}.${part("day")}.${part("year")}`;
}
