/**
 * The scroll-driven backdrop clips, top of page to bottom.
 *
 * Atmosphere behind the type, never the subject of it. Order matters: the
 * index of each entry is the band of the page it plays over, so the sequence
 * reads sky, road, sea as the reader descends.
 *
 * Each clip loops natively: it was generated with the same still passed as
 * both the first and the last frame, so it closes on the picture it opened
 * with and `<video loop>` has nothing to cut across. Do not add an ffmpeg
 * looping pass on top — a crossfade puts a dissolve on a fixed beat, and a
 * ping-pong reverses the motion, which is what shipped before and what the
 * client rejected. `npm run verify:loop` measures both.
 *
 * A note for whoever replaces these. Every clip here is generated, and
 * generated freight equipment is the one thing `BRIEF.md` rules out by name —
 * wrong door hardware, impossible wheel counts, invented airline liveries. The
 * prompts asked for distance, silhouettes and no markings precisely to keep
 * that failure small, but distance is a mitigation, not a fix. Real footage of
 * Seahive's own cargo would retire the risk entirely, and would be the single
 * highest-value swap on the page.
 */

export interface Backdrop {
  /** Base filename in public/video, without extension. */
  name: string;
  /** What it shows, for whoever comes to replace it. */
  note: string;
  /**
   * CSS selector for the element this clip takes over at. Omitted on the first
   * clip, which starts at the top of the document by definition.
   *
   * Anchoring the change to a landmark rather than to a fraction of the
   * document is what lets the page say "sea level" out loud at the exact point
   * the sea arrives: add a section anywhere above and the two still agree,
   * where a hard-coded fraction would quietly drift apart. If the selector
   * matches nothing the band falls back to its even share of the scroll, so a
   * renamed section degrades rather than breaks.
   */
  anchor?: string;
  /**
   * Saturation applied at encode. The sky and sea are meant to read blue, so
   * they keep theirs; the road arrives warm and sandy, and a warm cast
   * drifting behind graphite type is the fastest way to undo the palette work.
   */
  saturation: number;
  /**
   * How strongly Paper is washed over this clip, 0-1.
   *
   * One global value cannot serve all three: bright cloud needs far less
   * covering than deep navy to land text at the same contrast. Measured with
   * `npm run verify:backdrop` rather than chosen by eye — these are the
   * lowest values at which every text block over each clip clears AA, so the
   * clip is as visible as readability allows and no more.
   */
  wash: number;
}

export const BACKDROPS: Backdrop[] = [
  {
    name: "sky",
    note: "Cloud drift under light blue sky, aircraft at mid distance.",
    saturation: 1,
    // Raised from 0.77 when the clip was replaced with a closer, brighter
    // aircraft: the services intro measured 4.09:1 against a 4.5 bar over it.
    // The wash is per clip precisely so a swapped clip is a one-number fix.
    wash: 0.86,
  },
  {
    name: "road",
    note: "Unmarked container truck on an open highway.",
    // The lane table is where the page stops talking about itself and starts
    // listing overland and port-to-port movement.
    anchor: "#lanes",
    // Cut from 0.6 when the clip was regenerated to loop. The replacement
    // arrives with a green-grey cast rather than the old sandy one, and 0.6
    // left it measurably twice as far from neutral as the clip it replaced
    // (chroma distance 3.66 against 1.90). 0.35 puts it back at 2.47 — a
    // second hue drifting behind graphite type is what the brief rules out,
    // and green is no more allowed than amber.
    saturation: 0.35,
    wash: 0.85,
  },
  {
    name: "sea",
    note: "Aerial drift over deep blue open ocean.",
    // The waterline. The line rendered on that element announces this change,
    // so the two are driven by the same element rather than kept in step by
    // hand.
    anchor: "#sea-level",
    saturation: 1,
    // Deepest clip on the page, so the heaviest wash.
    wash: 0.88,
  },
];
