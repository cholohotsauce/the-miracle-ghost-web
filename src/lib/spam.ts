/**
 * Spam checks shared by every form that emails Aes (the ghost's bubble, Contact, early access).
 * Each form sends three extra fields: `website` (a hidden trap that people never fill in),
 * and `openedAt` (when the form appeared, in ms since 1970).
 */

const WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();

/** Best effort: each server instance remembers recent senders for a minute */
export function rateLimited(request: Request, key: string, maxPerMinute = 3) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const hits = (recent.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(id, hits);
  if (recent.size > 5_000) recent.clear();
  return hits.length > maxPerMinute;
}

/** People take at least a couple of seconds to type; scripts post at once */
const MIN_FILL_MS = 1_500;
/** More links than this in one message is almost always spam */
const MAX_LINKS = 2;

/**
 * True when the submission looks automated. The caller answers "ok" anyway,
 * so a bot never learns which check caught it.
 */
export function looksLikeBot(body: Record<string, unknown>, ...texts: string[]) {
  if (typeof body.website === "string" && body.website.trim()) return true;
  const openedAt = Number(body.openedAt);
  if (Number.isFinite(openedAt) && openedAt > 0 && Date.now() - openedAt < MIN_FILL_MS) return true;
  const links = texts.join(" ").match(/https?:\/\/|www\./gi)?.length ?? 0;
  return links > MAX_LINKS;
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
