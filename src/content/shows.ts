/**
 * Shows and "ghost sightings" (murals and street pieces) for the Shows page.
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
    title: "Sample: Ghost Story",
    venue: "A gallery in Wynwood",
    city: "Miami, FL",
    start: "2026-12-04",
    end: "2026-12-07",
    note: "Placeholder for an upcoming show. Swap in the real one.",
    sample: true,
  },
  {
    title: "Sample: Glow in the Dark",
    venue: "A pop-up in Little Haiti",
    city: "Miami, FL",
    start: "2025-12-05",
    note: "Placeholder for a past show.",
    sample: true,
  },
];

export type Sighting = {
  name: string;
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
  { name: "Sample: Teal drip ghost", city: "Miami, FL", at: [25.78, -80.21], year: 2024, status: "running", sample: true },
  { name: "Sample: Three-eyed ghost", city: "Miami, FL", at: [25.78, -80.21], year: 2023, status: "buffed", sample: true },
  { name: "Sample: Ghost rider", city: "New York, NY", at: [40.71, -74.0], year: 2025, status: "running", sample: true },
  { name: "Sample: Desert ghost", city: "Los Angeles, CA", at: [34.05, -118.24], year: 2023, status: "running", sample: true },
  { name: "Sample: Ghost in the plaza", city: "Mexico City", at: [19.43, -99.13], year: 2024, status: "buffed", sample: true },
  { name: "Sample: Ghost on tour", city: "Madrid", at: [40.42, -3.7], year: 2025, status: "running", sample: true },
];
