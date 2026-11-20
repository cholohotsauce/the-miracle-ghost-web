/**
 * The welcome email a fan gets right after joining the Ghost List.
 *
 * Email apps (Gmail, Outlook, Apple Mail) don't run normal web pages: no scripts, no stylesheets they
 * can rely on, no web fonts in most of them. So this is built the old way, with tables and inline styles,
 * and Helvetica/Arial for text. Images load from the live site (public/email/), as PNG because Outlook
 * doesn't show WebP.
 *
 * STAND-IN DESIGN (2026-11-19): this is direction A, "Member card", from the mockups, without the member
 * number. Aes is sending his own design; when it arrives, change the markup below and keep the exports.
 * To look at it in a browser: open /email-preview/welcome locally or on a Vercel preview link.
 */

import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME, SITE_URL } from "@/lib/site";

const INK = "#0b0b0c";
const SOFT = "#55525a";
const LINE = "#e7e5ea";
const GREEN = "#39ff14";
const FONT = "Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

export const WELCOME_SUBJECT = "You're on the Ghost List.";
/** The grey line email apps show after the subject in the inbox */
const PREVIEW = "You'll hear about every drop before anyone else. Don't tell anyone.";

const PERKS = ["First to know about every drop", "Early access before the public", "New shows and ghost sightings"];

export function welcomeEmail(siteUrl: string = SITE_URL) {
  const shopUrl = `${siteUrl}/shop`;
  const ghost = `${siteUrl}/email/ghost.png`;
  const ghostLight = `${siteUrl}/email/ghost-light.png`;

  const perks = PERKS.map(
    (perk, i) => `
          <tr>
            <td width="34" style="padding:10px 0;border-bottom:1px solid ${LINE};font:700 12px ${MONO};color:${INK};vertical-align:top;">0${i + 1}</td>
            <td style="padding:10px 0;border-bottom:1px solid ${LINE};font:400 14px/1.4 ${FONT};color:${INK};">${perk}</td>
          </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${WELCOME_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${PREVIEW}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td align="center" style="font:700 11px ${FONT};letter-spacing:3px;color:${INK};padding-bottom:24px;">THE MIRACLE GHOST</td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <img src="${ghost}" width="110" height="122" alt="The ghost" style="display:block;border:0;width:110px;height:auto;">
          </td>
        </tr>
        <tr>
          <td align="center" style="font:700 32px/1.05 ${FONT};letter-spacing:-1px;color:${INK};padding:8px 0 14px;">
            Welcome to the<br><span style="background:${GREEN};padding:0 6px;">Ghost List.</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="font:400 15px/1.55 ${FONT};color:${SOFT};padding:0 24px 26px;">
            You'll hear about every drop before anyone else.<br>No spam. The ghost hates spam.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:26px;">
            <!-- The member card -->
            <table role="presentation" width="300" cellpadding="0" cellspacing="0" border="0" style="width:300px;max-width:100%;background:${INK};border-radius:16px;border-right:6px solid ${GREEN};border-bottom:6px solid ${GREEN};">
              <tr>
                <td style="padding:18px 0 16px 18px;vertical-align:top;">
                  <div style="font:400 10px ${MONO};letter-spacing:2px;color:#9a97a0;">GHOST LIST</div>
                  <div style="font:700 26px/1.1 ${FONT};letter-spacing:-0.5px;color:#ffffff;padding:6px 0 12px;">MEMBER</div>
                  <div style="font:400 10px ${MONO};letter-spacing:1px;color:#cfcdd4;">MIAMI &middot; WORLDWIDE</div>
                </td>
                <td width="84" align="right" style="padding:12px 14px 0 0;vertical-align:top;">
                  <img src="${ghostLight}" width="64" height="71" alt="" style="display:block;border:0;width:64px;height:auto;">
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">${perks}
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 0 8px;">
            <a href="${shopUrl}" style="display:inline-block;background:${INK};color:#ffffff;font:700 15px ${FONT};text-decoration:none;padding:13px 26px;border-radius:999px;">See the shop</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="font:400 11px/1.7 ${MONO};color:#8a8790;padding-top:30px;">
            <a href="${siteUrl}" style="color:#8a8790;text-decoration:underline;">themiracleghost.com</a>
            &middot;
            <a href="${INSTAGRAM_URL}" style="color:#8a8790;text-decoration:underline;">@${INSTAGRAM_HANDLE}</a><br>
            You joined the Ghost List on our site.<br>
            Want off the list? Reply &ldquo;stop&rdquo; to this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `${SITE_NAME.toUpperCase()}`,
    "",
    "Welcome to the Ghost List.",
    "",
    "You'll hear about every drop before anyone else. No spam. The ghost hates spam.",
    "",
    ...PERKS.map((perk, i) => `0${i + 1}  ${perk}`),
    "",
    `See the shop: ${shopUrl}`,
    "",
    `${siteUrl} · @${INSTAGRAM_HANDLE}`,
    "You joined the Ghost List on our site. Want off the list? Reply \"stop\" to this email.",
  ].join("\n");

  return { subject: WELCOME_SUBJECT, html, text };
}
