/** Shared by the speech bubble and the API route that emails Aes */

export const MAX_MESSAGE = 600;
export const MAX_CONTACT = 120;

/** What the ghost barks on the tenth click, in Aes's words */
export const GHOST_QUESTION = "Alright, buddy. Quit the poking.";

/** The hint inside the message box under the question */
export const GHOST_PROMPT = "Spit it out. I'll make sure the boss gets it.";

/** What the ghost says once the message is sent */
export const GHOST_SENT = "Got it. Now beat it.";

export { isEmail } from "./spam";
