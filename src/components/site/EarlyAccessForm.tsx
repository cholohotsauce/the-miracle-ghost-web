"use client";

import { useState, type FormEvent } from "react";
import { track } from "@/lib/stats";

type Status = "idle" | "sending" | "done" | "error";

const ERRORS: Record<number, string> = {
  400: "That email looks off. Try again.",
  429: "Easy. Wait a minute and try again.",
  503: "The list isn't open yet. Try again soon.",
};

/**
 * Email sign-up for the next drop. `compact` is the one-line version inside the ghost's speech bubble;
 * `banner` is the white-on-black version in the Shop's drop banner.
 * Where sign-ups go: see app/api/early-access/route.ts.
 */
export default function EarlyAccessForm({
  from,
  compact = false,
  banner = false,
  prompt = "Want to know when the next drop lands?",
  cta = "Tell me",
}: {
  /** Where on the site the sign-up came from, e.g. "bubble" or "shop" */
  from: string;
  compact?: boolean;
  banner?: boolean;
  prompt?: string;
  cta?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [openedAt] = useState(() => Date.now());

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), website: form.get("website"), openedAt, from }),
      });
      if (!res.ok) throw new Error(ERRORS[res.status] ?? "The ghost dropped it. Try again.");
      setStatus("done");
      track("early_access_signup", { from });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The ghost dropped it. Try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className={compact ? "font-mono text-xs uppercase tracking-[0.2em]" : `font-drip text-2xl uppercase ${banner ? "text-[var(--color-neon-green)]" : ""}`}
      >
        You&apos;re on the list. 👻
      </p>
    );
  }

  const id = `early-access-${from}`;
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label
        htmlFor={id}
        data-scramble={banner ? undefined : true}
        className={
          banner
            ? "text-base font-medium md:mb-1 md:text-xl"
            : compact
              ? "font-mono text-xs uppercase tracking-[0.2em]"
              : "font-mono text-xs uppercase tracking-[0.2em]"
        }
      >
        {prompt}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@email.com"
          className={`min-w-0 flex-1 rounded-full border-2 px-4 text-base outline-none focus:shadow-[0_0_0_3px_var(--color-neon-green)] ${
            banner ? "border-background bg-foreground text-background placeholder:text-background/60" : "border-foreground bg-background"
          } ${compact || banner ? "h-10" : "h-12"} ${banner ? "md:h-12" : ""}`}
        />
        {/* Spam trap: hidden from people, filled in by bots */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />
        <button
          type="submit"
          data-magnetic
          disabled={status === "sending"}
          className={`shrink-0 rounded-full px-5 uppercase transition disabled:opacity-40 ${
            banner
              ? "bg-[var(--color-neon-green)] font-black tracking-wide text-foreground hover:scale-105 md:px-6 md:text-lg"
              : "bg-foreground font-mono text-xs tracking-[0.2em] text-background hover:shadow-[4px_4px_0_var(--color-neon-green)]"
          } ${compact || banner ? "h-10" : "h-12"} ${banner ? "md:h-12" : ""}`}
        >
          {status === "sending" ? "…" : cta}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
