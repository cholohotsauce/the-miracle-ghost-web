"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_TOPICS, MAX_CONTACT_MESSAGE, type ContactTopic } from "@/content/contact";
import { emitGhost } from "@/lib/ghostBus";
import { track } from "@/lib/stats";

type Status = "idle" | "sending" | "sent" | "error";

const ERRORS: Record<number, string> = {
  400: "Check your email address and the message.",
  429: "Easy. Wait a minute and try again.",
  503: "The ghost's mailbox isn't open yet. Try again soon.",
};

const field =
  "w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 text-base outline-none placeholder:text-foreground/45 focus:shadow-[0_0_0_3px_var(--color-neon-green)]";
const label = "font-mono text-xs uppercase tracking-[0.3em] text-foreground/60";

/** Commissions, collabs, press, and everything else. Emailed to Aes by app/api/contact/route.ts. */
export default function ContactForm() {
  const [topic, setTopic] = useState<ContactTopic>("commission");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [openedAt] = useState(() => Date.now());

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
          website: form.get("website"),
          openedAt,
        }),
      });
      if (!res.ok) throw new Error(ERRORS[res.status] ?? "The ghost dropped it. Try again.");
      setStatus("sent");
      track("contact_sent", { topic });
      emitGhost({ type: "cheer", line: "Sent it." });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The ghost dropped it. Try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="border-2 border-line p-6 shadow-[8px_8px_0_var(--color-neon-green)]">
        <p className="font-drip text-4xl uppercase leading-none">Sent.</p>
        <p className="mt-3 text-foreground/70">Aes reads every one. If it&apos;s good, you&apos;ll hear back.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="mb-4">
        <legend className={`mb-3 ${label}`}>Inquiry category</legend>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {CONTACT_TOPICS.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input
                type="radio"
                name="topic"
                value={t.id}
                checked={topic === t.id}
                onChange={() => setTopic(t.id)}
                className="peer sr-only"
              />
              <span className="block min-w-[5.5rem] rounded-full border-2 border-foreground px-5 py-2.5 text-center font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-muted peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:shadow-[0_0_0_3px_var(--color-neon-green)] md:px-7 md:text-sm">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={label}>Name</span>
          <input name="name" autoComplete="name" maxLength={80} className={field} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={label}>Email</span>
          <input name="email" type="email" required autoComplete="email" maxLength={120} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={label}>Message</span>
        <textarea
          name="message"
          required
          rows={7}
          maxLength={MAX_CONTACT_MESSAGE}
          placeholder="Please include your project details, location, and timeline."
          className={`${field} resize-y`}
        />
      </label>

      {/* Spam trap: hidden from people, filled in by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />

      {status === "error" && (
        <p role="alert" className="font-medium">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="h-16 w-full rounded-full bg-foreground font-mono text-base uppercase tracking-[0.3em] text-background transition-shadow hover:shadow-[6px_6px_0_var(--color-neon-green)] disabled:opacity-40 md:w-[26rem] md:self-start"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
