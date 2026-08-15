"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { HERO } from "@/content/copy";
import { FEATURED_LANES } from "@/content/lanes";
import Mark from "@/components/ui/Mark";

/**
 * The hero.
 *
 * The ripple unspools behind this: the hexagon stretches into parallel lines
 * that run off both edges of the viewport. Sea becomes route. Everything here
 * is deliberately quiet so that motion is the only thing competing for
 * attention.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // Starts as the curtain lifts, so the type arrives with the unspool
      // rather than after it.
      gsap
        .timeline({ delay: 1.15 })
        .from("[data-hero-line]", {
          yPercent: 108,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
        })
        .from(
          "[data-hero-fade]",
          { opacity: 0, y: 14, duration: 0.7, ease: "power2.out", stagger: 0.1 },
          "-=0.55",
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden pt-6 pb-0"
    >
      <header className="shell layer-content flex items-center justify-between">
        <a
          href="#top"
          className="flex min-h-11 items-center gap-3"
          aria-label="Seahive Freight, home"
        >
          <Mark className="h-9 w-auto" />
          <span className="font-display font-expanded text-[0.95rem] font-700 tracking-tight text-ink">
            Seahive Freight
          </span>
        </a>
        <a
          href="#rate-request"
          className="hidden min-h-11 items-center text-eyebrow font-data uppercase text-graphite transition-colors hover:text-marine sm:inline-flex"
        >
          Request a rate
        </a>
      </header>

      <div className="shell layer-content grid grid-cols-12 gap-x-6 py-16">
        <div className="col-span-12 lg:col-span-9 xl:col-span-8">
          <p
            data-hero-fade
            className="font-data text-eyebrow uppercase text-marine"
          >
            {HERO.eyebrow}
          </p>

          <h1 className="mt-6 font-display font-expanded text-display-1 text-ink">
            {HERO.headline.map((line) => (
              <span key={line} className="block overflow-hidden">
                <span data-hero-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            data-hero-fade
            className="mt-7 max-w-[46ch] text-body-lg text-graphite"
          >
            {HERO.subhead}
          </p>

          <div data-hero-fade className="mt-9 flex flex-wrap items-center gap-4">
            {/* The page's purpose, and the only solid fill of the accent above the fold. */}
            <a
              href="#rate-request"
              className="inline-flex min-h-11 items-center bg-marine px-7 font-data text-data font-500 tracking-wide text-surface transition-colors hover:bg-marine-deep"
            >
              {HERO.primaryCta}
            </a>
            <a
              href="#services"
              className="inline-flex min-h-11 items-center border border-mist-deep px-7 font-data text-data text-ink transition-colors hover:border-marine hover:text-marine"
            >
              {HERO.secondaryCta}
            </a>
          </div>
        </div>
      </div>

      <LiveStrip />
    </section>
  );
}

/**
 * The live strip. The pulsing dot is the live signal; it uses the same accent
 * as everything else rather than a second hue, because a page with one accent
 * reads expensive and a page with two reads like a template.
 */
function LiveStrip() {
  return (
    <div
      data-hero-fade
      className="layer-content border-t border-mist-deep bg-paper/70 backdrop-blur-[2px]"
    >
      <div className="shell flex items-center gap-6 overflow-x-auto py-3.5">
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-marine opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-marine" />
          </span>
          <span className="font-data text-eyebrow uppercase text-graphite">
            {HERO.stripLabel}
          </span>
        </span>

        <ul className="flex items-center gap-6 sm:gap-9">
          {FEATURED_LANES.map((l) => (
            <li
              key={`${l.origin.code}-${l.destination.code}`}
              className="shrink-0 font-data text-data whitespace-nowrap text-graphite"
            >
              <span className="text-ink">{l.origin.code}</span>
              <span className="px-2 text-marine">→</span>
              <span className="text-ink">{l.destination.code}</span>
              <span className="pl-3 text-graphite">
                {l.transit[0]}–{l.transit[1]} days
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
