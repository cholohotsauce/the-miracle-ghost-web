/**
 * Access to the Shopify Admin API, for adding early access sign-ups as email subscribers.
 *
 * Environment (set in Vercel → Project → Settings → Environment Variables), either:
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET   From an app made in Shopify's Dev Dashboard, with the
 *                                               read_customers and write_customers scopes, installed on the store.
 *                                               Shopify no longer lets stores make admin-created custom apps.
 *   SHOPIFY_ADMIN_TOKEN                          Or a fixed token from an older admin-created custom app.
 */

import { SHOP_DOMAIN } from "./shopify";

let cached: { token: string; expiresAt: number } | null = null;

/** A token for the Admin API, or null when none is configured */
export async function getAdminToken(): Promise<string | null> {
  const { SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
  if (SHOPIFY_ADMIN_TOKEN) return SHOPIFY_ADMIN_TOKEN;
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) return null;

  // Tokens from the client credentials grant last 24 hours; get a new one a few minutes early
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Shopify token ${res.status}: ${await res.text().catch(() => "")}`);
  const json: { access_token: string; expires_in: number } = await res.json();
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
  return cached.token;
}
