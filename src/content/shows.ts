/**
 * Shows and "ghost sightings" (murals and street pieces) for the Shows page.
 * Replace the samples with Aes's real list. Entries marked `sample: true` show a SAMPLE tag.
 *
 * Sightings are placed by neighborhood on purpose, never at an exact address:
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

export type Neighborhood =
  | "Wynwood"
  | "Little Haiti"
  | "Little River"
  | "Design District"
  | "Allapattah"
  | "Overtown"
  | "Downtown"
  | "Little Havana"
  | "Coconut Grove"
  | "Miami Beach";

export type Sighting = {
  name: string;
  neighborhood: Neighborhood;
  year?: number;
  /** Still on the wall, painted over, or not known */
  status?: "running" | "buffed";
  /** Optional photo under /public, e.g. "/sightings/teal-ghost.jpg" */
  photo?: string;
  sample?: boolean;
};

export const sightings: Sighting[] = [
  { name: "Sample: Teal drip ghost", neighborhood: "Wynwood", year: 2024, status: "running", sample: true },
  { name: "Sample: Three-eyed ghost", neighborhood: "Little Haiti", year: 2023, status: "buffed", sample: true },
  { name: "Sample: Ghost rider", neighborhood: "Allapattah", year: 2025, status: "running", sample: true },
  { name: "Sample: Beach ghost", neighborhood: "Miami Beach", year: 2022, status: "buffed", sample: true },
];
