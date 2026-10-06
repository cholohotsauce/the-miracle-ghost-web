import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Commissions, collabs, and press for The Miracle Ghost (Aes), Miami.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-28 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <header>
          <h1 className="font-drip text-6xl uppercase leading-[0.9] md:text-8xl">Talk to the ghost</h1>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-foreground/75">
            Want a wall, a canvas, or a collab? Tell the ghost what you&apos;re after. He passes it to Aes.
          </p>
          <p className="mt-4 max-w-sm font-mono text-xs uppercase leading-relaxed tracking-[0.2em] text-foreground/50">
            Just want to yell at him? Go back home and poke him ten times.
          </p>
        </header>
        <ContactForm />
      </div>
    </main>
  );
}
