/**
 * The ripple system's geometry.
 *
 * The Seahive mark is seven stacked sine waves whose horizontal extents narrow
 * toward the top and bottom, forming a hexagonal silhouette — sea, plus hive
 * cell. Every proportion below is measured off the mark itself rather than
 * invented, so the waves running behind the page are the logo's own geometry
 * rather than a lookalike.
 *
 * Nothing here touches the DOM. Paths are generated from the sine on every
 * frame, never interpolated between fixed keyframes and never animated as a
 * string attribute, which is what makes the deformation continuous instead of
 * a crossfade between two poses.
 */

export const WAVE_COUNT = 7;

/** Index of the widest, middle wave. */
const MID = (WAVE_COUNT - 1) / 2;

/* Ratios read off the mark ------------------------------------------------ */

/** Half-widths run 47.5 → 26.66 across three steps: 14.62% narrower per step. */
const HEX_NARROW_PER_STEP = 0.1462;
/** Rows sit 12.667 apart against a 47.5 half-width. */
const HEX_ROW_GAP = 0.2667;
/** Full wavelength is 38 against a 47.5 half-width. */
const HEX_WAVELENGTH = 0.8;
/** Peak amplitude, once the mark's cubic control offset is resolved. */
const HEX_AMPLITUDE = 0.0546;
/** Stroke weights 4.6 → 6.6 across the stack, against a 47.5 half-width. */
const HEX_STROKE_MIN = 0.0968;
const HEX_STROKE_MAX = 0.1389;

/* Unspooled state --------------------------------------------------------- */

/** Wider than the viewport, so the lines run off both edges. */
const OPEN_HALF_WIDTH = 0.62;
/** Long, lazy route waves rather than the mark's tight ripple. */
const OPEN_WAVELENGTH = 0.42;
/** Seven rows spread across roughly the middle two thirds of the viewport. */
const OPEN_ROW_GAP = 0.115;
/** Ceiling for the scroll-driven amplitude, as a share of viewport height. */
const OPEN_AMPLITUDE = 0.038;

/** Samples per wavelength. Tangents are exact, so this can stay low. */
const SAMPLES_PER_PERIOD = 6;
const MIN_SAMPLES = 6;
const MAX_SAMPLES = 96;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The hexagon's radius: its widest half-width, in pixels.
 *
 * Deliberately smaller than it wants to be. The mark's stroke weights are
 * proportional to this radius, and they are drawn for a logo — scale the
 * hexagon to fill a viewport and those same proportions give 30px strokes that
 * merge into a blob and shout over the headline. At this size the silhouette
 * still reads as a hive cell while the linework stays fine enough to sit
 * behind type.
 */
export function hexRadius(w: number, h: number): number {
  return Math.min(w, h) * 0.18;
}

/**
 * Resolved geometry for one wave at one point in the hexagon → unspooled morph.
 * Exported so the renderer can size strokes without recomputing the path.
 */
export interface WaveMetrics {
  /** Vertical centre line of this wave, in pixels. */
  baseline: number;
  /** Distance from the horizontal centre to each end, in pixels. */
  halfWidth: number;
  /** Peak displacement from the baseline, in pixels. */
  amplitude: number;
  /** Full wavelength, in pixels. */
  wavelength: number;
  /** Stroke weight, in pixels. */
  stroke: number;
}

/**
 * @param index      0–6, top to bottom.
 * @param amplitude  0–1. Scroll-driven. Rises through ocean freight, falls to
 *                   zero through customs and compliance, where the subject is
 *                   precision rather than movement.
 * @param hexT       0 = hexagon (the mark), 1 = unspooled (parallel route
 *                   lines running off both edges).
 */
export function waveMetrics(
  index: number,
  amplitude: number,
  hexT: number,
  w: number,
  h: number,
): WaveMetrics {
  const r = hexRadius(w, h);
  const distanceFromMid = Math.abs(index - MID);

  const hexHalfWidth = r * (1 - HEX_NARROW_PER_STEP * distanceFromMid);
  const halfWidth = lerp(hexHalfWidth, w * OPEN_HALF_WIDTH, hexT);

  const rowGap = lerp(r * HEX_ROW_GAP, h * OPEN_ROW_GAP, hexT);
  const baseline = h / 2 + (index - MID) * rowGap;

  // In the hexagon the amplitude is the mark's own; unspooled it is whatever
  // the scroll position asks for.
  const openAmplitude = h * OPEN_AMPLITUDE * amplitude;
  const amp = lerp(r * HEX_AMPLITUDE, openAmplitude, hexT);

  const wavelength = lerp(r * HEX_WAVELENGTH, w * OPEN_WAVELENGTH, hexT);

  // Thickest through the middle of the stack, as in the mark. Held roughly
  // constant in pixels once unspooled so the lines stay hairline-fine.
  const strokeRatio = lerp(
    HEX_STROKE_MAX,
    HEX_STROKE_MIN,
    distanceFromMid / MID,
  );
  const stroke = lerp(r * strokeRatio, 1.5, hexT);

  return { baseline, halfWidth, amplitude: amp, wavelength, stroke };
}

/**
 * The `d` attribute for one wave.
 *
 * Sampled from the sine, then joined with cubic segments whose control points
 * come from the analytic derivative. Because the tangents are exact rather
 * than estimated, six samples per wavelength is already visually smooth, which
 * keeps this cheap enough to run for all seven waves on every scroll frame.
 */
export function wavePath(
  index: number,
  phase: number,
  amplitude: number,
  hexT: number,
  w: number,
  h: number,
): string {
  return pathFromMetrics(waveMetrics(index, amplitude, hexT, w, h), index, phase, w);
}

/**
 * The same path, from metrics already in hand. The renderer needs the stroke
 * weight anyway, so this lets it resolve the geometry once per wave per frame
 * instead of twice.
 */
export function pathFromMetrics(
  m: WaveMetrics,
  index: number,
  phase: number,
  w: number,
): string {
  const cx = w / 2;
  const left = cx - m.halfWidth;
  const span = m.halfWidth * 2;

  if (span <= 0 || !Number.isFinite(span)) return "";

  const k = (Math.PI * 2) / m.wavelength;
  // Adjacent waves run in antiphase — the interlock is what reads as a hive
  // cell rather than a stack of parallel ripples.
  const offset = phase + index * Math.PI;

  const periods = span / m.wavelength;
  const segments = Math.min(
    MAX_SAMPLES,
    Math.max(MIN_SAMPLES, Math.ceil(periods * SAMPLES_PER_PERIOD)),
  );
  const step = span / segments;

  const yAt = (x: number) => m.baseline + m.amplitude * Math.sin((x - cx) * k + offset);
  const slopeAt = (x: number) => m.amplitude * k * Math.cos((x - cx) * k + offset);

  const r = (n: number) => Math.round(n * 10) / 10;

  let x1 = left;
  let y1 = yAt(x1);
  let s1 = slopeAt(x1);
  let d = `M${r(x1)} ${r(y1)}`;

  for (let i = 1; i <= segments; i++) {
    const x2 = left + step * i;
    const y2 = yAt(x2);
    const s2 = slopeAt(x2);
    const third = step / 3;

    d += `C${r(x1 + third)} ${r(y1 + s1 * third)} ${r(x2 - third)} ${r(y2 - s2 * third)} ${r(x2)} ${r(y2)}`;

    x1 = x2;
    y1 = y2;
    s1 = s2;
  }

  return d;
}

/**
 * A single low-amplitude wave, used in place of a horizontal rule between
 * sections. `index` carries the section's position in the page, so the divider
 * between two sections is a specific one of the seven rather than a generic
 * squiggle.
 */
export function dividerPath(
  index: number,
  w: number,
  h: number,
  amplitude = 0.55,
): string {
  const k = (Math.PI * 2) / (w / 2.4);
  const offset = index * Math.PI * 0.5;
  const mid = h / 2;
  const amp = (h / 2 - 1) * amplitude;
  const segments = 14;
  const step = w / segments;

  const yAt = (x: number) => mid + amp * Math.sin(x * k + offset);
  const slopeAt = (x: number) => amp * k * Math.cos(x * k + offset);
  const r = (n: number) => Math.round(n * 100) / 100;

  let x1 = 0;
  let y1 = yAt(0);
  let s1 = slopeAt(0);
  let d = `M${r(x1)} ${r(y1)}`;

  for (let i = 1; i <= segments; i++) {
    const x2 = step * i;
    const y2 = yAt(x2);
    const s2 = slopeAt(x2);
    const third = step / 3;
    d += `C${r(x1 + third)} ${r(y1 + s1 * third)} ${r(x2 - third)} ${r(y2 - s2 * third)} ${r(x2)} ${r(y2)}`;
    x1 = x2;
    y1 = y2;
    s1 = s2;
  }

  return d;
}
