/**
 * Messages visitors type into the ghost's speech bubble, emailed to Aes through Resend.
 *
 * Environment (set in Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY      API key from resend.com
 *   GHOST_MESSAGE_TO    Aes's inbox
 *   GHOST_MESSAGE_FROM  A sender on a domain verified in Resend, e.g. "The Miracle Ghost <ghost@themiracleghost.com>"
 *
 * Without them, development logs the message to the terminal and production answers 503.
 */

import { isEmail, MAX_CONTACT, MAX_MESSAGE } from "@/lib/ghostMessage";

// Best effort: each server instance remembers recent senders for a minute
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5_000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Bots fill in the hidden field; tell them it worked and drop it
  if (clean(body.website, 200)) return Response.json({ ok: true });

  const message = clean(body.message, MAX_MESSAGE);
  const contact = clean(body.contact, MAX_CONTACT);
  if (!message) return Response.json({ error: "empty" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return Response.json({ error: "slow_down" }, { status: 429 });

  const { RESEND_API_KEY, GHOST_MESSAGE_TO, GHOST_MESSAGE_FROM } = process.env;
  if (!RESEND_API_KEY || !GHOST_MESSAGE_TO || !GHOST_MESSAGE_FROM) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ghost-message] email not configured; message was:", { message, contact });
      return Response.json({ ok: true, delivered: false });
    }
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: GHOST_MESSAGE_FROM,
      to: [GHOST_MESSAGE_TO],
      subject: "👻 Someone answered the ghost",
      // Plain text only, so nothing a visitor types can render as HTML
      text: `${message}\n\n— ${contact || "anonymous"}`,
      ...(isEmail(contact) ? { reply_to: contact } : {}),
    }),
  });

  if (!res.ok) {
    console.error("[ghost-message] Resend failed", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
