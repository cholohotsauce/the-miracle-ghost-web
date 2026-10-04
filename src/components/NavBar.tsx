"use client";

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

  return (
    <motion.header
      initial={false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: shown && pathname === "/" ? 0.35 : 0 }}
      inert={!shown}
      className="fixed top-0 left-0 z-50 w-full bg-background/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md md:px-8"
    >
      <nav aria-label="Main" className="border-b border-line/80">
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
                    className={`absolute -bottom-1 left-1 right-1 h-1 bg-[var(--color-neon-green)] transition-transform duration-300 origin-left ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
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
