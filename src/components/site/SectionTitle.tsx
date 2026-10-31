import type { ReactNode } from "react";

/**
 * The second level of headings, under the big page title (Round 5a polish, 2026-10-31).
 * Every section on every page uses this one size with a thick rule under it,
 * so "Upcoming", "Ghost sightings", and "Latest off the wall" all read as the same kind of thing.
 */
export const SECTION_TITLE = "border-b-2 border-line pb-3 font-drip text-4xl uppercase leading-none md:text-5xl";

export default function SectionTitle({
  id,
  as: Tag = "h2",
  children,
  className = "",
}: {
  id?: string;
  as?: "h2" | "h3";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag id={id} data-reveal className={`${SECTION_TITLE} ${className}`}>
      {children}
    </Tag>
  );
}
