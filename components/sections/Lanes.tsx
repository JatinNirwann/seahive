"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Section from "@/components/ui/Section";
import { LANES_INTRO } from "@/content/copy";
import { LANES, REGIONS, REGION_DETAIL, type Region } from "@/content/lanes";

/**
 * The lane table, pinned and travelling sideways on desktop.
 *
 * The ripple runs at full amplitude here — this is the ocean-freight material,
 * and it is the one section where the waves are supposed to be felt.
 *
 * Pinning is confined to fine pointers at 1024px and up. On a touch screen a
 * pinned section fights the reader's own scroll, and the same panels read
 * perfectly well stacked, so touch gets the stack.
 */
export default function Lanes() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        const el = track.current;
        const container = root.current;
        if (!el || !container) return;

        const distance = () => Math.max(0, el.scrollWidth - window.innerWidth + 96);

        gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      },
    );

    return () => mm.revert();
  }, []);

  const byRegion = (region: Region) => LANES.filter((l) => l.region === region);

  return (
    <Section id="lanes" amplitude={1}>
      <div className="layer-content pt-24 sm:pt-32">
        <div className="shell">
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
        </div>
      </div>

      {/* Only the track pins, never the heading above it. A pinned block taller
          than the viewport has its foot cut off for the whole scroll, and the
          Gulf panel alone runs to nine lanes. */}
      <div
        ref={root}
        className="layer-content pt-14 pb-24 sm:pb-32 lg:flex lg:h-screen lg:items-center lg:py-0"
      >
        <div className="w-full overflow-hidden">
          <div
            ref={track}
            className="flex flex-col gap-8 px-4 md:px-6 lg:w-max lg:flex-row lg:gap-6"
          >
            {REGIONS.map((region) => {
              const lanes = byRegion(region);
              return (
                <section
                  key={region}
                  data-reveal
                  aria-label={region}
                  className="w-full shrink-0 border border-mist-deep bg-surface p-6 lg:max-h-[82vh] lg:w-[26rem] lg:overflow-y-auto"
                >
                  {/* Eyebrow above title, the same rhythm every other section
                      heading on the page uses. Side by side, the longer region
                      names wrapped against the modes label. */}
                  <header className="border-b border-mist-deep pb-3">
                    <p className="font-data text-eyebrow uppercase text-marine">
                      {REGION_DETAIL[region].modes}
                    </p>
                    <h3 className="mt-2 font-display font-expanded text-[1.15rem] text-ink">
                      {region}
                    </h3>
                  </header>

                  {/* The claim, then the evidence: the client's framing of the
                      region leads, and the lanes beneath it are what backs it
                      up. */}
                  <p className="mt-4 max-w-[46ch] text-[0.9rem] leading-relaxed text-graphite">
                    {REGION_DETAIL[region].highlight}
                  </p>

                  <table className="mt-5 w-full border-collapse text-left">
                    <caption className="sr-only">
                      Lanes to {region}, with indicative port-to-port transit
                      times
                    </caption>
                    <thead>
                      <tr className="font-data text-eyebrow uppercase text-graphite">
                        <th scope="col" className="pb-2 font-500">
                          {lanes.length} {lanes.length === 1 ? "lane" : "lanes"}
                        </th>
                        <th scope="col" className="pb-2 text-right font-500">
                          Transit, indicative
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lanes.map((l) => (
                        <tr
                          key={`${l.origin.code}-${l.destination.code}`}
                          className="border-t border-mist-deep align-top"
                        >
                          <th scope="row" className="py-2.5 pr-4 font-400">
                            <span className="block font-data text-data text-ink">
                              {l.origin.code}
                              <span className="px-2 text-marine">→</span>
                              {l.destination.code}
                            </span>
                            <span className="mt-1 block text-[0.8rem] text-graphite">
                              {l.origin.name} to {l.destination.name},{" "}
                              {l.destination.country}
                            </span>
                            {/* Deep Sea is 2.3:1 on Ink — a border colour, never
                                a text colour. Brine clears AA at 5.2:1. */}
                            <span className="mt-1 block font-data text-[0.75rem] text-graphite">
                              {l.mode} · {l.service}
                            </span>
                          </th>
                          <td className="py-2.5 text-right font-data text-data whitespace-nowrap text-graphite">
                            {l.transit[0]}–{l.transit[1]}
                            <span className="pl-1 text-graphite">d</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
