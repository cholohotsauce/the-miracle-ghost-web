/**
 * The Contact page form: commissions, collabs, press, and everything else. Emailed to Aes.
 * Mail setup: see src/lib/mail.ts (CONTACT_TO overrides the inbox). Spam checks: see src/lib/spam.ts.
 */

import { CONTACT_TOPICS, MAX_CONTACT_DETAIL, MAX_CONTACT_MESSAGE, type ContactDetail } from "@/content/contact";
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
  // Keep only the extra questions this topic asks; chip answers must be one of the chips
  const sent = (body.details && typeof body.details === "object" ? body.details : {}) as Record<string, unknown>;
  const details = (topic.details as readonly ContactDetail[])
    .map((d) => {
      const value = clean(sent[d.id], MAX_CONTACT_DETAIL);
      return { label: d.label, value: d.options && !d.options.includes(value) ? "" : value };
    })
    .filter((d) => d.value);

  if (looksLikeBot(body, name, message, ...details.map((d) => d.value))) return Response.json({ ok: true });
  if (!isEmail(email)) return Response.json({ error: "bad_email" }, { status: 400 });
  if (!message) return Response.json({ error: "empty" }, { status: 400 });
  if (rateLimited(request, "contact")) return Response.json({ error: "slow_down" }, { status: 429 });

  return mailResponse(
    await mailAes({
      to: process.env.CONTACT_TO,
      subject: `👻 ${topic.label}: ${name || email}`,
      text: [
        message,
        "",
        `— ${name || "(no name)"} <${email}>`,
        `Topic: ${topic.label}`,
        ...details.map((d) => `${d.label.replace(/\?$/, "")}: ${d.value}`),
      ].join("\n"),
      replyTo: email,
    }),
  );
}
