import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Commissions, collaborations, and press inquiries for The Miracle Ghost (Aes), Miami.",
  alternates: { canonical: "/contact" },
};

/**
 * Aes's Contact page (redesign 2026-10-22): one column with the title, the inquiry form,
 * and the Instagram handle on its own strip at the bottom so it never runs into the form.
 */
export default function ContactPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-28 md:pt-36 px-4 md:px-6 pb-page">
      <div className="mx-auto max-w-[58rem]">
        <header>
          <h1 className="font-drip text-[clamp(4rem,17vw,9.5rem)] uppercase leading-[0.85] tracking-[-0.02em]">Contact</h1>
          <p className="mt-5 max-w-[34rem] text-[clamp(1.1rem,2.4vw,1.4rem)] leading-snug">
            Commissions, collabs, press, or anything else. Pick a topic and tell the ghost.
          </p>
        </header>

        <ContactForm />

        <footer className="mt-20 flex flex-wrap items-end justify-between gap-4 border-t-2 border-foreground pt-7">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-foreground/60">Or DM the ghost</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative mt-2 inline-block max-w-full font-drip text-[clamp(1.5rem,6.2vw,3.2rem)] uppercase leading-none [overflow-wrap:anywhere]"
            >
              @{INSTAGRAM_HANDLE}
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 right-0 h-1.5 origin-left bg-[var(--color-neon-green)] transition-transform duration-300 group-hover:scale-x-105"
              />
            </a>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open @${INSTAGRAM_HANDLE} on Instagram`}
            className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-foreground text-2xl transition-colors hover:bg-foreground hover:text-background"
          >
            ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
