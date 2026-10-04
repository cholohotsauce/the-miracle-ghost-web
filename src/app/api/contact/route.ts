/**
 * The Contact page form: commissions, collabs, press, and everything else. Emailed to Aes.
 * Mail setup: see src/lib/mail.ts (CONTACT_TO overrides the inbox). Spam checks: see src/lib/spam.ts.
 */

import { CONTACT_TOPICS, MAX_CONTACT_MESSAGE } from "@/content/contact";
import { mailAes, mailResponse } from "@/lib/mail";
import { clean, isEmail, looksLikeBot, rateLimited } from "@/lib/spam";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const message = clean(body.message, MAX_CONTACT_MESSAGE);
  const topic = CONTACT_TOPICS.find((t) => t.id === body.topic) ?? CONTACT_TOPICS[CONTACT_TOPICS.length - 1];

  if (looksLikeBot(body, name, message)) return Response.json({ ok: true });
  if (!isEmail(email)) return Response.json({ error: "bad_email" }, { status: 400 });
  if (!message) return Response.json({ error: "empty" }, { status: 400 });
  if (rateLimited(request, "contact")) return Response.json({ error: "slow_down" }, { status: 429 });

  return mailResponse(
    await mailAes({
      to: process.env.CONTACT_TO,
      subject: `👻 ${topic.label}: ${name || email}`,
      text: `${message}\n\n— ${name || "(no name)"} <${email}>\nTopic: ${topic.label}`,
      replyTo: email,
    }),
  );
}
