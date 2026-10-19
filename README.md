# The Miracle Ghost

The website of The Miracle Ghost (Aes), a street artist from Miami: an interactive ghost on a white wall, a shop, shows, and contact.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, and react-three-fiber. Cart and checkout use the Shopify Buy Button.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

## Where things live

| What | Where |
| --- | --- |
| The ghost on Home (tricks, idle moods, speech bubble, paint mode) | `src/components/GhostLanding.tsx`, `src/components/ghost/` |
| Trick list and order | `src/components/ghost/tricks.ts` |
| Ghost faces, and which face goes with which trick | `src/components/ghost/faces.ts`, `TRICK_FACE` in `src/components/ghost/tricks.ts` |
| Clay or silver finish (try silver with `?finish=silver`) | `DEFAULT_FINISH` in `src/components/ghost/MiracleGhost.tsx` |
| How many tiny ghosts the clone trick splits into | `MINI_COUNT` in `src/components/ghost/tricks.ts` (the tiny ghost model comes from `scripts/bake-mini-ghost.mjs`) |
| Idle moods (bored, yawn, asleep) | `src/lib/useIdleMood.ts` |
| Mini ghost on every other page | `src/components/site/MiniGhost.tsx` |
| Spray-paint page changes | `src/components/site/PageTransition.tsx`, `TransitionLink.tsx` |
| "Come back" browser tab | `src/components/site/TabHaunt.tsx` |
| Paint-the-wall easter egg (spray can in the corner on Home, or double-tap the wall) | `src/components/PaintWall.tsx` |
| "Told me off" share card | `src/lib/shareCard.ts` |
| Shop grid and product pages | `src/app/shop/`, `src/components/shop/`, `src/lib/shopify.ts` |
| Drop dates, editions, next-drop teaser | `src/content/drops.ts` |
| Shows and ghost sightings | `src/content/shows.ts`, world map in `src/components/shows/SightingsMap.tsx` |
| Contact topics | `src/content/contact.ts` |
| Search engines and share previews | `src/lib/site.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.png` |
| Visitor stats | `src/lib/stats.ts` |

## Content to swap in

Entries marked `sample: true` show a SAMPLE tag on the site until they are replaced:

- `src/content/drops.ts`: the next drop's date and text, plus edition sizes and unlock times per product.
- `src/content/shows.ts`: real shows and sightings. Sightings are pinned by city (latitude and longitude of the city center), never by address.
- Products, prices, photos, and stock come from Shopify automatically.

## Settings in Vercel

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | What it does |
| --- | --- |
| `RESEND_API_KEY` | Sends the ghost's messages, Contact messages, and sign-ups by email (resend.com). |
| `GHOST_MESSAGE_TO` | The inbox that receives them. |
| `GHOST_MESSAGE_FROM` | The sender, on a domain verified in Resend, e.g. `The Miracle Ghost <ghost@themiracleghost.com>`. |
| `CONTACT_TO` | Optional: a different inbox for the Contact form. |
| `SHOPIFY_ADMIN_TOKEN` | Optional: adds early access sign-ups to Shopify as email subscribers (custom app with `read_customers` and `write_customers`). Without it, each sign-up is emailed instead. |
| `NEXT_PUBLIC_SITE_URL` | The public address, e.g. `https://themiracleghost.com`, once the domain points to Vercel. |

Stats: turn on Web Analytics in Vercel → Project → Analytics. Named events (tricks, tenth click, add to cart, sign-ups) need a Vercel plan that includes custom events.

## Regenerating the ghost files

After Aes sends a new model:
1. `node --max-old-space-size=8192 scripts/bake-ghost-model.mjs "<path to .glb>"` rebuilds the 3D model and the Grim face map from the 3D artist's GLB (face painted into its texture). Then run `node scripts/bake-mini-ghost.mjs` to rebuild the clone trick's tiny ghost from it.
2. `npm run build && npx next start -p 3123`, then `node scripts/render-ghost-poster.mjs http://localhost:3123` rebuilds the still poster and the link preview image. It needs Playwright (`npm i -D playwright`).

`node scripts/make-icons.mjs` rebuilds the browser icons and the map pin from Aes's drawings in `scripts/art/`.

## Regenerating the world map

The Ghost Sighting map is baked into `src/content/worldMap.ts`. To rebuild it (for example with more detail), run `node scripts/bake-world-map.mjs`.
