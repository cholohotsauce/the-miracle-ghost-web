import type { Metadata } from "next";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import PageTitle from "@/components/site/PageTitle";
import SectionTitle from "@/components/site/SectionTitle";
import SightingsMap from "@/components/shows/SightingsMap";
import { shows, sightings, type Show } from "@/content/shows";
import { jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shows",
  description: "Shows, pop-ups, and ghost sightings from The Miracle Ghost (Aes), Miami and beyond.",
  alternates: { canonical: "/shows" },
};

// Rebuild once an hour so a show moves from "coming up" to "past" on its own
export const revalidate = 3600;

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

// Laid out like Aes's drawing (2026-10-30): the date on the left, then the title in big letters
// with the gallery and city in small capitals under it, and a rule under every show
function ShowRow({ show }: { show: Show }) {
  return (
    <li data-reveal="item" className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b-2 border-line py-6 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-x-6 md:py-8">
      <p className="text-xs font-bold uppercase md:text-sm">
        {fmt(show.start)}
        {show.end && <> to {fmt(show.end)}</>}
      </p>
      <div>
        <h3 className="text-3xl font-bold uppercase leading-tight md:text-4xl">
          {show.title}
          {show.sample && (
            <span className="ml-2 inline-block -translate-y-1 border border-foreground/40 px-1.5 py-0.5 align-middle font-mono text-xs font-normal tracking-[0.2em] text-foreground/60">
              SAMPLE
            </span>
          )}
        </h3>
        <p className="mt-2 text-xs font-bold uppercase leading-snug md:text-sm">
          {show.venue}
          <br />
          {show.city}
        </p>
        {show.note && <p className="mt-2 text-sm text-foreground/60">{show.note}</p>}
        {show.link && (
          <a
            href={show.link}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block w-fit rounded-full bg-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-background"
          >
            Details
          </a>
        )}
      </div>
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
    <main className="mx-auto w-full max-w-[90rem] min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      {eventsLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(eventsLd)} />
      )}
      <PageTitle>Shows</PageTitle>

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <section aria-labelledby="timeline">
          <h2 id="timeline" className="sr-only">
            Timeline
          </h2>
          <SectionTitle as="h3">Upcoming</SectionTitle>
          {upcoming.length ? (
            <ul>
              {upcoming.map((s) => (
                <ShowRow key={s.title + s.start} show={s} />
              ))}
            </ul>
          ) : (
            // No show booked: a short line and a sign-up, so the empty list still does something (Round 4)
            <div data-reveal className="flex flex-col gap-5 border-b-2 border-line py-7 md:py-9">
              <p className="text-xl font-bold uppercase leading-tight md:text-2xl">
                <span className="sr-only">To be announced</span>
                <span aria-hidden className="soon-glitch glitch-slow" data-text="To be announced">
                  To be announced
                </span>
              </p>
              <div className="w-full max-w-md">
                <EarlyAccessForm from="shows-upcoming" prompt="Get told first" cta="Haunt me" />
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="mt-10 md:mt-14">
              <SectionTitle as="h3">Past</SectionTitle>
              <ul>
                {past.map((s) => (
                  <ShowRow key={s.title + s.start} show={s} />
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* On wide screens the sightings sit centered in the right half (Archie, 2026-10-31) */}
        <section aria-labelledby="sightings" className="lg:w-full lg:max-w-[34rem] lg:justify-self-center">
          <SectionTitle id="sightings">Ghost sightings</SectionTitle>
          <p className="mb-4 mt-4 text-sm font-bold md:text-base">Select a ghost and reveal the city</p>
          <SightingsMap sightings={sightings} />
        </section>
      </div>
    </main>
  );
}
