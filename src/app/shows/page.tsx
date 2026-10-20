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
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function ShowRow({ show, upcoming }: { show: Show; upcoming: boolean }) {
  return (
    <li className="grid gap-3 border-b-2 border-line py-7 md:grid-cols-[11rem_1fr_auto] md:items-center md:gap-8 md:py-10">
      <p className="font-mono text-xs uppercase leading-loose tracking-[0.18em] md:text-sm">
        {fmt(show.start)}
        {show.end && (
          <>
            <br />
            to {fmt(show.end)}
          </>
        )}
      </p>
      <div>
        <h3 className={`font-black uppercase leading-none tracking-tight ${upcoming ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
          {show.title}
          {show.sample && (
            <span className="ml-2 inline-block -translate-y-1 border border-foreground/40 px-1.5 py-0.5 align-middle font-mono text-[9px] font-normal tracking-[0.25em] text-foreground/60">
              SAMPLE
            </span>
          )}
        </h3>
        <p className="mt-3 text-base md:text-lg">
          {show.venue} · {show.city}
        </p>
        {show.note && <p className="mt-1 text-sm text-foreground/60">{show.note}</p>}
      </div>
      {show.link && (
        <a
          href={show.link}
          target="_blank"
          rel="noreferrer"
          className="inline-block w-fit rounded-full bg-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-background md:col-start-auto"
        >
          {upcoming ? "Details" : "Recap"}
        </a>
      )}
    </li>
  );
}

function ListLabel({ children }: { children: string }) {
  return (
    <h3 className="border-b-2 border-line pb-2 font-mono text-xs uppercase tracking-[0.3em] md:text-sm">{children}</h3>
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
          <ListLabel>Upcoming</ListLabel>
          {upcoming.length ? (
            <ul className="mb-14">
              {upcoming.map((s) => (
                <ShowRow key={s.title + s.start} show={s} upcoming />
              ))}
            </ul>
          ) : (
            <p className="mb-14 border-b-2 border-line py-8 font-drip text-2xl uppercase">Nothing booked. The ghost is plotting.</p>
          )}
          {past.length > 0 && (
            <>
              <ListLabel>Past exhibitions</ListLabel>
              <ul>
                {past.map((s) => (
                  <ShowRow key={s.title + s.start} show={s} upcoming={false} />
                ))}
              </ul>
            </>
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
