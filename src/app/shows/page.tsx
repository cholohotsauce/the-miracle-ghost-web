import type { Metadata } from "next";
import PageTitle from "@/components/site/PageTitle";
import SightingsMap from "@/components/shows/SightingsMap";
import { shows, sightings, type Show } from "@/content/shows";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shows",
  description: "Shows, pop-ups, and ghost sightings from The Miracle Ghost (Aes), Miami and beyond.",
  alternates: { canonical: "/shows" },
};

// Rebuild once an hour so a show moves from "coming up" to "past" on its own
export const revalidate = 3600;

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// Laid out like Aes's list (2026-10-22): bold label, then title, gallery, city, and date as plain
// stacked lines, with thin rules only between the two sections
function ShowRow({ show }: { show: Show }) {
  return (
    <li className="flex flex-col gap-3 py-2 text-xl md:gap-4 md:text-2xl">
      <h3 className="font-bold uppercase leading-tight">
        {show.title}
        {show.sample && (
          <span className="ml-2 inline-block -translate-y-0.5 border border-foreground/40 px-1.5 py-0.5 align-middle font-mono text-[9px] font-normal tracking-[0.25em] text-foreground/60">
            SAMPLE
          </span>
        )}
      </h3>
      <p>{show.venue}</p>
      <p>{show.city}</p>
      <p>
        {fmt(show.start)}
        {show.end && <> to {fmt(show.end)}</>}
      </p>
      {show.note && <p className="text-sm text-foreground/60">{show.note}</p>}
      {show.link && (
        <a
          href={show.link}
          target="_blank"
          rel="noreferrer"
          className="inline-block w-fit rounded-full bg-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-background"
        >
          Details
        </a>
      )}
    </li>
  );
}

function ListLabel({ children }: { children: string }) {
  return <h3 className="mb-7 text-xl font-bold uppercase md:mb-8 md:text-2xl">{children}</h3>;
}

export default function ShowsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shows.filter((s) => (s.end ?? s.start) >= today).sort((a, b) => a.start.localeCompare(b.start));
  const past = shows.filter((s) => (s.end ?? s.start) < today).sort((a, b) => b.start.localeCompare(a.start));

  const eventsLd = upcoming.filter((s) => !s.sample).map((s) => ({
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    name: s.title,
    startDate: s.start,
    endDate: s.end ?? s.start,
    location: { "@type": "Place", name: s.venue, address: s.city },
    performer: { "@type": "Person", name: "The Miracle Ghost", alternateName: "Aes" },
    url: s.link,
  }));

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      {eventsLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(eventsLd)} />
      )}
      <PageTitle>Shows</PageTitle>

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="timeline" className="lg:pt-6">
          <h2 id="timeline" className="sr-only">
            Timeline
          </h2>
          <div className="pb-10 md:pb-12">
            <ListLabel>Upcoming</ListLabel>
            {upcoming.length ? (
              <ul className="flex flex-col gap-12">
                {upcoming.map((s) => (
                  <ShowRow key={s.title + s.start} show={s} />
                ))}
              </ul>
            ) : (
              <p className="text-xl font-bold uppercase md:text-2xl">To be announced</p>
            )}
          </div>
          {past.length > 0 && (
            <div className="border-t border-foreground/10 py-10 md:py-12">
              {/* Only the most recent one, as Aes's "Last Exhibition" heading says */}
              <ListLabel>Last exhibition</ListLabel>
              <ul>
                <ShowRow show={past[0]} />
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="sightings" className="lg:pt-6">
          <h2 id="sightings" className="font-drip text-5xl uppercase leading-none md:text-6xl">
            Ghost sightings
          </h2>
          <p className="mb-5 mt-3 text-base md:text-lg">Select a ghost and reveal the city</p>
          <SightingsMap sightings={sightings} />
          {/* Fans who find a sticker or a wall add to the map */}
          <p className="mt-5 text-base md:text-lg">
            Spotted a ghost out there? Snap it and tag{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="font-drip uppercase underline decoration-[var(--color-neon-green)] decoration-4 underline-offset-4">
              @{INSTAGRAM_HANDLE}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
