/**
 * Sends email through Resend: plain-text notes to Aes, and the designed welcome email to new Ghost List members.
 *
 * Environment (set in Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY      API key from resend.com
 *   GHOST_MESSAGE_TO    Aes's inbox (also where fans' replies to the welcome email go)
 *   GHOST_MESSAGE_FROM  A sender on a domain verified in Resend, e.g. "The Miracle Ghost <ghost@themiracleghost.com>"
 *   CONTACT_TO          Optional: a different inbox for the Contact form
 *
 * Without them, development logs the email to the terminal and production reports "not_configured".
 */

import { isEmail } from "./spam";

export type MailResult = "sent" | "logged" | "not_configured" | "failed";

/** One email through Resend. Returns "logged" in development when email isn't configured. */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  /** Only for emails we write ourselves (like the welcome email); never put visitor text in here */
  html?: string;
  replyTo?: string;
}): Promise<MailResult> {
  const { RESEND_API_KEY, GHOST_MESSAGE_FROM } = process.env;
  if (!RESEND_API_KEY || !to || !GHOST_MESSAGE_FROM) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail] email not configured; would send "${subject}" to ${to || "(nobody)"}:\n${text}`);
      return "logged";
    }
    return "not_configured";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: GHOST_MESSAGE_FROM,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo && isEmail(replyTo) ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    console.error("[mail] Resend failed", res.status, await res.text().catch(() => ""));
    return "failed";
  }
  return "sent";
}

/** A plain-text email to Aes (plain text only, so nothing a visitor types can render as HTML) */
export async function mailAes({
  subject,
  text,
  replyTo,
  to,
}: {
  subject: string;
  text: string;
  replyTo?: string;
  to?: string;
}): Promise<MailResult> {
  return sendEmail({ to: to || process.env.GHOST_MESSAGE_TO || "", subject, text, replyTo });
}

/** Maps a mail result to the API response every form route uses */
export function mailResponse(result: MailResult) {
  switch (result) {
    case "sent":
      return Response.json({ ok: true });
    case "logged":
      return Response.json({ ok: true, delivered: false });
    case "not_configured":
      return Response.json({ error: "not_configured" }, { status: 503 });
    case "failed":
      return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
