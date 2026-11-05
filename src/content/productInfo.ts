/**
 * The fold-out sections under a merch product (Round 4 polish, 2026-10-31; Aes's mockup, 2026-11-05).
 * A section with `draft: true` shows a DRAFT tag until Aes confirms its wording.
 */

export type InfoSection = {
  title: string;
  body: string[];
  draft: boolean;
};

export const SHIPPING: InfoSection = {
  title: "Shipping & returns",
  // Aes's own words from his merch mockup (2026-11-05)
  body: [
    "Ships from Miami with tracking within 3–5 business days.",
    "All sales are final. No returns or exchanges, except for damaged or incorrect items or as required by law.",
  ],
  draft: false,
};
