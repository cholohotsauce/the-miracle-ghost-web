"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const links = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/shop", label: "Shop / Drops", short: "Shop" },
  { href: "/archive", label: "Archive / Gallery", short: "Archive" },
  { href: "/exhibitions", label: "Exhibitions", short: "Shows" },
  { href: "/contact", label: "Contact", short: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar: brand on all sizes, full link list on desktop */}
      <header className="fixed top-0 left-0 w-full z-50 px-5 py-4 md:p-6 pt-[max(1rem,env(safe-area-inset-top))] bg-background/80 backdrop-blur-md">
        <nav className="flex items-center justify-between" aria-label="Main">
          <div className="font-black text-base md:text-xl uppercase tracking-widest text-foreground">
            <Link href="/">The Miracle Ghost</Link>
          </div>
          <ul className="hidden md:flex space-x-8 text-sm uppercase tracking-widest font-mono text-foreground">
            {links.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`pb-1 border-b-2 transition-colors duration-300 ${
                      active
                        ? "border-[var(--color-neon-green)]"
                        : "border-transparent hover:border-[var(--color-neon-pink)]"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Bottom bar: thumb-reach navigation on phones */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background border-t-2 border-line pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-[var(--mobile-nav-h)]">
          {links.map(({ href, short }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="h-full">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground active:bg-muted"
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                      active ? "bg-[var(--color-neon-green)] shadow-[0_0_8px_var(--color-neon-green)] ring-1 ring-foreground" : "bg-transparent ring-1 ring-foreground/30"
                    }`}
                  />
                  <span className={active ? "font-bold" : "opacity-70"}>{short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
