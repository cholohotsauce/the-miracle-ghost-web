import type { ReactNode } from "react";

/** One title size for every content page */
const SIZE = "text-[clamp(3.75rem,16vw,8rem)]";

/**
 * The big title at the top of a content page, with the rule under it (Aes's mockups, 2026-10-15).
 * Shows, Shop, and Contact all use it, at one size (Aes, 2026-10-30).
 * `bleed` is the Shop's look: heavy block letters. Aes took the red drips off them on 2026-10-20.
 * As the page appears, the title rises from behind the rule, then the rule draws left to right (globals.css).
 */
export default function PageTitle({
  children,
  bleed = false,
  aside,
}: {
  children: ReactNode;
  bleed?: boolean;
  /** Small text on the right end of the rule */
  aside?: ReactNode;
}) {
  return (
    <header data-reveal="title" className="relative mb-8 flex flex-wrap items-end justify-between gap-4 pb-3.5 md:mb-10">
      {bleed ? (
        <h1 className={`inline-block ${SIZE} font-black uppercase leading-[0.85] tracking-[0.08em]`}>
          <span className="reveal-title-text">{children}</span>
        </h1>
      ) : (
        <h1 className={`font-drip ${SIZE} uppercase leading-[0.85]`}>
          <span className="reveal-title-text">{children}</span>
        </h1>
      )}
      {aside && <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">{aside}</p>}
      <span aria-hidden className="reveal-rule absolute inset-x-0 bottom-0 h-0.5 origin-left bg-line" />
    </header>
  );
}
