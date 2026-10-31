/**
 * The fold-out sections under every product (Round 4 polish, 2026-10-31).
 * DRAFT: the shipping, returns, and certificate wording is a stand-in written by the developer.
 * Aes has to confirm the real rules before the shop opens; until then each section shows a DRAFT tag.
 * When the text is final, set `draft: false` on it.
 */

export type InfoSection = {
  title: string;
  body: string[];
  draft: boolean;
};

export const SHIPPING: InfoSection = {
  title: "Shipping & returns",
  body: [
    "Ships from Miami, tracked, within 3 to 5 business days.",
    "Originals ship insured and are packed by the artist.",
    "Merch can come back unworn within 14 days. Originals are final sale.",
  ],
  draft: true,
};

export const CARE: InfoSection = {
  title: "Care",
  body: ["Wash cold, inside out. Hang to dry.", "Don't iron over the print."],
  draft: true,
};

export const CERTIFICATE: InfoSection = {
  title: "Certificate of authenticity",
  body: ["Every original comes signed by Aes, with a certificate of authenticity."],
  draft: true,
};
