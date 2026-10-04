/**
 * Messages visitors type into the ghost's speech bubble, emailed to Aes.
 * Mail setup: see src/lib/mail.ts. Spam checks: see src/lib/spam.ts.
 */

import { MAX_CONTACT, MAX_MESSAGE } from "@/lib/ghostMessage";
import { mailAes, mailResponse } from "@/lib/mail";
import { clean, looksLikeBot, rateLimited } from "@/lib/spam";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const message = clean(body.message, MAX_MESSAGE);
  const contact = clean(body.contact, MAX_CONTACT);
  // Tell bots it worked and drop it
  if (looksLikeBot(body, message, contact)) return Response.json({ ok: true });
  if (!message) return Response.json({ error: "empty" }, { status: 400 });
  if (rateLimited(request, "ghost")) return Response.json({ error: "slow_down" }, { status: 429 });

  return mailResponse(
    await mailAes({
      subject: "👻 Someone answered the ghost",
      text: `${message}\n\n— ${contact || "anonymous"}`,
      replyTo: contact,
    }),
  );
}
