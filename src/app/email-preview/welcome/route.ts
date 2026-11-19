/**
 * Shows the welcome email in the browser, to check the design: /email-preview/welcome
 * Works locally and on Vercel preview links, never on the live site (it answers "not found" there).
 */

import { welcomeEmail } from "@/emails/welcome";

export function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") return new Response("Not found", { status: 404 });
  const { html } = welcomeEmail(new URL(request.url).origin);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
