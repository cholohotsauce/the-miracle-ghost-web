/** Contact form topics, in the order the buttons appear */
export const CONTACT_TOPICS = [
  { id: "commission", label: "Commission", hint: "A piece made for you or your wall." },
  { id: "collab", label: "Collab", hint: "Brands, artists, drops." },
  { id: "press", label: "Press", hint: "Interviews, features, podcasts." },
  { id: "other", label: "Other", hint: "Anything else. Keep it short." },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["id"];

export const MAX_CONTACT_MESSAGE = 2_000;
