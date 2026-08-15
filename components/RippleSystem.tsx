"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  consumeRippleDirty,
  markRippleDirty,
  rippleState,
} from "@/lib/rippleState";
import { WAVE_COUNT, pathFromMetrics, waveMetrics } from "@/lib/wave";

/** Total phase advance across the whole document. Sets how fast lines travel. */
const PHASE_TRAVEL = Math.PI * 24;

const WAVES = Array.from({ length: WAVE_COUNT }, (_, i) => i);

/**
 * The signature element, mounted exactly once for the whole site.
 *
 * One SVG travels the entire page. It draws in as the preloader, unspools into
 * parallel route lines at the hero, advances phase with scroll, and converges
 * back into the hexagon at the footer. It sits behind everything at low
 * opacity and never competes with type.
 *
 * Scroll-scrubbed, never autoplaying: the motion is tied to the reader's own
 * scroll, which is what makes a page feel alive rather than busy.
 */
export default function RippleSystem() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const warmStopRef = useRef<SVGStopElement>(null);
  const midStopRef = useRef<SVGStopElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];
    if (paths.length !== WAVE_COUNT) return;

    const size = { w: window.innerWidth, h: window.innerHeight };

    const applyViewBox = () => {
      svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    };

    const render = () => {
      for (let i = 0; i < WAVE_COUNT; i++) {
        const m = waveMetrics(
          i,
          rippleState.amplitude,
          rippleState.hexT,
          size.w,
          size.h,
        );
        paths[i].setAttribute(
          "d",
          pathFromMetrics(m, i, rippleState.phase, size.w),
        );
        paths[i].setAttribute("stroke-width", m.stroke.toFixed(2));
      }
    };

    applyViewBox();
    render();

    // Mobile browsers fire resize every time the URL bar slides, which would
    // otherwise re-lay-out the waves mid-scroll. Only a width change, or a
    // height change large enough to be a real rotation, counts.
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === size.w && Math.abs(h - size.h) < 120) return;
      size.w = w;
      size.h = h;
      applyViewBox();
      markRippleDirty();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      if (consumeRippleDirty()) render();
    };
    gsap.ticker.add(tick);

    const mm = gsap.matchMedia();

    /* Reduced motion: the mark, held still, and nothing else. -------------- */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      rippleState.hexT = 0;
      rippleState.phase = 0;
      // Lower than the moving state: a static shape at rest behind text reads
      // heavier than the same shape travelling.
      gsap.set(svg, { opacity: 0.16, zIndex: 1 });
      gsap.set(paths, { strokeDasharray: "none", strokeDashoffset: 0 });
      warmStopRef.current?.setAttribute("stop-color", "#0B4A63");
      midStopRef.current?.setAttribute("stop-color", "#14657F");
      markRippleDirty();
    });

    /* Full motion ---------------------------------------------------------- */
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Draw each wave outward from its own centre, staggered top to bottom.
      // With pathLength="1" a dash of length t centred on the midpoint is
      // dasharray "t 1" offset by t/2 - 0.5, regardless of real path length.
      const draw = WAVES.map(() => ({ t: 0 }));

      const applyDraw = () => {
        for (let i = 0; i < WAVE_COUNT; i++) {
          const t = draw[i].t;
          paths[i].setAttribute("stroke-dasharray", `${t} 1`);
          paths[i].setAttribute("stroke-dashoffset", `${t / 2 - 0.5}`);
        }
      };
      applyDraw();

      const intro = gsap.timeline();

      intro
        .to(draw, {
          t: 1,
          duration: 0.72,
          ease: "power2.inOut",
          stagger: 0.06,
          onUpdate: applyDraw,
        })
        .set(paths, { strokeDasharray: "none", strokeDashoffset: 0 })
        // Sea becomes route: the hexagon stretches into parallel lines that
        // run off both edges of the viewport.
        .to(
          rippleState,
          {
            hexT: 1,
            duration: 1.25,
            ease: "power3.inOut",
            onUpdate: markRippleDirty,
          },
          ">-0.05",
        )
        // Drop behind the content as it goes.
        .to(svg, { opacity: 0.2, duration: 0.9, ease: "power2.out" }, "<")
        // The mark's amber and aqua belong to the logo. Once the waves leave
        // the hexagon and become page furniture they collapse to the single
        // marine accent — two saturated hues drifting behind the type is what
        // made the previous palette read cheap.
        .to(
          [warmStopRef.current, midStopRef.current],
          { attr: { "stop-color": "#0B4A63" }, duration: 0.9 },
          "<",
        )
        // Drops to the ripple layer: above section backdrops, below all type.
        .set(svg, { zIndex: 1 });

      // The one master trigger. Sections register their own amplitude against
      // this through useRipple; nothing else drives the waves.
      const master = ScrollTrigger.create({
        trigger: document.documentElement,
        start: 0,
        end: "max",
        onUpdate: (self) => {
          rippleState.phase = self.progress * PHASE_TRAVEL;
          markRippleDirty();
        },
      });

      return () => {
        intro.kill();
        master.kill();
      };
    });

    return () => {
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
      mm.revert();
    };
  }, []);

  return (
    <>
      {/*
        The preloader curtain. Its fade is pure CSS with `forwards` fill, so the
        page reveals itself on a timer whether or not the JavaScript ever runs
        — a curtain that depends on script to lift is one bad bundle away from
        hiding the site completely.
      */}
      <div className="ripple-curtain" aria-hidden="true" />

      <svg
        ref={svgRef}
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 50 }}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* The mark's own amber leads the draw-in, then hands over to a
              single-hue marine ramp for the rest of the page. One accent on
              the page, and the warm stop stays where it belongs: in the logo. */}
          <linearGradient id="seahive-ripple" x1="0" y1="0" x2="1" y2="1">
            <stop ref={warmStopRef} offset="0%" stopColor="#FFB547" />
            <stop ref={midStopRef} offset="45%" stopColor="#19C6AE" />
            <stop offset="100%" stopColor="#0B4A63" />
          </linearGradient>
        </defs>
        <g ref={groupRef}>
          {WAVES.map((i) => (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              pathLength="1"
              fill="none"
              stroke="url(#seahive-ripple)"
              strokeLinecap="round"
              strokeDasharray="0 1"
              strokeDashoffset="-0.5"
            />
          ))}
        </g>
      </svg>
    </>
  );
}
