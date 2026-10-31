"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEntered } from "@/lib/entry";
import TransitionLink from "./site/TransitionLink";

// Aes's menu, in his order. The archive page still exists; it just isn't in his menu.
const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shows", label: "Shows" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();
  const entered = useEntered();
  // On the home page the menu waits until the ghost is clicked
  const shown = pathname !== "/" || entered;
  const [tucked, setTucked] = useTuckOnScroll(pathname);

  return (
    <motion.header
      initial={false}
      animate={!shown ? { opacity: 0, y: -24 } : tucked ? { opacity: 1, y: "-110%" } : { opacity: 1, y: 0 }}
      transition={{ duration: tucked ? 0.45 : 0.6, ease: [0.22, 1, 0.36, 1], delay: shown && !tucked && pathname === "/" ? 0.35 : 0 }}
      inert={!shown}
      // Tabbing into the menu brings it back into view
      onFocusCapture={() => setTucked(false)}
      className="fixed top-0 left-0 z-50 w-full bg-background/85 px-4 pt-[var(--nav-top)] backdrop-blur-md md:px-8"
    >
      <nav aria-label="Main" className="border-b-2 border-line">
        <ul className="flex items-start justify-between pb-2 md:justify-around md:pb-3">
          {links.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <TransitionLink
                  href={href}
                  curtain={label}
                  aria-current={active ? "page" : undefined}
                  className="group relative block px-1 py-1 font-drip text-[clamp(1.35rem,5.6vw,2.6rem)] uppercase leading-none text-foreground"
                >
                  <span className="inline-block transition-transform duration-300 group-hover:translate-y-0.5 group-active:translate-y-1">
                    {label}
                  </span>
                  <span
                    aria-hidden
                    // A fresh key on each page, so the arrival glow plays again
                    key={active ? pathname : "off"}
                    className={`absolute -bottom-1 left-1 right-1 h-1 bg-[var(--color-neon-green)] transition-transform duration-300 origin-left ${
                      active ? "nav-glow scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </TransitionLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.header>
  );
}

/**
 * The menu slides up out of the way while you scroll down to read, and comes back
 * as soon as you scroll up a little, or reach the top again.
 */
function useTuckOnScroll(pathname: string) {
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let down = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      last = y;
      if (y < 120) {
        down = 0;
        setTucked(false);
      } else if (dy > 0) {
        down += dy;
        if (down > 24) setTucked(true);
      } else if (dy < -4 && y < document.documentElement.scrollHeight - window.innerHeight - 2) {
        // (At the very bottom, a page that gets a little shorter nudges the scroll up; that is not the reader)
        down = 0;
        setTucked(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A new page always starts with the menu in view
  const [page, setPage] = useState(pathname);
  if (page !== pathname) {
    setPage(pathname);
    setTucked(false);
  }

  return [tucked, setTucked] as const;
}
