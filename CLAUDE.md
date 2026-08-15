@AGENTS.md

# Seahive Freight

Read `BRIEF.md` before changing anything visual. It is the design direction for
this site and it wins over instinct — most of what looks like an obvious
improvement here is the thing the brief explicitly rules out.

**The palette in `BRIEF.md` section 3 is superseded.** The client rejected the
dark blue-green scheme as cheap and asked for premium and lighter. The live
system is cold luxury: a neutral near-white ground, graphite ink and a single
deep marine accent. Everything else in the brief still stands.

The rules that get broken most often by accident:

- **One accent, and it is Marine.** No second accent colour anywhere — no
  amber, no aqua, no status greens or reds. Live state is signalled by scale,
  motion and the pulse dot, never by a second hue. Two saturated accents at
  once is precisely what made the first attempt look cheap.
- **Text tones are true neutrals.** `ink` and `graphite` carry no chroma. Tinted
  body copy is the single clearest tell of a cheap-looking page; if you find
  yourself reaching for a tinted grey, use `graphite`.
- **The mark keeps its own gradient.** Amber into teal into deep sea belongs to
  the logo and to the preloader draw-in only. The moment the waves leave the
  hexagon they collapse to Marine.
- **One ripple system.** A single `<RippleSystem />` in the root layout, driven
  by one master ScrollTrigger. Sections register an amplitude through
  `useRipple`; they never create their own ripple or their own master trigger.
  `lib/wave.test.ts` asserts this against the source.
- **Reveal targets start visible.** Motion hides them only after confirming it
  is allowed to run, so a failed bundle or a reduced-motion setting leaves a
  complete page. Never author an element as hidden-by-default in CSS.
- **No scroll-pinning on touch**, and no second animation runtime. GSAP and
  Lenis only.
- **Never invent a registration number, a rate, or a transit time** and present
  it as verified. See "What is still placeholder" below.

Every string lives in `content/`. Nothing user-visible is written inline in a
component.

## What is still placeholder

Nothing on this page is presented as verified when it is not, but these need
real data before they can be treated as true:

- **Transit times — `content/lanes.ts`.** Port and airport codes are real
  UN/LOCODE and IATA. The day counts are market-typical indications, labelled
  `INDICATIVE` everywhere they appear. Replace them with carrier schedules.
- **Copy — `content/*.ts`.** The client's own marketing text. It makes claims
  that have to be true: "strong carrier relationships", "dedicated customs
  teams", "our facilities", and the compliance statement in `EXCELLENCE`, which
  asserts full accordance with international trade regulations.
- **No registration numbers anywhere.** There is no CIN, IEC, GSTIN or DGR
  certificate number on the page. Those resolve against the MCA and DGFT public
  registers in about a minute, and for a company incorporated this year they
  are the cheapest proof of existence available — worth adding, once real.
- **Contact details.** No phone or postal address on the page.
- **The backdrop clips are generated.** `BRIEF.md` rules out generated freight
  equipment by name, because the details come out wrong to an audience that
  reads them for a living. Distance is the mitigation, not a fix. Real footage
  of Seahive's own cargo is the highest-value swap available.

## Deploying

Pushing to `production` on `JatinNirwann/seahive` builds and publishes to
seahivefreight.com. Two things break it silently:

- **`NEXT_PUBLIC_BASE_PATH` must stay unset.** The apex domain serves from the
  root. Set a base path and every asset is requested from `/<repo>/…`, which
  does not exist — and the workflow still goes green over a blank page.
- **Pages Source must be "GitHub Actions"**, not "Deploy from a branch". In
  branch mode Pages ignores the built artifact, serves the raw repo, and drops
  the custom domain because it looks for `CNAME` at the repo root rather than
  in `public/`. This has taken the site down once.

The two Supabase values are repo variables, not code. Without them the site
still deploys and the form silently falls back to printing requests instead of
sending them.

Backdrop clips are made to loop by `scripts/loop-videos.mjs --pingpong`. That
script is **not idempotent** — pass clip names when re-running it, or it
processes already-processed footage. Swapping a clip usually means retuning
that clip's `wash` in `content/backdrops.ts`; `npm run verify:backdrop`
measures whether text still clears AA over it.

## Commands

```bash
npm run dev       # dev server
npm run build     # static export to out/
npm test          # wave geometry, motion architecture, rate-request rules
npm run verify    # drives real Chromium: contrast, LCP, JS weight, a11y
npm run verify:form   # the rate request form: payload, every response path
```

The Chromium suites need the export served first:
`python3 -m http.server 4321 --directory out`.

The rate request form posts to a Supabase Edge Function — there is no server
here. Its rules live in `supabase/functions/rate-request/schema.ts` and are
imported by **both** the browser and the function, so the two can never
disagree about what is valid. Never redefine them on one side. See "How the
form actually sends" below.
