/** One extra question a topic asks: a short text field, or a row of chips to pick one from */
export type ContactDetail = {
  id: string;
  label: string;
  placeholder?: string;
  /** When set, the detail is a row of chips with these choices */
  options?: readonly string[];
};

/** Contact form topics, in the order the cards appear. Each topic asks only what it needs. */
export const CONTACT_TOPICS = [
  {
    id: "commission",
    label: "Commissions",
    hint: "A piece made just for you",
    // Aes's text for the Message box (2026-10-30)
    placeholder:
      "Please provide a brief overview of your project, including your estimated budget, preferred timeline, dimensions, and any other relevant details.",
    details: [
      { id: "budget", label: "Budget", options: ["Under $1K", "$1K – $5K", "$5K+", "Not sure"] },
      { id: "timeline", label: "Timeline", placeholder: "When do you need it?" },
      { id: "place", label: "Where will it live?", placeholder: "Wall, canvas, object, city…" },
    ],
  },
  {
    id: "collab",
    label: "Collab",
    hint: "Brands, artists, projects",
    placeholder: "Tell the ghost the idea.",
    details: [{ id: "brand", label: "Brand or project", placeholder: "Who are you working with?" }],
  },
  {
    id: "press",
    label: "Press",
    hint: "Interviews and features",
    placeholder: "What's the story, and what do you need from Aes?",
    details: [
      { id: "outlet", label: "Outlet", placeholder: "Magazine, site, show…" },
      { id: "deadline", label: "Deadline", placeholder: "When do you need answers?" },
    ],
  },
  {
    id: "other",
    label: "Other",
    hint: "Anything else",
    placeholder: "Say what's on your mind.",
    details: [],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  details: readonly ContactDetail[];
}[];

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["id"];

export const MAX_CONTACT_MESSAGE = 2_000;
/** Longest answer kept for one extra question */
export const MAX_CONTACT_DETAIL = 120;
