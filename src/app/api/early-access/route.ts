/**
 * Early access sign-ups: people who want to hear about the next drop.
 *
 * Where the email goes, in order of preference:
 *   1. Shopify, as a customer subscribed to email marketing, when SHOPIFY_ADMIN_TOKEN is set.
 *      Then Aes can announce drops with Shopify Email. The token comes from a custom app in
 *      Shopify admin → Settings → Apps → Develop apps, with the read_customers and write_customers scopes.
 *   2. Otherwise, an email to Aes's inbox (see src/lib/mail.ts), one per sign-up.
 */

import { mailAes, mailResponse } from "@/lib/mail";
import { SHOP_DOMAIN } from "@/lib/shopify";
import { clean, isEmail, looksLikeBot, rateLimited } from "@/lib/spam";

const ADMIN_API_VERSION = "2025-10";

async function subscribeInShopify(email: string, token: string) {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation Subscribe($input: CustomerInput!) {
        customerCreate(input: $input) { customer { id } userErrors { field message } }
      }`,
      variables: {
        input: {
          email,
          tags: ["early-access", "website"],
          emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "SINGLE_OPT_IN" },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const json = await res.json();
  const errors: { message: string }[] = json?.data?.customerCreate?.userErrors ?? [];
  // Already a customer: that's fine, they're on the list or can be added from Shopify admin
  if (errors.length && !errors.some((e) => /taken|already/i.test(e.message))) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = clean(body.email, 120);
  const from = clean(body.from, 40) || "site";
  if (looksLikeBot(body)) return Response.json({ ok: true });
  if (!isEmail(email)) return Response.json({ error: "bad_email" }, { status: 400 });
  if (rateLimited(request, "early-access")) return Response.json({ error: "slow_down" }, { status: 429 });

  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (token) {
    try {
      await subscribeInShopify(email, token);
      return Response.json({ ok: true });
    } catch (err) {
      // Fall through to email so the sign-up is never lost
      console.error("[early-access] Shopify failed", err);
    }
  }

  return mailResponse(
    await mailAes({
      subject: "👻 Early access sign-up",
      text: `${email} wants to hear about the next drop.\n\nSigned up from: ${from}`,
    }),
  );
}
