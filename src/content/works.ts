import type { StaticImageData } from "next/image";
import dormantGhost from "./archive/dormant-ghost.jpg";
import luminousGhost from "./archive/luminous-ghost.jpg";
import tealDripGhost from "./archive/teal-drip-ghost.jpg";
import slimeHorse from "./archive/slime-horse.jpg";
import catOnTheCliff from "./archive/cat-on-the-cliff.jpg";

export type Work = {
  slug: string;
  /** Working titles until Rommel supplies the real titles, years, and media */
  title: string;
  image: StaticImageData;
  alt: string;
  /** Glow color used for hover and lightbox light */
  accent: string;
};

export const works: Work[] = [
  {
    slug: "luminous-ghost",
    title: "Luminous",
    image: luminousGhost,
    alt: "A frosted white ghost glowing on a black panel, with a bright heart-light and faint red and blue veins inside.",
    accent: "#dfe8ff",
  },
  {
    slug: "teal-drip-ghost",
    title: "Teal Drip",
    image: tealDripGhost,
    alt: "A glowing teal ghost on a black panel, its hem dripping into two falling droplets.",
    accent: "#22f5d6",
  },
  {
    slug: "slime-horse",
    title: "Night Ride",
    image: slimeHorse,
    alt: "A toxic-green slime horse with grey bones, carrying two white ghosts under a crescent moon and night sky.",
    accent: "#39ff14",
  },
  {
    slug: "cat-on-the-cliff",
    title: "Cat on the Cliff",
    image: catOnTheCliff,
    alt: "A smiling white ghost draped over a brown cliff against a pink sky, with a black cat on its head.",
    accent: "#ff3fbf",
  },
  {
    slug: "dormant-ghost",
    title: "Dormant",
    image: dormantGhost,
    alt: "A black ghost barely visible on a black panel, only its eyes and smile glowing white.",
    accent: "#ffffff",
  },
];
