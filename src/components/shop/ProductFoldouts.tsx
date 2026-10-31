import type { InfoSection } from "@/content/productInfo";

/**
 * Fold-out sections on a product page: tap a title to open it, tap again to close.
 * Plain <details> elements, so they work without scripts and with a keyboard.
 */
export default function ProductFoldouts({ sections }: { sections: InfoSection[] }) {
  return (
    <div className="border-t-2 border-line">
      {sections.map((s) => (
        <details key={s.title} className="foldout group border-b-2 border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold uppercase tracking-[0.1em] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              {s.title}
              {s.draft && (
                <span className="border border-foreground/40 px-1.5 py-0.5 font-mono text-xs tracking-[0.2em] text-foreground/60">
                  DRAFT
                </span>
              )}
            </span>
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-foreground text-base leading-none transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="foldout-body">
            <div className="space-y-2 pb-5 text-sm leading-relaxed text-foreground/80">
              {s.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
