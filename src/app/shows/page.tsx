import type { Metadata } from "next";
import SightingsMap from "@/components/shows/SightingsMap";
import { shows, sightings, type Show } from "@/content/shows";
import { jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shows",
  description: "Shows, pop-ups, and ghost sightings around Miami from The Miracle Ghost (Aes).",
  alternates: { canonical: "/shows" },
};

// Rebuild once an hour so a show moves from "coming up" to "past" on its own
export const revalidate = 3600;

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function ShowRow({ show, upcoming }: { show: Show; upcoming: boolean }) {
  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-4 border-b-2 border-line py-5 md:grid-cols-[9rem_1fr_auto] md:items-center md:gap-8">
      <p className="font-mono text-xs uppercase leading-relaxed tracking-[0.15em]">
        {fmt(show.start)}
        {show.end && (
          <>
            <br />
            <span className="text-foreground/60">to {fmt(show.end)}</span>
          </>
        )}
      </p>
      <div>
        <h3 className={`font-drip uppercase leading-none ${upcoming ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl text-foreground/70"}`}>
          {show.title}
          {show.sample && (
            <span className="ml-2 inline-block -translate-y-1 border border-foreground/40 px-1.5 py-0.5 align-middle font-mono text-[9px] tracking-[0.25em] text-foreground/60">
              SAMPLE
            </span>
          )}
        </h3>
        <p className="mt-2 text-sm text-foreground/70">
          {show.venue} · {show.city}
        </p>
        {show.note && <p className="mt-1 text-sm text-foreground/50">{show.note}</p>}
      </div>
      {show.link && (
        <a
          href={show.link}
          target="_blank"
          rel="noreferrer"
          className="col-start-2 inline-block w-fit rounded-full bg-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-background md:col-start-auto"
        >
          {upcoming ? "Details" : "Recap"}
        </a>
      )}
    </li>
  );
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
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-24 md:pt-32 px-5 md:px-6 lg:px-12 pb-page">
      {eventsLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(eventsLd)} />
      )}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-line pb-4 md:mb-14">
        <h1 className="text-4xl font-black uppercase leading-none tracking-widest md:text-6xl">Shows</h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">Walls, rooms, pop-ups</p>
      </header>

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-labelledby="timeline">
          <h2 id="timeline" className="sr-only">
            Timeline
          </h2>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-foreground/60">Coming up</h3>
          {upcoming.length ? (
            <ul className="mb-12 border-t-2 border-line">
              {upcoming.map((s) => (
                <ShowRow key={s.title + s.start} show={s} upcoming />
              ))}
            </ul>
          ) : (
            <p className="mb-12 border-y-2 border-line py-6 font-drip text-2xl uppercase">Nothing booked. The ghost is plotting.</p>
          )}
          {past.length > 0 && (
            <>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-foreground/60">Past</h3>
              <ul className="border-t-2 border-line">
                {past.map((s) => (
                  <ShowRow key={s.title + s.start} show={s} upcoming={false} />
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="sightings">
          <h2 id="sightings" className="mb-2 font-drip text-4xl uppercase leading-none md:text-5xl">
            Ghost sightings
          </h2>
          <p className="mb-6 max-w-prose text-sm text-foreground/70">
            Where the ghost has been spotted around Miami. Tap a ghost to see the piece.
          </p>
          <SightingsMap sightings={sightings} />
        </section>
      </div>
    </main>
  );
}
