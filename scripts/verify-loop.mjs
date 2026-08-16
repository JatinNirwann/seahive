/**
 * Do the backdrop clips actually loop, and do they loop the right way?
 *
 *   node scripts/verify-loop.mjs
 *
 * Two different loop bugs have shipped on this page, and neither was caught by
 * anything except a person watching the screen long enough to notice:
 *
 *   1. A raw generated clip ends on an unrelated frame, so `<video loop>` cuts
 *      hard from the last frame back to the first. A visible jump arrives
 *      behind the reader's text every few seconds.
 *   2. The ping-pong fix removed that jump by playing the clip forward and
 *      then backward. No join anywhere — but the motion reverses, and cloud
 *      running backwards is quite as noticeable as the cut it replaced.
 *
 * Both are measured here, because they are not the same defect and neither
 * metric can see the other one.
 *
 * SEAM is the picture difference across the wrap: the last frame against the
 * first, which is exactly the step `loop` performs. It is judged against the
 * median difference between ordinary neighbouring frames, because the question
 * is not whether the wrap is small in absolute terms — it is whether the wrap
 * is larger than an ordinary frame advance. A clip whose seam matches its own
 * baseline wraps invisibly however fast the footage moves.
 *
 * MIRROR is whether the clip turns round and plays itself backwards. For every
 * candidate turning point it compares frames an equal distance either side and
 * keeps the best score. A ping-pong is near-perfectly symmetric about its
 * turning point, so those pairs come back MORE alike than ordinary neighbours
 * — which is only possible if they are the same footage twice. Forward footage
 * scores far below its own neighbour baseline, because frames a second apart
 * are simply unrelated.
 *
 * The turning point is searched for rather than assumed to be the midpoint,
 * and near-duplication is measured rather than frame identity. Both matter:
 * re-encoding a ping-pong at a different frame rate resamples the timeline,
 * which moves the turn off centre and destroys frame-exact mirroring while
 * leaving the reversal perfectly visible. That is not hypothetical — it is
 * what the shipped clips did, and a naive mirror test scored them clean.
 *
 * Global drift is reported alongside but is not the verdict. These clips lock
 * their subject in frame — the aircraft and the ship are motionless within the
 * picture, and only the cloud and water behind them move — so whole-frame
 * translation is close to zero whichever way the clip is playing.
 *
 * Measured on the shipped files in public/video, after grading and after any
 * loop processing, because that is what a reader's browser actually plays.
 */

import { execFileSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { BACKDROPS } from "../content/backdrops.ts";

const FFMPEG = ffmpegPath;
const DIR = "public/video";

/**
 * Frames are compared as small greyscale thumbnails rather than at full size.
 * Every pair is measured at the same scale so the comparisons hold against
 * each other, and the whole clip fits in memory as one buffer — which is what
 * makes the translation search affordable.
 */
const W = 80;
const H = 45;
const FRAME = W * H;

/** Translation search range, in thumbnail pixels. 8 here is 128 at 1280 wide. */
const MAX_DX = 8;
const MAX_DY = 3;

/**
 * How far below its own baseline a seam may sit, in dB.
 *
 * PSNR is logarithmic, so 3 dB is twice the squared error of an ordinary frame
 * step. A wrap inside that is doing nothing more violent than the footage does
 * to itself every 1/24 of a second.
 */
const SEAM_TOLERANCE_DB = 3;

/**
 * A turning point needs this many frames either side before the symmetry
 * around it means anything.
 */
const MIN_MIRROR_SPAN = 24;

/**
 * How far above the neighbour baseline a mirrored pair has to score before the
 * clip is called a ping-pong.
 *
 * Zero would already be damning — frames a second apart being as alike as
 * adjacent ones cannot happen in forward footage — so this is margin against
 * measurement noise on very still clips, not a judgement call.
 */
const MIRROR_MARGIN_DB = 1;

/** One ffmpeg pass per clip: every frame, greyscale, thumbnail-sized, raw. */
function readFrames(file) {
  const raw = execFileSync(
    FFMPEG,
    ["-v", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`,
     "-f", "rawvideo", "-pix_fmt", "gray", "-"],
    { maxBuffer: 1 << 28 },
  );
  const count = Math.floor(raw.length / FRAME);
  return Array.from({ length: count }, (_, i) =>
    raw.subarray(i * FRAME, (i + 1) * FRAME));
}

function mse(a, b) {
  let sum = 0;
  for (let i = 0; i < FRAME; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum / FRAME;
}

const psnr = (a, b) => {
  const m = mse(a, b);
  return m === 0 ? Infinity : 10 * Math.log10((255 * 255) / m);
};

/** Mean squared error with `b` shifted by (dx, dy), over the overlap only. */
function shiftedMse(a, b, dx, dy) {
  const x0 = Math.max(0, -dx);
  const x1 = Math.min(W, W - dx);
  const y0 = Math.max(0, -dy);
  const y1 = Math.min(H, H - dy);
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    const ra = y * W;
    const rb = (y + dy) * W + dx;
    for (let x = x0; x < x1; x += 1) {
      const d = a[ra + x] - b[rb + x];
      sum += d * d;
      n += 1;
    }
  }
  return n ? sum / n : Infinity;
}

/**
 * The translation that best aligns `b` onto `a`, to the nearest pixel, refined
 * to a fraction of one by fitting a parabola through the best score and its two
 * neighbours. Sub-pixel matters: these clips drift slowly, and rounding every
 * frame to a whole pixel would quantise most of the signal away.
 */
function bestShift(a, b) {
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (let dy = -MAX_DY; dy <= MAX_DY; dy += 1) {
    for (let dx = -MAX_DX; dx <= MAX_DX; dx += 1) {
      const score = shiftedMse(a, b, dx, dy);
      if (score < best) {
        best = score;
        bx = dx;
        by = dy;
      }
    }
  }
  let refined = bx;
  if (bx > -MAX_DX && bx < MAX_DX) {
    const left = shiftedMse(a, b, bx - 1, by);
    const right = shiftedMse(a, b, bx + 1, by);
    const denom = left - 2 * best + right;
    if (denom > 0) refined = bx + (0.5 * (left - right)) / denom;
  }
  return refined;
}

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const fmt = (db) => (db === Infinity ? "identical" : `${db.toFixed(1)} dB`);

/**
 * The strongest mirror symmetry anywhere in the clip, and where it sits.
 *
 * Every frame is a candidate turning point. Around each, frames an equal
 * distance either side are compared; the median of those scores is how
 * symmetric the clip is about that point. The best score over all candidates
 * is what gets judged, so a turn that resampling has nudged off the midpoint
 * is still found.
 */
function mirrorSymmetry(frames) {
  const n = frames.length;
  let best = -Infinity;
  let bestAt = 0;

  for (let c = MIN_MIRROR_SPAN; c < n - MIN_MIRROR_SPAN; c += 1) {
    const span = Math.min(c, n - 1 - c);
    const scores = [];
    for (let s = 1; s <= 10; s += 1) {
      const d = Math.round((s / 10) * span);
      if (d < 4) continue;
      scores.push(psnr(frames[c - d], frames[c + d]));
    }
    if (!scores.length) continue;
    const score = median(scores);
    if (score > best) {
      best = score;
      bestAt = c;
    }
  }
  return { mirror: best, at: bestAt };
}

function measure(name) {
  const frames = readFrames(`${DIR}/${name}.mp4`);
  const n = frames.length;
  if (n < 16) throw new Error(`${name}: only ${n} frames`);

  // The wrap: the step `loop` cuts across, against what a frame advance costs.
  const seam = psnr(frames[n - 1], frames[0]);
  const steps = [];
  for (let i = 0; i < n - 1; i += 1) steps.push(psnr(frames[i], frames[i + 1]));
  const baseline = median(steps);

  const { mirror, at } = mirrorSymmetry(frames);

  // Signed horizontal velocity, reported for context rather than judged.
  const velocity = [];
  for (let i = 0; i < n - 1; i += 1) {
    velocity.push(bestShift(frames[i], frames[i + 1]));
  }
  const half = velocity.length >> 1;
  const first = median(velocity.slice(0, half));
  const second = median(velocity.slice(half));

  return { name, frames: n, seam, baseline, mirror, at, first, second };
}

function main() {
  const results = BACKDROPS.map((b) => measure(b.name));
  const failures = [];

  const rows = results.map((r) => {
    const floor = r.baseline - SEAM_TOLERANCE_DB;
    const seamOk = r.seam >= floor;

    const reversed = r.mirror >= r.baseline + MIRROR_MARGIN_DB;

    if (!seamOk) {
      failures.push(
        `${r.name}: the wrap jumps. Seam ${fmt(r.seam)} against a ${fmt(r.baseline)} ` +
          `baseline — the cut back to frame one is a bigger change than the footage ` +
          `makes on its own.`,
      );
    }
    if (reversed) {
      failures.push(
        `${r.name}: plays forward then backward. Frames either side of frame ${r.at} ` +
          `match at ${fmt(r.mirror)}, against ${fmt(r.baseline)} between neighbours — ` +
          `footage a second apart cannot be more alike than adjacent frames unless the ` +
          `clip is playing itself in reverse.`,
      );
    }

    return {
      clip: r.name,
      frames: r.frames,
      seam: fmt(r.seam),
      "frame step": fmt(r.baseline),
      mirror: fmt(r.mirror),
      drift: `${r.first.toFixed(2)} / ${r.second.toFixed(2)} px`,
      verdict: !seamOk ? "SEAM JUMPS" : reversed ? "PING-PONG" : "loops",
    };
  });

  console.table(rows);

  if (failures.length) {
    console.error(`\n${failures.length} problem${failures.length > 1 ? "s" : ""}:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nEvery clip wraps forward, with no step larger than its own footage.");
}

main();
