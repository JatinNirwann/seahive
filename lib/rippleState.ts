import { gsap } from "./gsap";

/**
 * The single piece of state the ripple system animates.
 *
 * Everything on the page that wants to influence the waves writes here; the
 * one renderer in RippleSystem reads it. Keeping it in a module rather than in
 * React state matters: these values change on every scroll frame, and routing
 * that through a re-render would put the whole component tree on the critical
 * path of a 60fps loop.
 */
export const rippleState = {
  /** Advances with scroll position. The lines travel. */
  phase: 0,
  /** 0–1, set per section. High through ocean freight, zero through customs. */
  amplitude: 0.55,
  /** 0 = hexagon (the mark), 1 = unspooled into route lines. */
  hexT: 0,
};

let dirty = true;

export const markRippleDirty = () => {
  dirty = true;
};

/** True once per frame at most, so the renderer can skip idle frames. */
export const consumeRippleDirty = () => {
  const was = dirty;
  dirty = false;
  return was;
};

/**
 * Sections call this on entry rather than setting `amplitude` directly, so the
 * change eases in over a beat instead of stepping at the section boundary.
 */
export function setRippleAmplitude(value: number, duration = 0.9) {
  gsap.to(rippleState, {
    amplitude: value,
    duration,
    ease: "power2.out",
    overwrite: "auto",
    onUpdate: markRippleDirty,
  });
}
