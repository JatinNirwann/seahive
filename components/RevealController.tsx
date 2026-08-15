"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Every scroll reveal on the page, from one place.
 *
 * `ScrollTrigger.batch` groups elements that cross the line together, so the
 * whole page costs a handful of triggers instead of one per element — and
 * elements arriving together animate as a group rather than as a ragged
 * cascade.
 *
 * Targets are visible in the markup. This hides them only after confirming
 * motion is allowed, which means a failed bundle or a reduced-motion setting
 * leaves a complete page rather than a blank one.
 */
export default function RevealController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    const dividers = gsap.utils.toArray<SVGPathElement>("[data-divider-path]");
    if (!targets.length && !dividers.length) return;

    const batches: ScrollTrigger[] = [];

    if (targets.length) {
      gsap.set(targets, { opacity: 0, y: 20 });
      batches.push(
        ...ScrollTrigger.batch(targets, {
          start: "top 88%",
          once: true,
          onEnter: (group) =>
            gsap.to(group, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              stagger: 0.08,
              overwrite: true,
            }),
        }),
      );
    }

    // Dividers draw themselves outward as they arrive, using the same
    // pathLength trick as the preloader.
    if (dividers.length) {
      gsap.set(dividers, { strokeDashoffset: 1 });
      batches.push(
        ...ScrollTrigger.batch(dividers, {
          start: "top 92%",
          once: true,
          onEnter: (group) =>
            gsap.to(group, {
              strokeDashoffset: 0,
              duration: 1.1,
              ease: "power2.inOut",
              overwrite: true,
            }),
        }),
      );
    }

    // Anything already above the fold when this mounts never crosses the line.
    ScrollTrigger.refresh();

    return () => {
      batches.forEach((t) => t.kill());
      gsap.set(targets, { clearProps: "opacity,transform" });
      gsap.set(dividers, { strokeDashoffset: 0 });
    };
  }, []);

  return null;
}
