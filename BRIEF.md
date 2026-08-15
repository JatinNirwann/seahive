# Seahive Freight — website build brief

The design direction for this site, kept in the repo so later sessions stay on
direction. Referenced from `CLAUDE.md`. Where this brief and instinct disagree,
this brief wins.

Deviations from it that were made deliberately are recorded at the end of
`CLAUDE.md`, with the reason for each.

## 0. Read this first

You are the design lead on this build, not just the implementer. Before writing
code, produce a short design plan (tokens, type scale, layout concept,
signature element), check it against this brief, then build. If any part of
your plan is something you would have produced for any generic logistics site,
change it.

Do not copy the visual language of large forwarder websites — the stock
container photo, the blue gradient, the world map with glowing arcs. Those are
the defaults. The direction below is derived from Seahive's own mark and should
not be mistakable for another forwarder.

## 1. Subject

Seahive Freight Private Limited — a newly incorporated Indian freight forwarder
(Delhi NCR). Sister company to Aerocean Freight. Ocean and air freight,
customs, project and out-of-gauge cargo. Small, technical, accountable team.

**Audience.** Indian exporters and importers — factory owners, merchant
exporters, procurement and logistics managers. They are not impressed by
adjectives. They want to know: can you handle my lane, do you answer the phone,
will my documents be right, what does it cost. Many will read this on a
mid-range Android phone on a 4G connection.

**The page's single job.** Convince a shipper that this small team will not
lose their cargo or their paperwork, and get them to send a rate request.

**Tone.** Precise, unhurried, technically literate. Never breathless. The site
should feel like it was built by people who actually file Shipping Bills.

## 2. The signature element — the ripple system

This is the one thing the site is remembered by. Spend the boldness here and
keep everything else quiet.

The Seahive mark is seven stacked sine waves whose horizontal extents narrow
toward the top and bottom, forming a hexagonal silhouette. Sea, plus hive cell.
That geometry is the entire motion system for the site, and it costs nothing
but SVG and code — no photography, no 3D, no rendered assets.

**The journey.** One continuous SVG element travels the whole page:

1. **Load** — the seven waves draw in from centre outward, staggered
   top-to-bottom, ~1.1s total. This is the preloader. No spinner, no percentage
   counter.
2. **Hero** — the hexagon unspools. The seven waves stretch horizontally and
   flatten into a single set of parallel lines that run off both edges of the
   viewport. Sea becomes route.
3. **Scroll** — wave phase advances with scroll position. The lines travel.
   Amplitude increases slightly in ocean-freight sections and flattens toward
   zero in customs and compliance sections, where the content is about
   precision rather than movement.
4. **Section dividers** — instead of a horizontal rule, a single wave at low
   amplitude. The wave that divides two sections is one of the seven, and it
   carries the section's index.
5. **Footer** — the lines converge and re-form the hexagon. The mark closes.

**Rules for it.** Never more than one ripple system on screen. It sits behind
content at low opacity (0.12–0.2 on Ink), never competing with type. It is
scroll-scrubbed, not autoplaying — motion is tied to the reader's own scroll,
which is what makes a page feel alive rather than busy.

**Secondary use of the same geometry.** The hexagon tessellates. Use a hex cell
as the container for service cards (air, ocean, customs, project cargo,
warehousing) — a real honeycomb grid, not rounded rectangles with icons. Cells
share edges. This is structural, not decorative: the hive is the network.

## 3. Tokens

### Colour

```
--ink:       #0A1B2E   /* ground. the site is dark. */
--deep-sea:  #0E5C7A   /* depth layer, wave mid-tones, hover states */
--aqua:      #19C6AE   /* primary accent, links, active wave */
--salt:      #D2F4EF   /* body text on ink */
--amber:     #FFB547   /* RESERVED — see below */
--paper:     #F7FAFA   /* the one light section */
```

**Amber discipline.** Amber appears in exactly one role across the entire site:
live/active state. A shipment in transit, an open enquiry, the primary CTA.
Nothing else is ever amber. It should appear perhaps five times on the whole
page. This restraint is what makes it read as a signal rather than a brand
colour.

Site is predominantly Ink. One section — the credentials/compliance block —
inverts to Paper. That inversion is the visual rhythm break; do not add more.

### Type

```
Display   Archivo Expanded   700 / 800, tight tracking, sentence case
Body      Archivo            400 / 500
Data      IBM Plex Mono      400 / 500
```

All three from Google Fonts. Self-host via `next/font` — no render-blocking
external requests.

**Why these.** Archivo Expanded's wide capitals echo the stencilled markings on
container doors and ULD placards. IBM Plex Mono is not decoration — freight
runs on fixed-width reference data, and every AWB number, HS code, container
number, IMO class, and port code on this site is set in mono. That is true to
the subject, so it earns its place.

The wordmark is round and friendly; the page type is industrial and wide. That
tension is deliberate: the mark is the greeting, the page is the operator.

Type scale, 1.25 ratio, fluid via `clamp()`:

```
display-1  clamp(2.75rem, 7vw, 5.5rem)     Archivo Expanded 800, line-height 0.95
display-2  clamp(2rem, 4.5vw, 3.5rem)      Archivo Expanded 700, line-height 1.05
body-lg    clamp(1.05rem, 1.4vw, 1.25rem)  Archivo 400, line-height 1.6
body       1rem                             Archivo 400, line-height 1.65
data       0.875rem                         IBM Plex Mono 500, letter-spacing 0.02em
eyebrow    0.75rem                          IBM Plex Mono 500, uppercase, tracking 0.14em
```

### Layout

12-column grid, 1440 max width, 24px gutter desktop / 16px mobile. Asymmetric —
most sections break the grid deliberately rather than centring everything.
Section rhythm alternates between full-bleed and inset so scrolling has a
pulse.

## 4. Page structure

```
┌──────────────────────────────────────────────────┐
│  PRELOADER — hexagon draws in, then unspools     │
├──────────────────────────────────────────────────┤
│  HERO (100vh, ink)                               │
│  ripple lines running horizontally behind        │
│                                                  │
│  Seven lanes.                                    │
│  One operator.                              [big]│
│                                                  │
│  short subhead, two lines max                    │
│  [ Request a rate ]  [ Our services ]            │
│                                                  │
│  ── live strip, mono ────────────────────────    │
│  NHAVA SHEVA → JEBEL ALI · 6 DAYS                │
├──────────────────────────────────────────────────┤
│  POSITION (ink, inset)                           │
│  one paragraph. what Seahive is. no fluff.       │
│  three mono figures beside it — count up on view │
├──────────────────────────────────────────────────┤
│  SERVICES — honeycomb grid                       │
│    ⬡ Ocean freight    ⬡ Air freight             │
│       ⬡ Customs    ⬡ Project & OOG              │
│          ⬡ Warehousing                          │
│  cells lift and edge-glow aqua on hover          │
├──────────────────────────────────────────────────┤
│  LANES — scroll-pinned                           │
│  the ripple flattens into a single route line;   │
│  origin/destination pairs advance as you scroll  │
│  mono port codes, transit days, service type     │
├──────────────────────────────────────────────────┤
│  CREDENTIALS (PAPER — the inversion)             │
│  CIN, IEC, IATA DGR Cat 6, GST, MTO roadmap      │
│  set as a document. mono. no icons, no badges.   │
│  this section is deliberately the least animated │
├──────────────────────────────────────────────────┤
│  HOW WE WORK — numbered 01–05                    │
│  (numbering justified: this IS a sequence —      │
│   enquiry → booking → docs → clearance → POD)    │
├──────────────────────────────────────────────────┤
│  CONTACT — the rate request form                 │
│  short. lane, commodity, volume, timeline.       │
│  amber CTA. this is the page's actual purpose.   │
├──────────────────────────────────────────────────┤
│  FOOTER — lines converge, hexagon re-forms       │
└──────────────────────────────────────────────────┘
```

Do not build an "our values" section, a testimonial carousel with invented
quotes, or a partner logo wall Seahive has not earned yet. The company is new.
A short honest page beats a long padded one, and shippers can tell the
difference.

## 5. Stack

- Next.js App Router — static export is fine; there is no dynamic data yet.
- Tailwind — tokens as named colours, not arbitrary values scattered through
  JSX.
- GSAP + ScrollTrigger — all scroll choreography. Free including every plugin.
- Lenis — smooth scroll. Roughly 30 lines, and the single largest contributor
  to the "feels alive" quality. Wire it to ScrollTrigger's ticker so the two do
  not fight.
- No Framer Motion in this project. GSAP handles both timeline and
  micro-interaction; running two animation runtimes doubles bundle size and
  creates competing scroll listeners.
- No Three.js unless a later phase demands it. The ripple system is 2D SVG and
  that is the point.

Architecture: one `<RippleSystem />` client component mounted once in the root
layout, driven by a single master ScrollTrigger timeline. Sections register
their own triggers against it. Do not create a ScrollTrigger per element.

## 6. The mark

```svg
<svg viewBox="6 26 84 68" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Seahive Freight">
  <defs>
    <linearGradient id="gp" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#FFB547"/>
      <stop offset="45%"  stop-color="#19C6AE"/>
      <stop offset="100%" stop-color="#0E5C7A"/>
    </linearGradient>
  </defs>
  <g transform="translate(0,12) scale(0.8)">
    <path d="M33.34 22.00 C40.18 18.54 45.50 18.54 52.34 22.00 C59.18 25.46 64.50 25.46 71.34 22.00 C76.86 18.54 81.14 18.54 86.66 22.00" stroke="url(#gp)" stroke-width="4.6" fill="none" stroke-linecap="round"/>
    <path d="M26.40 34.67 C33.24 38.13 38.56 38.13 45.40 34.67 C52.24 31.21 57.56 31.21 64.40 34.67 C71.24 38.13 76.56 38.13 83.40 34.67 C87.07 31.21 89.93 31.21 93.60 34.67" stroke="url(#gp)" stroke-width="5.6" fill="none" stroke-linecap="round"/>
    <path d="M19.45 47.33 C26.29 43.88 31.61 43.88 38.45 47.33 C45.29 50.79 50.61 50.79 57.45 47.33 C64.29 43.88 69.61 43.88 76.45 47.33 C83.29 50.79 88.61 50.79 95.45 47.33 C97.29 43.88 98.71 43.88 100.55 47.33" stroke="url(#gp)" stroke-width="6.2" fill="none" stroke-linecap="round"/>
    <path d="M12.50 60.00 C19.34 63.46 24.66 63.46 31.50 60.00 C38.34 56.54 43.66 56.54 50.50 60.00 C57.34 63.46 62.66 63.46 69.50 60.00 C76.34 56.54 81.66 56.54 88.50 60.00 C95.34 63.46 100.66 63.46 107.50 60.00" stroke="url(#gp)" stroke-width="6.6" fill="none" stroke-linecap="round"/>
    <path d="M19.45 72.67 C26.29 69.21 31.61 69.21 38.45 72.67 C45.29 76.13 50.61 76.13 57.45 72.67 C64.29 69.21 69.61 69.21 76.45 72.67 C83.29 76.13 88.61 76.13 95.45 72.67 C97.29 69.21 98.71 69.21 100.55 72.67" stroke="url(#gp)" stroke-width="6.2" fill="none" stroke-linecap="round"/>
    <path d="M26.40 85.33 C33.24 88.79 38.56 88.79 45.40 85.33 C52.24 81.88 57.56 81.88 64.40 85.33 C71.24 88.79 76.56 88.79 83.40 85.33 C87.07 81.88 89.93 81.88 93.60 85.33" stroke="url(#gp)" stroke-width="5.6" fill="none" stroke-linecap="round"/>
    <path d="M33.34 98.00 C40.18 94.54 45.50 94.54 52.34 98.00 C59.18 101.46 64.50 101.46 71.34 98.00 C76.86 94.54 81.14 94.54 86.66 98.00" stroke="url(#gp)" stroke-width="4.6" fill="none" stroke-linecap="round"/>
  </g>
</svg>
```

Each path needs `pathLength="1"` added when animating draw-in, so
`strokeDasharray`/`strokeDashoffset` can be driven 1 → 0 regardless of actual
path length.

For the scroll-driven wave motion, do not animate the `d` attribute as a
string. Generate the path from a sine function in JS and rewrite `d` on each
ScrollTrigger update, with `phase` and `amplitude` as the two driven variables.
That gives continuous deformation instead of interpolation between fixed
keyframes.

## 7. Assets

**Free — pure code, no assets** (this is ~70% of the visual impact): ripple
system, honeycomb grid, type, counters, dividers, hover states, page
transitions, the full motion layer.

**Needs real photography — do not fake these:** Team photos. The office. Actual
cargo Seahive has moved. One honest photo of real people outperforms any
generated hero image on a trust-driven B2B page, and generated people are
increasingly recognisable as generated.

**Suitable for generation — atmosphere only, never the subject:**

- Hero backdrop: deep-ocean water surface, near-black, shot from above, no
  vessel in frame
- Abstract depth gradients and light-shaft textures for section backgrounds
- Aerial sea texture for the ocean-freight section, heavily darkened and
  overlaid with Ink at 80%

**Do not generate:** containers, aircraft, cranes, trucks, port equipment, or
anything with visible text or markings. Generated freight equipment gets
details wrong — wrong door hardware, impossible wheel counts, garbled container
markings, invented airline liveries — and the exact audience for this site
notices immediately.

## 8. Quality floor

Meet all of this without announcing it in the UI:

- `prefers-reduced-motion: reduce` → disable Lenis, kill all scroll-scrub,
  replace reveals with instant opacity. The ripple system renders static in its
  hexagon state. The page must be fully usable and still look composed.
- Fully responsive to 360px. On mobile, the honeycomb collapses to a single
  column of hex cells and the pinned lanes section becomes a normal vertical
  stack — do not attempt scroll-pinning on touch.
- Visible keyboard focus rings in Aqua. Tab order follows visual order.
- Contrast: Salt on Ink and Aqua on Ink both clear AA. Amber on Ink is AA for
  large text only — never use amber for body copy.
- Performance budget: LCP under 2.5s on a throttled 4G Moto G4 profile. This is
  the real constraint — the audience is on Indian mobile networks. Ship AVIF
  with WebP fallback, lazy-load everything below the fold, and keep total JS
  under 200KB gzipped.
- Semantic HTML. One `<h1>`. Real `<form>` with labels, not divs.

## 9. Build order

1. Tokens, fonts, Lenis + ScrollTrigger wiring, empty section shells. Verify
   smooth scroll works before anything else.
2. `<RippleSystem />` — the sine generator and the master timeline. Get this
   right before building sections; everything else hangs off it.
3. Hero and preloader.
4. Remaining sections top to bottom, with real copy.
5. Reduced-motion and mobile passes.
6. Performance pass. Measure, do not assume.

After step 3, stop and show a screenshot before continuing. If the hero does
not already feel distinctive, the rest of the page will not save it.
