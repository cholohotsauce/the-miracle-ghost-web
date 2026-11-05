/**
 * Shows and "ghost sightings" for the Shows page. A sighting is anywhere the ghost turns up:
 * murals, graffiti, stickers, paste-ups, anywhere in the world (Aes, 2026-10-19).
 * The sightings are Aes's city list (2026-11-04). A piece's name, kind, year, or photo can be added to any of them.
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
  /**
   * The show's recap video, played on the site when someone clicks the title:
   * a file under /public (e.g. "/videos/partners-in-crime.mp4") or a YouTube or Vimeo link
   */
  video?: string;
  /** A still for a video file, shown before it plays and through the title letters on hover */
  videoPoster?: string;
  note?: string;
  sample?: boolean;
};

export const shows: Show[] = [
  {
    title: "Partners in Crime",
    venue: "Central Command Gallery",
    city: "Miami, FL",
    start: "2026-07-25",
    // Aes's opening recap (2026-11-05), compressed for the web from the original file
    video: "/videos/partners-in-crime-recap.mp4",
    videoPoster: "/videos/partners-in-crime-recap.jpg",
  },
];

/** What kind of sighting it is, shown on its card */
export type SightingKind = "mural" | "graffiti" | "sticker" | "paste-up" | "other";

export type Sighting = {
  /** The piece's name, when there is one; the card shows the city otherwise */
  name?: string;
  kind?: SightingKind;
  /** Shown on the card and over the ghost, e.g. "Miami, USA" */
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

/** Aes's list of cities where the ghost has turned up (2026-11-04), one ghost on each, at the city center */
export const sightings: Sighting[] = [
  { city: "Caracas, Venezuela", at: [10.48, -66.9] },
  { city: "Rio de Janeiro, Brazil", at: [-22.91, -43.17] },
  { city: "Panama City, Panama", at: [8.98, -79.52] },
  { city: "Puerto Rico", at: [18.47, -66.11] },
  { city: "Curaçao", at: [12.12, -68.93] },
  { city: "Miami, USA", at: [25.76, -80.19] },
  { city: "New York, USA", at: [40.71, -74.01] },
  { city: "Los Angeles, USA", at: [34.05, -118.24] },
  { city: "Dallas, USA", at: [32.78, -96.8] },
  { city: "Toronto, Canada", at: [43.65, -79.38] },
  { city: "Mexico City, Mexico", at: [19.43, -99.13] },
  { city: "Santiago, Chile", at: [-33.45, -70.67] },
  { city: "Rome, Italy", at: [41.9, 12.5] },
  { city: "Paris, France", at: [48.86, 2.35] },
  { city: "Barcelona, Spain", at: [41.39, 2.17] },
  { city: "Madrid, Spain", at: [40.42, -3.7] },
  { city: "New Delhi, India", at: [28.61, 77.21] },
  { city: "Moscow, Russia", at: [55.76, 37.62] },
  { city: "Tokyo, Japan", at: [35.68, 139.69] },
];
