"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  CONTACT_TOPICS,
  MAX_CONTACT_DETAIL,
  MAX_CONTACT_MESSAGE,
  type ContactDetail,
  type ContactTopic,
} from "@/content/contact";
import { emitGhost } from "@/lib/ghostBus";
import { track } from "@/lib/stats";

type Status = "idle" | "sending" | "sent" | "error";
type FieldErrors = { email?: string; message?: string };

const SERVER_ERRORS: Record<number, string> = {
  429: "Easy. Wait a minute and try again.",
  503: "The ghost's mailbox isn't open yet. Try again soon.",
};
const DROPPED = "The ghost dropped it. Try again.";
const EMAIL_ERROR = "That email looks incomplete. Check the ending (like .com).";
const MESSAGE_ERROR = "Tell the ghost something first.";

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const field = "w-full rounded-xl border-2 bg-background px-4 py-3.5 text-base outline-none placeholder:text-foreground/45";
const fieldBorder = (bad?: string) =>
  bad
    ? "border-[var(--color-neon-pink)] shadow-[0_0_0_3px_rgb(255_0_255_/_0.2)] focus:shadow-[0_0_0_3px_rgb(255_0_255_/_0.35)]"
    : "border-foreground focus:shadow-[0_0_0_3px_var(--color-neon-green)]";
const label = "flex justify-between font-mono text-xs uppercase tracking-[0.2em] text-foreground/60";
const pill =
  "rounded-full border-2 border-foreground px-4 py-2.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors md:text-sm";

/** "01  What's this about?" — the numbered heading over each part of the form */
function Step({ n, children }: { n: string; children: ReactNode }) {
  return (
    <span className="mb-4 mt-12 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] text-foreground/60 first:mt-0 md:mt-14 md:text-sm">
      <span className="tracking-[0.1em] text-foreground">{n}</span>
      {children}
    </span>
  );
}

function Required() {
  return <span className="text-[var(--color-neon-pink)]">Required</span>;
}

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <span id={id} className="text-sm text-[var(--color-neon-pink)]">
      {text}
    </span>
  );
}

/**
 * Commissions, collabs, press, and everything else. Emailed to Aes by app/api/contact/route.ts.
 * Each topic card adds its own extra questions (src/content/contact.ts).
 */
export default function ContactForm() {
  const [topicId, setTopicId] = useState<ContactTopic>("commission");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  const topic = CONTACT_TOPICS.find((t) => t.id === topicId) ?? CONTACT_TOPICS[0];
  const topicDetails: readonly ContactDetail[] = topic.details;
  const answered = topicDetails.filter((d) => details[d.id]?.trim());

  function setDetail(id: string, value: string) {
    setDetails((prev) => ({ ...prev, [id]: value }));
  }

  function check(): FieldErrors {
    return {
      email: looksLikeEmail(email) ? undefined : EMAIL_ERROR,
      message: message.trim() ? undefined : MESSAGE_ERROR,
    };
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = check();
    setErrors(found);
    if (found.email || found.message) {
      document.getElementById(found.email ? "contact-email" : "contact-message")?.focus();
      return;
    }
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicId,
          name,
          email,
          message,
          details: Object.fromEntries(answered.map((d) => [d.id, details[d.id]])),
          website: form.get("website"),
          openedAt,
        }),
      });
      if (res.status === 400) {
        const { error: code } = await res.json().catch(() => ({ error: "" }));
        setErrors(code === "empty" ? { message: MESSAGE_ERROR } : { email: EMAIL_ERROR });
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error(SERVER_ERRORS[res.status] ?? DROPPED);
      setStatus("sent");
      track("contact_sent", { topic: topicId });
      emitGhost({ type: "cheer", line: "Sent it." });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : DROPPED);
      setStatus("error");
    }
  }

  function startOver() {
    setMessage("");
    setDetails({});
    setErrors({});
    setError("");
    setOpenedAt(Date.now());
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="sent-card mt-12 rounded-[20px] border-2 border-foreground p-6 shadow-[8px_8px_0_var(--color-neon-green)] md:mt-14 md:p-8"
      >
        {/* The same bad-signal glitch as the teaser's SOON, with the breathing green dot */}
        <p className="font-drip text-[clamp(3rem,10vw,5rem)] uppercase leading-[0.9]">
          <span className="sr-only">Sent.</span>
          <span aria-hidden>
            <span className="soon-glitch" data-text="Sent">
              Sent
            </span>
            <span className="teaser-dot">.</span>
          </span>
        </p>
        <p className="mt-3 text-lg leading-snug text-foreground/70">
          Aes reads every one. If it&apos;s a fit, you&apos;ll hear back at {email.trim()}.
        </p>
        <p className="mt-5 border-t border-dashed border-foreground/35 pt-4 text-sm leading-relaxed text-foreground/70">
          {[topic.label, ...answered.map((d) => details[d.id].trim())].join(" · ")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={startOver} className={`${pill} h-13 bg-background px-6 hover:bg-muted`}>
            Send another
          </button>
          <Link href="/" className={`${pill} inline-flex h-13 items-center px-6 hover:bg-muted`}>
            Back to the ghost
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-12 flex flex-col md:mt-14">
      <fieldset>
        <legend className="contents">
          <Step n="01">What&apos;s this about?</Step>
        </legend>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {CONTACT_TOPICS.map((t, i) => {
            const on = t.id === topicId;
            return (
              <label key={t.id} data-reveal="item" className="cursor-pointer">
                <input
                  type="radio"
                  name="topic"
                  value={t.id}
                  checked={on}
                  onChange={() => setTopicId(t.id)}
                  className="peer sr-only"
                />
                <span
                  className={`relative flex h-full min-h-[7.5rem] flex-col justify-between rounded-[18px] border-2 border-foreground p-3.5 transition-[transform,box-shadow,background-color] duration-200 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-neon-green)] md:min-h-[8.25rem] md:p-4 ${
                    on
                      ? "-translate-x-0.5 -translate-y-0.5 bg-foreground text-background shadow-[6px_6px_0_var(--color-neon-green)]"
                      : "hover:bg-muted"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute right-3.5 top-3.5 size-4 rounded-full border-2 ${
                      on ? "border-[var(--color-neon-green)] bg-[var(--color-neon-green)]" : "border-foreground"
                    }`}
                  />
                  <span aria-hidden className={`font-mono text-xs tracking-[0.2em] ${on ? "opacity-75" : "opacity-50"}`}>
                    0{i + 1}
                  </span>
                  <span className="mt-4 block">
                    <span className="block text-lg uppercase leading-none md:text-[1.35rem]">{t.label}</span>
                    <span className={`mt-1.5 block text-sm leading-tight ${on ? "opacity-75" : "opacity-60"}`}>{t.hint}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Step n="02">About you</Step>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={label}>Name</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${field} ${fieldBorder()}`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={label}>
            Email <Required />
          </span>
          <input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setErrors((p) => ({ ...p, email: check().email }))}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={`${field} ${fieldBorder(errors.email)}`}
          />
          <FieldError id="contact-email-error" text={errors.email} />
        </label>
      </div>

      <Step n="03">The details</Step>
      <div className="flex flex-col gap-5">
        {topicDetails
          .filter((d) => d.options)
          .map((d) => (
            <fieldset key={d.id} className="flex flex-col gap-2">
              <legend className={`mb-2 ${label}`}>{d.label}</legend>
              <div className="flex flex-wrap gap-2">
                {d.options!.map((o) => {
                  const on = details[d.id] === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDetail(d.id, on ? "" : o)}
                      className={`${pill} ${on ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        {topicDetails.some((d) => !d.options) && (
          <div className="grid gap-5 md:grid-cols-2">
            {topicDetails
              .filter((d) => !d.options)
              .map((d, i, list) => (
                <label
                  key={d.id}
                  className={`flex flex-col gap-2 ${list.length === 1 && i === 0 ? "md:col-span-2" : ""}`}
                >
                  <span className={label}>{d.label}</span>
                  <input
                    name={d.id}
                    maxLength={MAX_CONTACT_DETAIL}
                    placeholder={d.placeholder}
                    value={details[d.id] ?? ""}
                    onChange={(e) => setDetail(d.id, e.target.value)}
                    className={`${field} ${fieldBorder()}`}
                  />
                </label>
              ))}
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className={label}>
            Message <Required />
          </span>
          <textarea
            id="contact-message"
            name="message"
            rows={7}
            maxLength={MAX_CONTACT_MESSAGE}
            placeholder={topic.placeholder}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message && e.target.value.trim()) setErrors((p) => ({ ...p, message: undefined }));
            }}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            className={`${field} ${fieldBorder(errors.message)} min-h-[12rem] resize-y`}
          />
          <span className="flex justify-between gap-4">
            <FieldError id="contact-message-error" text={errors.message} />
            <span aria-live="polite" className="ml-auto font-mono text-xs tracking-[0.2em] text-foreground/50">
              {message.length} / {MAX_CONTACT_MESSAGE}
            </span>
          </span>
        </label>
      </div>

      {/* Spam trap: hidden from people, filled in by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />

      {status === "error" && (
        <p role="alert" className="mt-6 font-medium text-[var(--color-neon-pink)]">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <button
          type="submit"
          disabled={status === "sending"}
          aria-busy={status === "sending"}
          className="send-button relative flex h-16 w-full items-center overflow-hidden justify-center gap-4 rounded-full bg-foreground px-10 font-mono text-base uppercase tracking-[0.2em] text-background shadow-[6px_6px_0_var(--color-neon-green)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--color-neon-green)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-wait md:w-auto"
        >
          {/* While it sends, a green light sweeps along the bottom of the button */}
          {status === "sending" && <span aria-hidden className="send-sweep absolute inset-x-0 bottom-0 h-1" />}
          {status === "sending" ? "Sending" : "Send message"}
          {status === "sending" ? (
            <span aria-hidden className="send-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          ) : (
            <span aria-hidden>→</span>
          )}
        </button>
        <p className="text-sm text-foreground/60">Aes reads every one.</p>
      </div>
    </form>
  );
}
