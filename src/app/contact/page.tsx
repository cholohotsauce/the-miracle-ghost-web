import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

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
        </header>
        <ContactForm />
      </div>
    </main>
  );
}
