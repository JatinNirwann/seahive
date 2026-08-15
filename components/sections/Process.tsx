"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Section from "@/components/ui/Section";
import { PROCESS } from "@/content/process";
import { PROCESS_INTRO } from "@/content/copy";

/**
 * Numbered 01 to 05.
 *
 * The numbering is justified because this is genuinely a sequence — enquiry,
 * booking, documents, clearance, proof of delivery — and each step names what
 * you actually hold at the end of it. An ordered list, because it is one.
 *
 * A rail runs down the left of the list and fills as you scroll it. It is
 * scrubbed rather than triggered, so it reads as your own position in the
 * sequence rather than as decoration that plays once and stops.
 */
export default function Process() {
  const list = useRef<HTMLOListElement>(null);
  const rail = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = rail.current;
      const container = list.current;
      if (!el || !container) return;

      gsap.set(el, { scaleY: 0, transformOrigin: "top" });

      const trigger = ScrollTrigger.create({
        trigger: container,
        start: "top 75%",
        end: "bottom 75%",
        scrub: 0.5,
        onUpdate: (self) => gsap.set(el, { scaleY: self.progress }),
      });

      return () => trigger.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <Section id="process" amplitude={0.3} className="py-24 sm:py-32">
      <div className="shell layer-content">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-6">
            <p data-reveal className="font-data text-eyebrow uppercase text-marine">
              {PROCESS_INTRO.eyebrow}
            </p>
            <h2
              data-reveal
              className="mt-5 font-display font-expanded text-display-2 text-ink"
            >
              {PROCESS_INTRO.heading}
            </h2>
          </div>
        </div>

        <ol ref={list} className="relative mt-14 border-t border-mist-deep">
          {/* The rail. Sits in the gutter, never over the type. */}
          <span
            aria-hidden="true"
            className="absolute top-0 -left-4 hidden h-full w-px bg-mist-deep sm:block"
          >
            <span
              ref={rail}
              className="block h-full w-full bg-marine"
            />
          </span>

          {PROCESS.map((step) => (
            <li
              key={step.n}
              data-reveal
              className="grid grid-cols-12 gap-x-6 gap-y-3 border-b border-mist-deep py-8"
            >
              <span className="col-span-2 font-data text-data text-marine sm:col-span-1">
                {step.n}
              </span>
              <h3 className="col-span-10 font-display font-expanded text-[1.35rem] leading-tight text-ink sm:col-span-3">
                {step.title}
              </h3>
              <p className="col-span-12 max-w-[62ch] text-body text-graphite sm:col-span-8 lg:col-span-5">
                {step.body}
              </p>
              <p className="col-span-12 font-data text-data text-graphite sm:col-span-8 sm:col-start-5 lg:col-span-3 lg:col-start-10 lg:text-right">
                {step.output}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
