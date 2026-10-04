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
  "w-full rounded-xl border-2 border-foreground bg-background px-4 py-3 text-base outline-none focus:shadow-[0_0_0_3px_var(--color-neon-green)]";

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

  const active = CONTACT_TOPICS.find((t) => t.id === topic)!;
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-foreground/60">What&apos;s this about?</legend>
        <div className="flex flex-wrap gap-2">
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
              <span className="block rounded-full border-2 border-foreground px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:shadow-[0_0_0_3px_var(--color-neon-green)]">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-foreground/60">{active.hint}</p>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-foreground/60">Name</span>
          <input name="name" autoComplete="name" maxLength={80} className={field} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-foreground/60">Email</span>
          <input name="email" type="email" required autoComplete="email" maxLength={120} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-foreground/60">Message</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={MAX_CONTACT_MESSAGE}
          placeholder={topic === "commission" ? "What, where, how big, and when." : "Make it good."}
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
        className="h-14 w-full rounded-full bg-foreground font-mono text-sm uppercase tracking-[0.25em] text-background transition-shadow hover:shadow-[6px_6px_0_var(--color-neon-green)] disabled:opacity-40 md:w-auto md:self-start md:px-12"
      >
        {status === "sending" ? "Sending…" : "Send it to the ghost"}
      </button>
    </form>
  );
}
