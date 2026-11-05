"use client";

import { useState, type FormEvent } from "react";
import { emitGhost } from "@/lib/ghostBus";
import { track } from "@/lib/stats";

type Status = "idle" | "sending" | "sent" | "error";
type Field = "name" | "email" | "message";

const ERRORS: Record<Field, string> = {
  name: "Tell the ghost your name.",
  email: "That email looks incomplete. Check the ending (like .com).",
  message: "Tell the ghost what you want to know.",
};
const SERVER_ERRORS: Record<number, string> = {
  429: "Easy. Wait a minute and try again.",
  503: "The ghost's mailbox isn't open yet. Try again soon.",
};
const DROPPED = "The ghost dropped it. Try again.";

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// Aes's mockup: square boxes with the label sitting inside, top left
const box = (bad?: boolean) =>
  `flex flex-col gap-1 border-2 bg-background px-4 pb-2 pt-3 transition-shadow duration-300 focus-within:shadow-[0_0_0_3px_var(--color-neon-green)] ${
    bad ? "border-[var(--color-neon-pink)]" : "border-foreground"
  }`;
const label = "text-xs uppercase tracking-[0.2em]";
const input = "w-full bg-transparent text-base outline-none";

/**
 * The Inquire form under an artwork (Aes's mockup, 2026-11-05). Emailed to Aes by app/api/inquiry/route.ts.
 */
export default function InquiryForm({ handle, title }: { handle: string; title: string }) {
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", message: "" });
  const [bad, setBad] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  const set = (f: Field) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    if (bad[f]) setBad((b) => ({ ...b, [f]: false }));
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = {
      name: !values.name.trim(),
      email: !looksLikeEmail(values.email),
      message: !values.message.trim(),
    };
    setBad(found);
    const first = (Object.keys(found) as Field[]).find((f) => found[f]);
    if (first) {
      setError(ERRORS[first]);
      document.getElementById(`inquiry-${first}`)?.focus();
      return;
    }
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, ...values, website: form.get("website"), openedAt }),
      });
      if (res.status === 400) {
        const { error: code } = await res.json().catch(() => ({ error: "" }));
        const f: Field = code === "no_name" ? "name" : code === "empty" ? "message" : "email";
        setBad({ [f]: true });
        setError(ERRORS[f]);
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error(SERVER_ERRORS[res.status] ?? DROPPED);
      setStatus("sent");
      track("inquiry_sent", { handle });
      emitGhost({ type: "cheer", line: "Sent it." });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : DROPPED);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="border-2 border-foreground p-6 shadow-[8px_8px_0_var(--color-neon-green)]">
        <p className="text-3xl uppercase leading-none md:text-4xl">Inquiry sent.</p>
        <p className="mt-3 leading-relaxed">
          The ghost got your note about {title}. Aes writes back to {values.email.trim()}.
        </p>
        <button
          type="button"
          onClick={() => {
            setValues((v) => ({ ...v, message: "" }));
            setOpenedAt(Date.now());
            setStatus("idle");
          }}
          className="mt-5 text-xs uppercase tracking-[0.2em] underline underline-offset-4"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="relative flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={box(bad.name)}>
          <span className={label}>Name *</span>
          <input id="inquiry-name" name="name" autoComplete="name" required maxLength={80} value={values.name} onChange={set("name")} aria-invalid={bad.name || undefined} className={input} />
        </label>
        <label className={box(bad.email)}>
          <span className={label}>Email *</span>
          <input id="inquiry-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={120} value={values.email} onChange={set("email")} aria-invalid={bad.email || undefined} className={input} />
        </label>
      </div>
      <label className={box(bad.message)}>
        <span className={label}>Message *</span>
        <textarea id="inquiry-message" name="message" required rows={4} maxLength={3000} value={values.message} onChange={set("message")} aria-invalid={bad.message || undefined} className={`${input} min-h-24 resize-y`} />
      </label>

      {/* Spam trap: hidden from people, filled in by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />

      {error && (
        <p role="alert" key={error} className="err-glitch text-sm text-[var(--color-neon-pink)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-14 w-full bg-foreground text-base uppercase tracking-[0.15em] text-background transition-[background-color,color] hover:bg-[var(--color-neon-green)] hover:text-foreground disabled:cursor-wait md:text-lg"
      >
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
