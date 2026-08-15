"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis, driven by the GSAP ticker.
 *
 * Two animation runtimes each running their own rAF loop will drift a frame
 * apart and make scrub feel loose. Handing Lenis the GSAP ticker means one
 * clock drives both, and `lagSmoothing(0)` stops GSAP from silently skipping
 * time on a slow frame — which on a mid-range Android is the difference
 * between a scrubbed wave that tracks the thumb and one that snaps.
 *
 * Disabled outright under `prefers-reduced-motion: reduce`: native scrolling
 * is what the reader asked for.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      // Touch devices already have a tuned native scroll; overriding it costs
      // responsiveness and battery for no gain.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
