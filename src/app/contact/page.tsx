import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Commissions, collaborations, and press inquiries for The Miracle Ghost (Aes), Miami.",
  alternates: { canonical: "/contact" },
};

/** Aes's Contact page (mockup 2026-10-15): title on the left, the inquiry form on the right */
export default function ContactPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-40 px-5 md:px-6 lg:px-12 pb-page">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <header className="lg:pt-16">
          <h1 className="font-drip uppercase leading-[0.85]">
            <span className="block whitespace-nowrap text-[17vw] md:text-[9rem] lg:text-[min(7.2vw,8.5rem)]">Contact</span>
            <span className="mt-1 block whitespace-nowrap text-[9.6vw] md:text-[5.1rem] lg:text-[min(4.1vw,4.8rem)]">&amp; Inquiries</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed md:text-xl">
            For commissions, collaborations, and press inquiries, please get in touch using the form.
          </p>
          <p className="mt-10">
            <span className="block font-mono text-xs uppercase tracking-[0.3em] text-foreground/60 md:text-sm">Or DM the ghost</span>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative mt-2 inline-block font-drip text-[clamp(2rem,9vw,3.75rem)] uppercase leading-none lg:text-[min(3.5vw,3.75rem)]"
            >
              @{INSTAGRAM_HANDLE}
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 right-0 h-1.5 origin-left scale-x-100 bg-[var(--color-neon-green)] transition-transform duration-300 group-hover:scale-x-110"
              />
            </a>
          </p>
        </header>
        <ContactForm />
      </div>
    </main>
  );
}
