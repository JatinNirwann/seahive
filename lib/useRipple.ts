"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import {
  markRippleDirty,
  rippleState,
  setRippleAmplitude,
} from "./rippleState";

/**
 * Registers a section's target wave amplitude.
 *
 * One ScrollTrigger per section — around seven for the whole page — never one
 * per element. Amplitude rises through the ocean-freight material and flattens
 * toward zero through customs and compliance, where the content is about
 * precision rather than movement.
 */
export function useRipple(
  ref: RefObject<HTMLElement | null>,
  amplitude: number,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 65%",
      end: "bottom 35%",
      onEnter: () => setRippleAmplitude(amplitude),
      onEnterBack: () => setRippleAmplitude(amplitude),
    });

    return () => trigger.kill();
  }, [ref, amplitude]);
}

/**
 * The closing move: across the footer the lines converge and re-form the
 * hexagon. The mark closes.
 *
 * Scrubbed rather than triggered, so scrolling back up unspools it again.
 */
export function useRippleConverge(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.to(rippleState, {
      hexT: 0,
      ease: "none",
      paused: true,
      onUpdate: markRippleDirty,
    });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      end: "bottom bottom",
      onUpdate: (self) => tween.progress(self.progress),
    });

    return () => {
      trigger.kill();
      tween.kill();
    };
  }, [ref]);
}
