import Link from "next/link";
import React from "react";

export default function NavBar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 p-6 mix-blend-difference">
      <nav className="flex items-center justify-between">
        <div className="font-bold text-xl uppercase tracking-widest text-foreground">
          <Link href="/">The Miracle Ghost</Link>
        </div>
        <ul className="flex space-x-8 text-sm uppercase tracking-widest font-mono text-foreground">
          <li>
            <Link href="/" className="hover:text-[var(--color-neon-green)] transition-colors duration-300">
              Home
            </Link>
          </li>
          <li>
            <Link href="/shop" className="hover:text-[var(--color-neon-green)] transition-colors duration-300">
              Shop / Drops
            </Link>
          </li>
          <li>
            <Link href="/archive" className="hover:text-[var(--color-neon-green)] transition-colors duration-300">
              Archive / Gallery
            </Link>
          </li>
          <li>
            <Link href="/exhibitions" className="hover:text-[var(--color-neon-green)] transition-colors duration-300">
              Exhibitions
            </Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-[var(--color-neon-green)] transition-colors duration-300">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
