"use client";

import { usePathname } from "next/navigation";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME } from "@/lib/site";
import EarlyAccessForm from "./EarlyAccessForm";
import TransitionLink from "./TransitionLink";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/shows", label: "Shows" },
  { href: "/contact", label: "Contact" },
];

/** Paths where the footer stays away: Home belongs to the lone ghost, and the teaser covers everything */
const BARE = ["/", "/soon"];

/**
 * The footer under every content page: drop alerts, Aes's Instagram, the menu again, and the small print.
 * The bottom left corner is the mini ghost's spot, so on wide screens the content starts to the right of him
 * and on phones the small print sits above where he peeks up.
 */
export default function SiteFooter() {
  const pathname = usePathname();
  if (BARE.includes(pathname)) return null;

  return (
    <footer className="w-full bg-background px-5 text-foreground md:px-6 lg:px-12">
      <div data-reveal className="mx-auto max-w-[84rem] border-t-2 border-line pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-8 md:pb-10 md:pl-40 md:pt-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12">
          <div className="w-full max-w-md">
            <EarlyAccessForm from="footer" prompt="Drop alerts. The ghost tells you first." cta="Haunt me" />
          </div>
          {/* Contact already ends with the big Instagram strip */}
          {pathname !== "/contact" && (
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-block w-fit font-drip text-[clamp(1.4rem,5.5vw,2.25rem)] uppercase leading-none [overflow-wrap:anywhere]"
            >
              @{INSTAGRAM_HANDLE} <span aria-hidden>↗</span>
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 right-0 h-1 origin-left scale-x-0 bg-[var(--color-neon-green)] transition-transform duration-300 group-hover:scale-x-100"
              />
            </a>
          )}
        </div>

        <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line/20 pt-5 text-xs uppercase tracking-[0.2em] md:mt-12 md:flex-row md:items-center md:justify-between">
          <p className="text-foreground/60">
            © {new Date().getFullYear()} {SITE_NAME} · Miami
          </p>
          <nav aria-label="Footer">
            <ul className="flex gap-6">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <TransitionLink href={href} curtain={label} className="underline-offset-4 hover:underline hover:decoration-[var(--color-neon-green)] hover:decoration-2">
                    {label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
