/**
 * Drop details that Shopify doesn't hold. Edit this file to schedule drops and add edition info.
 *
 * - `editions` adds an edition line to a product ("1 of 1", "12 of 50"), keyed by Shopify handle.
 *   Products not listed here show "1 of 1" when their Shopify type is "Original Art".
 * - `releasesAt` (ISO date with time zone) locks a product behind the ghost until that moment:
 *   the card and page show a countdown and the Buy button stays hidden.
 * - `nextDrop` is the teaser card at the top of the Shop. Set it to null to hide it.
 */

export type ProductExtra = {
  edition?: string;
  releasesAt?: string;
};

export const productExtras: Record<string, ProductExtra> = {
  // "some-handle": { edition: "12 of 50", releasesAt: "2026-10-31T20:00:00-04:00" },
};

export type NextDrop = {
  title: string;
  teaser: string;
  releasesAt: string;
  /** True while this is our stand-in and not a real drop from Aes; shows a SAMPLE tag */
  sample: boolean;
};

export const nextDrop: NextDrop | null = {
  title: "Next drop",
  teaser: "Something's coming out of the wall. Get on the list and the ghost tells you first.",
  releasesAt: "2026-10-31T21:00:00-04:00",
  sample: true,
};

export function editionFor(handle: string, productType: string) {
  return productExtras[handle]?.edition ?? (/original/i.test(productType) ? "1 of 1" : undefined);
}

/** When a product unlocks, as an ISO string, if that is still in the future */
export function lockedUntil(handle: string) {
  const at = productExtras[handle]?.releasesAt;
  return at && new Date(at).getTime() > Date.now() ? new Date(at).toISOString() : undefined;
}

/** The next drop teaser, while its countdown is still running */
export function activeNextDrop() {
  return nextDrop && new Date(nextDrop.releasesAt).getTime() > Date.now() ? nextDrop : null;
}
