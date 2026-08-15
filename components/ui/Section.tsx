"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { useRipple } from "@/lib/useRipple";

/**
 * A page section that tells the ripple how hard to move behind it.
 *
 * One ScrollTrigger each, around seven for the page. Amplitude rises through
 * the ocean-freight material and falls to zero through customs and compliance,
 * where the subject is precision rather than movement.
 */
export default function Section({
  id,
  amplitude,
  className,
  children,
}: {
  id?: string;
  /** 0 = flat, 1 = full swell. */
  amplitude: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useRipple(ref, amplitude);

  return (
    <section ref={ref} id={id} className={clsx("relative", className)}>
      {children}
    </section>
  );
}
