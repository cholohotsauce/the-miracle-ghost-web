/**
 * The Inquire form on an artwork's page: availability, price, and more info about one piece. Emailed to Aes.
 * Mail setup: see src/lib/mail.ts (CONTACT_TO overrides the inbox, same as Contact). Spam checks: see src/lib/spam.ts.
 */

import { mailAes, mailResponse } from "@/lib/mail";
import { getProduct } from "@/lib/shopify";
import { SITE_URL } from "@/lib/site";
import { clean, isEmail, looksLikeBot, rateLimited } from "@/lib/spam";

const MAX_INQUIRY_MESSAGE = 3000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const message = clean(body.message, MAX_INQUIRY_MESSAGE);
  // Only trust the artwork title from Shopify, never what the browser sends
  const product = await getProduct(clean(body.handle, 120));

  if (looksLikeBot(body, name, message)) return Response.json({ ok: true });
  if (!product) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!name) return Response.json({ error: "no_name" }, { status: 400 });
  if (!isEmail(email)) return Response.json({ error: "bad_email" }, { status: 400 });
  if (!message) return Response.json({ error: "empty" }, { status: 400 });
  if (rateLimited(request, "inquiry")) return Response.json({ error: "slow_down" }, { status: 429 });

  return mailResponse(
    await mailAes({
      to: process.env.CONTACT_TO,
      subject: `👻 Artwork inquiry: ${product.title} (${name})`,
      text: [
        message,
        "",
        `— ${name} <${email}>`,
        `Artwork: ${product.title}`,
        `${SITE_URL}/shop/${product.handle}`,
      ].join("\n"),
      replyTo: email,
    }),
  );
}
