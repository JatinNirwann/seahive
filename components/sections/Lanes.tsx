import Section from "@/components/ui/Section";
import PortMap from "@/components/ui/PortMap";
import { LANES_INTRO } from "@/content/copy";

/**
 * The network: a map of every port called.
 *
 * This replaced a pinned, horizontally scrolling track of table panels. Two
 * things were wrong with that. It read as a shipping document rather than as a
 * network — which is accurate to the data and wrong for the job the section
 * has. And pinning hijacks the reader's own scroll, which `BRIEF.md` rules out
 * on touch anyway, so half the audience was getting a different section.
 *
 * The region panels that used to sit beneath it are gone at the client's
 * request, now that the map carries the same answer. What went with them: the
 * port codes, the service frequency and the indicative transit times. Each dot
 * still names its port and country on hover and to a screen reader, but the
 * numbers are no longer anywhere on this page.
 *
 * No `"use client"`. Nothing here reacts to anything, and the map's path data
 * is 47KB — a client boundary would ship all of it a second time inside the
 * hydration payload.
 */
export default function Lanes() {
  return (
    <Section id="lanes" amplitude={1} className="py-24 sm:py-32">
      <div className="shell layer-content">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-7">
            <p data-reveal className="font-data text-eyebrow uppercase text-marine">
              {LANES_INTRO.eyebrow}
            </p>
            <h2
              data-reveal
              className="mt-5 font-display font-expanded text-display-2 text-ink"
            >
              {LANES_INTRO.heading}
            </h2>
            <p data-reveal className="mt-6 max-w-[58ch] text-body-lg text-graphite">
              {LANES_INTRO.body}
            </p>
          </div>
        </div>

        {/* On its own surface. The map sits over the road clip, and a pale
            landmass on moving video reads as smudge rather than as coastline —
            the panel gives it a still, flat ground to be drawn on, and matches
            the lane panels below it. */}
        <div
          data-reveal
          className="mt-14 border border-mist-deep bg-surface p-5 sm:p-8"
        >
          <PortMap />
        </div>

      </div>
    </Section>
  );
}
