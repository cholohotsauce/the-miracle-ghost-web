"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import { GHOST_PROMPT, GHOST_QUESTION, GHOST_SENT, MAX_CONTACT, MAX_MESSAGE } from "@/lib/ghostMessage";
import { drawInsultCard, shareInsultCard } from "@/lib/shareCard";
import { track } from "@/lib/stats";

type Status = "idle" | "sending" | "sent" | "error";

const ERRORS: Record<number, string> = {
  429: "Easy. Wait a minute and try again.",
  503: "The ghost's mailbox isn't open yet. Try again soon.",
};

/**
 * The tenth click: the ghost barks a question, the visitor answers, and the answer goes to Aes.
 * Afterwards the visitor can save a "told me off" card to post, and join the early access list.
 */
export default function SpeechBubble({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openedAt] = useState(() => Date.now());
  const [card, setCard] = useState<Promise<Blob> | null>(null);
  const [saved, setSaved] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/ghost-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: form.get("message"),
          contact: form.get("contact"),
          website: form.get("website"),
          openedAt,
        }),
      });
      if (!res.ok) throw new Error(ERRORS[res.status] ?? "The ghost dropped it. Try again.");
      setStatus("sent");
      track("ghost_message_sent");
      // Draw the card now, so sharing it later happens straight from the tap (Safari requires that)
      const drawing = drawInsultCard();
      drawing.catch(() => {});
      setCard(drawing);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The ghost dropped it. Try again.");
      setStatus("error");
    }
  }

  async function saveCard() {
    if (!card) return;
    try {
      const result = await shareInsultCard(await card);
      if (result !== "cancelled") {
        setSaved(true);
        track("ghost_card_saved", { how: result });
      }
    } catch {
      // Drawing failed (very old browser); the button just does nothing
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="false"
      aria-labelledby="ghost-question"
      initial={{ opacity: 0, scale: 0.6, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      style={{ transformOrigin: "50% 100%" }}
      data-ui
      className="absolute inset-x-0 mx-auto top-[calc(var(--nav-top)+4.25rem)] z-20 w-[min(23rem,calc(100vw-2rem))] md:top-32"
    >
      <div className="relative rounded-[1.75rem] border-[3px] border-foreground bg-background px-5 pb-5 pt-4 shadow-[6px_6px_0_var(--color-foreground)]">
        {status === "sent" ? (
          <div className="flex flex-col gap-4" role="status">
            <p id="ghost-question" className="pt-2 text-center font-drip text-3xl uppercase leading-tight">
              {GHOST_SENT}
            </p>
            <button
              type="button"
              onClick={saveCard}
              disabled={!card}
              className="h-11 rounded-full border-2 border-foreground font-mono text-xs uppercase tracking-[0.2em] transition-shadow hover:shadow-[4px_4px_0_var(--color-neon-pink)] disabled:opacity-40"
            >
              {saved ? "Saved. Go post it." : "Save the card. Post it."}
            </button>
            <div className="border-t-2 border-dashed border-foreground/20 pt-3">
              <EarlyAccessForm from="bubble" compact />
            </div>
            <button
              type="button"
              onClick={onDone}
              className="h-9 self-center px-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60 underline-offset-4 hover:underline"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h2 id="ghost-question" className="font-drip text-[1.75rem] uppercase leading-[1.05] md:text-3xl">
              {GHOST_QUESTION}
            </h2>
            <label className="sr-only" htmlFor="ghost-message">
              Your message for Aes
            </label>
            <textarea
              ref={textRef}
              id="ghost-message"
              name="message"
              required
              rows={3}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={GHOST_PROMPT}
              className="resize-none rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-base outline-none focus:bg-background focus:shadow-[0_0_0_3px_var(--color-neon-green)]"
            />
            <label className="sr-only" htmlFor="ghost-contact">
              Your email or handle, optional
            </label>
            <input
              id="ghost-contact"
              name="contact"
              maxLength={MAX_CONTACT}
              autoComplete="email"
              placeholder="Email or @handle (optional)"
              className="rounded-xl border-2 border-foreground/30 px-3 py-2 text-base outline-none focus:border-foreground"
            />
            {/* Spam trap: hidden from people, filled in by bots */}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            {status === "error" && (
              <p role="alert" className="text-sm font-medium">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onDone}
                className="h-11 px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60 underline-offset-4 hover:underline"
              >
                Never mind
              </button>
              <button
                type="submit"
                disabled={status === "sending" || !message.trim()}
                className="h-11 rounded-full bg-foreground px-6 font-mono text-xs uppercase tracking-[0.2em] text-background transition-shadow hover:shadow-[4px_4px_0_var(--color-neon-green)] disabled:opacity-40"
              >
                {status === "sending" ? "Sending…" : "Send it"}
              </button>
            </div>
          </form>
        )}
        {/* The tail, pointing down at the ghost */}
        <span
          aria-hidden
          className="absolute -bottom-[13px] left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-foreground bg-background"
        />
      </div>
    </motion.div>
  );
}
