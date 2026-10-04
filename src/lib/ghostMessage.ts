/** Shared by the speech bubble and the API route that emails Aes */

export const MAX_MESSAGE = 600;
export const MAX_CONTACT = 120;

/** What the ghost barks on the tenth click. Aes's words from his video, lightly bleeped. */
export const GHOST_QUESTION = "What the f*ck do you want?";

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
