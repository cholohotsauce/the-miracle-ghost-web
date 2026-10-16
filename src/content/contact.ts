/** Contact form topics, in the order the buttons appear */
export const CONTACT_TOPICS = [
  { id: "commission", label: "Commissions" },
  { id: "collab", label: "Collaborations" },
  { id: "press", label: "Press" },
  { id: "other", label: "Other" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["id"];

export const MAX_CONTACT_MESSAGE = 2_000;
