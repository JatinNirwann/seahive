"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { asset } from "@/lib/basePath";
import { connectionAllowsVideo, watchConnection } from "@/lib/connection";
import { BACKDROPS } from "@/content/backdrops";

/**
 * The scroll-driven video backdrop.
 *
 * One fixed layer behind the whole page, crossfading between clips as you
 * scroll: sky at the top, road through the middle, sea at the bottom. It sits
 * under the ripple and under all type.
 *
 * Three things keep this from wrecking the page it sits behind:
 *
 * 1. **Only one clip is ever decoding.** Video decode is the expensive part,
 *    not the download, and three clips playing at once on a mid-range Android
 *    costs far more than three clips downloading. The inactive ones are paused.
 * 2. **It refuses to load itself when that would be rude.** Under
 *    `prefers-reduced-motion`, on a metered connection, or on a connection
 *    reporting 2G/3G, no video is fetched at all — the poster frames stand in,
 *    and the page is exactly as complete. This is the site's audience: the
 *    performance budget assumes Indian mobile networks.
 * 3. **A wash sits over the top.** Text contrast has to hold against whatever
 *    frame happens to be behind it, and a video is a moving background whose
 *    luminance cannot be checked at build time. The wash keeps the effective
 *    background near Paper, so the measured contrast is the measured contrast
 *    regardless of frame.
 */
export default function VideoBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const wash = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layers = videos.current.filter(Boolean) as HTMLVideoElement[];
    if (layers.length !== BACKDROPS.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Poster frames render from the markup, so the backdrop is already correct
    // before any of this runs, and stays correct if it never does.
    if (reduceMotion.matches) {
      gsap.set(layers[0], { opacity: 1 });
      gsap.set(wash.current, { opacity: BACKDROPS[0].wash });
      return;
    }

    let active = -1;
    let videoAllowed = connectionAllowsVideo();

    const activate = (index: number) => {
      if (index === active) return;
      active = index;

      layers.forEach((video, i) => {
        if (i === index && videoAllowed) {
          // Sources are attached on demand: with preload="none" nothing is
          // fetched until this runs. Assigning src is not enough on its own —
          // the element has to be told to load before it will play, and
          // play() on an unbuffered element rejects silently.
          if (!video.src) {
            // WebM where it is supported, MP4 for Safari. Choosing here rather
            // than with <source> children keeps the clip off the network until
            // this moment; a <source> would be fetched eagerly.
            const webm = video.dataset.webm ?? "";
            const mp4 = video.dataset.mp4 ?? "";
            const preferWebm =
              webm && video.canPlayType('video/webm; codecs="vp9"') !== "";
            video.src = preferWebm ? webm : mp4;
            video.load();
          }
          const start = () =>
            void video.play().catch(() => {
              /* Autoplay refused by policy; the poster frame stands in. */
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

      // The wash travels with the crossfade, because each clip needs a
      // different amount of it to land text at the same contrast.
      gsap.to(wash.current, {
        opacity: BACKDROPS[index].wash,
        duration: 0.9,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    };

    activate(0);

    // Scroll position, in pixels, at which each clip takes over. Measured from
    // the anchor elements rather than split evenly, so the change lands on a
    // landmark the reader can see — #sea-level literally says so.
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
        // Hand over once the anchor has risen to the middle of the viewport:
        // the reader is looking at it as the backdrop changes beneath it.
        return Math.min(maxScroll, Math.max(0, top - window.innerHeight * 0.5));
      });
      // Force it monotonic. An anchor that ends up out of order — a section
      // moved, a selector pointing somewhere unexpected — would otherwise make
      // a clip unreachable rather than merely mistimed.
      for (let i = 1; i < handover.length; i += 1) {
        handover[i] = Math.max(handover[i], handover[i - 1] + 1);
      }
    };

    measure();

    // Anchors sit below a pinned section, so their document offsets are only
    // final once ScrollTrigger has laid out its pin spacers.
    ScrollTrigger.addEventListener("refresh", measure);

    const trigger = ScrollTrigger.create({
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

    // A visitor who walks off Wi-Fi mid-page should stop paying for clips.
    // Re-running activate with the current index applies the new answer in
    // both directions: it stops playback on the way down, and starts the
    // right clip on the way back up.
    const unwatch = watchConnection(() => {
      const next = connectionAllowsVideo();
      if (next === videoAllowed) return;
      videoAllowed = next;
      const current = active;
      active = -1;
      if (!next) layers.forEach((v) => v.pause());
      activate(current === -1 ? 0 : current);
    });

    return () => {
      ScrollTrigger.removeEventListener("refresh", measure);
      trigger.kill();
      unwatch();
      layers.forEach((v) => v.pause());
    };
  }, []);

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {BACKDROPS.map((backdrop, i) => (
        <video
          key={backdrop.name}
          ref={(el) => {
            videos.current[i] = el;
          }}
          data-webm={asset(`/video/${backdrop.name}.webm`)}
          data-mp4={asset(`/video/${backdrop.name}.mp4`)}
          poster={asset(`/video/${backdrop.name}.jpg`)}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: i === 0 ? 1 : 0 }}
        />
      ))}

      {/* The wash. Without it, text contrast would depend on which frame
          happens to be behind it at the moment someone reads. Its strength is
          per clip and travels with the crossfade. */}
      <div
        ref={wash}
        className="absolute inset-0 bg-paper"
        style={{ opacity: BACKDROPS[0].wash }}
      />
    </div>
  );
}
