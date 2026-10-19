/**
 * Shows and "ghost sightings" for the Shows page. A sighting is anywhere the ghost turns up:
 * murals, graffiti, stickers, paste-ups, anywhere in the world (Aes, 2026-10-19).
 * Replace the samples with Aes's real list. Entries marked `sample: true` show a SAMPLE tag.
 *
 * Sightings are pinned by city on purpose, never at an exact address:
 * street pieces can be unsanctioned, and a pin should not lead anyone to the wall or the artist.
 */

export type Show = {
  title: string;
  venue: string;
  city: string;
  /** ISO dates, YYYY-MM-DD */
  start: string;
  end?: string;
  /** Tickets, RSVP, or press link */
  link?: string;
  note?: string;
  sample?: boolean;
};

export const shows: Show[] = [
  {
    title: "Ghost Story",
    venue: "A gallery in Wynwood",
    city: "Miami, FL",
    start: "2026-12-04",
    end: "2026-12-07",
    sample: true,
  },
  {
    title: "Glow in the Dark",
    venue: "A pop-up in Little Haiti",
    city: "Miami, FL",
    start: "2025-12-05",
    sample: true,
  },
];

/** What kind of sighting it is, shown on its card */
export type SightingKind = "mural" | "graffiti" | "sticker" | "paste-up" | "other";

export type Sighting = {
  name: string;
  kind?: SightingKind;
  /** Shown on the card, e.g. "Miami, FL" */
  city: string;
  /** The city's center as [latitude, longitude], never the wall's spot */
  at: [number, number];
  year?: number;
  /** Still on the wall, painted over, or not known */
  status?: "running" | "buffed";
  /** Optional photo under /public, e.g. "/sightings/teal-ghost.jpg" */
  photo?: string;
  sample?: boolean;
};

export const sightings: Sighting[] = [
  { name: "Sample: Teal drip ghost", kind: "mural", city: "Miami, FL", at: [25.78, -80.21], year: 2024, status: "running", sample: true },
  { name: "Sample: Three-eyed ghost", kind: "graffiti", city: "Miami, FL", at: [25.78, -80.21], year: 2023, status: "buffed", sample: true },
  { name: "Sample: Ghost rider", kind: "graffiti", city: "New York, NY", at: [40.71, -74.0], year: 2025, status: "running", sample: true },
  { name: "Sample: Desert ghost", kind: "mural", city: "Los Angeles, CA", at: [34.05, -118.24], year: 2023, status: "running", sample: true },
  { name: "Sample: Ghost in the plaza", kind: "paste-up", city: "Mexico City", at: [19.43, -99.13], year: 2024, status: "buffed", sample: true },
  { name: "Sample: Ghost on tour", kind: "sticker", city: "Madrid", at: [40.42, -3.7], year: 2025, status: "running", sample: true },
  { name: "Sample: Sticker drop", kind: "sticker", city: "Tokyo", at: [35.68, 139.69], year: 2025, sample: true },
];
