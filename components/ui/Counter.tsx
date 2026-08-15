"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * A figure that counts up when it first comes into view.
 *
 * Renders its final value in the markup, so the number is correct before any
 * script runs and correct forever if none does. The count is an enhancement
 * laid over a finished figure, never the thing that produces it.
 */
export default function Counter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration: 1.1,
      ease: "power2.out",
      paused: true,
      onUpdate: () => {
        el.textContent = String(Math.round(counter.n));
      },
    });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => tween.play(),
    });

    return () => {
      trigger.kill();
      tween.kill();
      el.textContent = String(value);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
