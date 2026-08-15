/**
 * The behaviour layer for the standalone single-file build.
 *
 * The static export already contains the finished markup, so what this
 * replaces is only the React runtime that would otherwise attach behaviour to
 * it. Everything that carries real meaning — the wave geometry, the backdrop
 * sequence — is imported from the same modules the site itself uses, so the
 * standalone cannot drift away from the deployed page on the things that
 * matter. Only the DOM plumbing is written twice.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { WAVE_COUNT, pathFromMetrics, waveMetrics } from "../../lib/wave.ts";
import { BACKDROPS } from "../../content/backdrops.ts";
import { connectionAllowsVideo, watchConnection } from "../../lib/connection.ts";

gsap.registerPlugin(ScrollTrigger);

const PHASE_TRAVEL = Math.PI * 24;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ripple = { phase: 0, amplitude: 0.55, hexT: 0 };
let dirty = true;
const markDirty = () => {
  dirty = true;
};

/* ── Smooth scroll ──────────────────────────────────────────────────────── */

if (!reduced) {
  const lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    syncTouch: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
}

/* ── The ripple system ──────────────────────────────────────────────────── */

const svg = document.querySelector<SVGSVGElement>("svg[aria-hidden='true']");
const paths = svg ? Array.from(svg.querySelectorAll("path")) : [];

if (svg && paths.length === WAVE_COUNT) {
  const size = { w: window.innerWidth, h: window.innerHeight };
  const warmStop = svg.querySelector<SVGStopElement>("stop:nth-of-type(1)");
  const midStop = svg.querySelector<SVGStopElement>("stop:nth-of-type(2)");

  const applyViewBox = () =>
    svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);

  const render = () => {
    for (let i = 0; i < WAVE_COUNT; i++) {
      const m = waveMetrics(i, ripple.amplitude, ripple.hexT, size.w, size.h);
      paths[i].setAttribute("d", pathFromMetrics(m, i, ripple.phase, size.w));
      paths[i].setAttribute("stroke-width", m.stroke.toFixed(2));
    }
  };

  applyViewBox();
  render();

  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === size.w && Math.abs(h - size.h) < 120) return;
    size.w = w;
    size.h = h;
    applyViewBox();
    markDirty();
    ScrollTrigger.refresh();
  });

  gsap.ticker.add(() => {
    if (!dirty) return;
    dirty = false;
    render();
  });

  if (reduced) {
    gsap.set(svg, { opacity: 0.16, zIndex: 1 });
    gsap.set(paths, { strokeDasharray: "none", strokeDashoffset: 0 });
    warmStop?.setAttribute("stop-color", "#0B4A63");
    midStop?.setAttribute("stop-color", "#14657F");
    markDirty();
  } else {
    const draw = Array.from({ length: WAVE_COUNT }, () => ({ t: 0 }));
    const applyDraw = () => {
      for (let i = 0; i < WAVE_COUNT; i++) {
        const t = draw[i].t;
        paths[i].setAttribute("stroke-dasharray", `${t} 1`);
        paths[i].setAttribute("stroke-dashoffset", `${t / 2 - 0.5}`);
      }
    };
    applyDraw();

    gsap
      .timeline()
      .to(draw, {
        t: 1,
        duration: 0.72,
        ease: "power2.inOut",
        stagger: 0.06,
        onUpdate: applyDraw,
      })
      .set(paths, { strokeDasharray: "none", strokeDashoffset: 0 })
      .to(
        ripple,
        { hexT: 1, duration: 1.25, ease: "power3.inOut", onUpdate: markDirty },
        ">-0.05",
      )
      .to(svg, { opacity: 0.2, duration: 0.9, ease: "power2.out" }, "<")
      .to(
        [warmStop, midStop],
        { attr: { "stop-color": "#0B4A63" }, duration: 0.9 },
        "<",
      )
      .set(svg, { zIndex: 1 });

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: "max",
      onUpdate: (self) => {
        ripple.phase = self.progress * PHASE_TRAVEL;
        markDirty();
      },
    });
  }
}

/* ── The scroll-driven video backdrop ───────────────────────────────────────
   Mirrors components/VideoBackdrop.tsx. Without this the standalone shows the
   first clip's poster for the entire page — the sky, and only the sky — which
   looks exactly like a working backdrop until you scroll past the hero.      */

{
  const layers = Array.from(
    document.querySelectorAll<HTMLVideoElement>(
      "div[aria-hidden='true'] > video",
    ),
  );
  // The wash is the element immediately after the clips inside the backdrop.
  const washLayer = layers[0]?.parentElement?.querySelector<HTMLElement>(
    "div.absolute.inset-0",
  );

  if (layers.length === BACKDROPS.length) {
    if (reduced) {
      gsap.set(layers[0], { opacity: 1 });
      if (washLayer) gsap.set(washLayer, { opacity: BACKDROPS[0].wash });
    } else {
      let active = -1;
      let videoAllowed = connectionAllowsVideo();

      const activate = (index: number) => {
        if (index === active) return;
        active = index;

        layers.forEach((video, i) => {
          if (i === index && videoAllowed) {
            if (!video.src) {
              const webm = video.dataset.webm ?? "";
              const mp4 = video.dataset.mp4 ?? "";
              const preferWebm =
                webm && video.canPlayType('video/webm; codecs="vp9"') !== "";
              video.src = preferWebm ? webm : mp4;
              video.load();
            }
            const start = () =>
              void video.play().catch(() => {
                /* Autoplay refused; the poster frame stands in. */
              });
            if (video.readyState >= 2) start();
            else video.addEventListener("canplay", start, { once: true });
          } else {
            video.pause();
          }
          gsap.to(video, {
            opacity: i === index ? 1 : 0,
            duration: 0.9,
            ease: "power2.inOut",
            overwrite: "auto",
          });
        });

        if (washLayer) {
          gsap.to(washLayer, {
            opacity: BACKDROPS[index].wash,
            duration: 0.9,
            ease: "power2.inOut",
            overwrite: "auto",
          });
        }
      };

      activate(0);

      // Same anchor-driven handover as components/VideoBackdrop.tsx: each clip
      // takes over when its anchor element reaches the middle of the viewport,
      // so the sea arrives exactly where the page says "sea level".
      let handover: number[] = [];

      const measure = () => {
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        handover = BACKDROPS.map((backdrop, i) => {
          if (i === 0) return 0;
          const el = backdrop.anchor
            ? document.querySelector<HTMLElement>(backdrop.anchor)
            : null;
          if (!el) return (i / BACKDROPS.length) * maxScroll;
          const top = el.getBoundingClientRect().top + window.scrollY;
          return Math.min(
            maxScroll,
            Math.max(0, top - window.innerHeight * 0.5),
          );
        });
        for (let i = 1; i < handover.length; i += 1) {
          handover[i] = Math.max(handover[i], handover[i - 1] + 1);
        }
      };

      measure();
      ScrollTrigger.addEventListener("refresh", measure);

      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          let index = 0;
          for (let i = 0; i < handover.length; i += 1) {
            if (y >= handover[i]) index = i;
          }
          activate(index);
        },
      });

      watchConnection(() => {
        const next = connectionAllowsVideo();
        if (next === videoAllowed) return;
        videoAllowed = next;
        const current = active;
        active = -1;
        if (!next) layers.forEach((v) => v.pause());
        activate(current === -1 ? 0 : current);
      });
    }
  }
}

/* ── Section amplitudes ─────────────────────────────────────────────────── */

const AMPLITUDES: [string, number][] = [
  ["#services", 0.75],
  ["#lanes", 1],
  ["#excellence", 0],
  ["#process", 0.3],
  ["#rate-request", 0.2],
];

if (!reduced) {
  for (const [selector, amplitude] of AMPLITUDES) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const set = () =>
      gsap.to(ripple, {
        amplitude,
        duration: 0.9,
        ease: "power2.out",
        overwrite: "auto",
        onUpdate: markDirty,
      });
    ScrollTrigger.create({
      trigger: el,
      start: "top 65%",
      end: "bottom 35%",
      onEnter: set,
      onEnterBack: set,
    });
  }

  const footer = document.querySelector("footer");
  if (footer) {
    const converge = gsap.to(ripple, {
      hexT: 0,
      ease: "none",
      paused: true,
      onUpdate: markDirty,
    });
    ScrollTrigger.create({
      trigger: footer,
      start: "top 85%",
      end: "bottom bottom",
      onUpdate: (self) => converge.progress(self.progress),
    });
  }
}

/* ── Hero intro, reveals, dividers, counters, rail ──────────────────────── */

if (!reduced) {
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

  const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  if (targets.length) {
    gsap.set(targets, { opacity: 0, y: 20 });
    ScrollTrigger.batch(targets, {
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
    });
  }

  const dividers = gsap.utils.toArray<SVGPathElement>("[data-divider-path]");
  if (dividers.length) {
    gsap.set(dividers, { strokeDashoffset: 1 });
    ScrollTrigger.batch(dividers, {
      start: "top 92%",
      once: true,
      onEnter: (group) =>
        gsap.to(group, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.inOut",
          overwrite: true,
        }),
    });
  }

  // Figures count up. Their final value is already in the markup.
  for (const el of document.querySelectorAll<HTMLElement>("dd > span")) {
    const value = Number(el.textContent);
    if (!Number.isFinite(value)) continue;
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
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => tween.play(),
    });
  }

  const rail = document.querySelector<HTMLElement>("#process ol > span > span");
  const list = document.querySelector<HTMLElement>("#process ol");
  if (rail && list) {
    gsap.set(rail, { scaleY: 0, transformOrigin: "top" });
    ScrollTrigger.create({
      trigger: list,
      start: "top 75%",
      end: "bottom 75%",
      scrub: 0.5,
      onUpdate: (self) => gsap.set(rail, { scaleY: self.progress }),
    });
  }

  // Desktop only, matching the site: no scroll pinning on touch.
  const track = document.querySelector<HTMLElement>("#lanes .flex.flex-col");
  const pinned = track?.parentElement?.parentElement;
  if (track && pinned && window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: pinned,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  }
}

/* ── The rate request form ──────────────────────────────────────────────── */

const form = document.querySelector("form");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const composed = Array.from(data.entries())
    .filter(([, v]) => String(v).trim().length > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  document.querySelector("[data-submit-notice]")?.remove();

  const notice = document.createElement("div");
  notice.setAttribute("role", "status");
  notice.setAttribute("data-submit-notice", "");
  notice.className = "mt-6 border border-marine/40 bg-marine/5 p-5";
  notice.innerHTML =
    '<p class="font-data text-eyebrow uppercase text-marine">Not sent — no endpoint configured</p>' +
    '<p class="mt-3 text-[0.875rem] leading-relaxed text-graphite">This form has no backend connected yet, so nothing was transmitted. Your request is written out below — copy it into an email until the endpoint is wired up.</p>' +
    '<pre class="mt-4 overflow-x-auto border-t border-marine/25 pt-4 font-data text-[0.8rem] leading-relaxed whitespace-pre-wrap text-graphite"></pre>';
  notice.querySelector("pre")!.textContent = composed;
  form.parentElement?.append(notice);
});
