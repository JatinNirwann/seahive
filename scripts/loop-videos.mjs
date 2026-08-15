/**
 * Makes the backdrop clips loop without a visible seam.
 *
 *   node scripts/loop-videos.mjs
 *
 * A generated clip starts and ends on unrelated frames. `<video loop>` then
 * cuts straight from the last frame to the first, and on a five-second clip
 * that jump arrives every five seconds behind the reader's text — which is
 * exactly how a background stops being background.
 *
 * The fix is to build a clip whose last frame already *is* its first frame, so
 * there is nothing to cut to:
 *
 *   original:  |----------------- D -----------------|
 *              [ head ]                      [ tail ]
 *                 X                             X
 *
 *   output:    |-- from X to D --|              (length D - X)
 *              and its final X seconds crossfade into the head
 *
 * The output opens on the original's frame at X and closes on that same frame,
 * having dissolved through the tail on the way. Playback wraps into itself.
 *
 * Cost: X seconds of the clip are spent dissolving, and the loop is X shorter.
 * On atmospheric footage — drifting cloud, moving water — a one-second dissolve
 * is invisible, because there is no hard subject whose position would jump.
 *
 * Run on the ALREADY GRADED files in public/video: the colour work from
 * encode-video.mjs is baked in, so this must not re-grade or it would apply
 * twice.
 */

import { execFileSync } from "node:child_process";
import { rename, stat } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { BACKDROPS } from "../content/backdrops.ts";

const FFMPEG = ffmpegPath;
const DIR = "public/video";

/** Seconds of dissolve. Long enough to hide the join, short enough to keep
    most of the clip as real footage rather than a blend of two moments. */
const CROSSFADE = 1.0;

/** Must match the rate the clips were encoded at in encode-video.mjs. */
const FPS = 24;

const run = (args) =>
  execFileSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });

function probeDuration(file) {
  try {
    execFileSync(FFMPEG, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (error) {
    const text = String(error.stderr);
    const m = text.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (!m) throw new Error(`could not read duration of ${file}`);
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  throw new Error(`ffmpeg did not report on ${file}`);
}

/**
 * `main` is everything after the crossfade point; `head` is the opening slice
 * it dissolves back into. Trimming both from one input keeps this a single
 * pass over the file.
 */
/**
 * Ping-pong: play forward, then backward.
 *
 * The crossfade below removes the hard cut but replaces it with a one-second
 * dissolve between two different arrangements of cloud or water — and a
 * dissolve is itself something to notice, a soft ghosting pulse arriving on a
 * fixed beat. Ping-pong has no blend anywhere: the forward pass ends on the
 * last frame, the reverse pass begins on the frame before it, and the reverse
 * pass ends on frame zero, which is where `loop` restarts. Every join is an
 * ordinary one-frame step.
 *
 * The cost is that motion reverses. On a hard subject that would be absurd, but
 * drifting cloud and moving water have no direction a viewer can name —
 * especially at 20% opacity under a 77% wash. It also doubles the period, so
 * whatever remains is noticed half as often.
 *
 * `select=gt(n,0)` drops the reverse pass's first frame, which is otherwise the
 * forward pass's last frame shown twice.
 */
const pingPongFilter = () =>
  `[0:v]split=2[a][b];` +
  `[b]reverse,select='gt(n\\,0)',setpts=PTS-STARTPTS[r];` +
  `[a][r]concat=n=2:v=1[v]`;

const loopFilter = (duration, x) => {
  const offset = (duration - x - x).toFixed(3);
  // The explicit `fps` on each branch is load-bearing, not tidiness. `trim`
  // followed by `setpts` leaves the stream marked as variable frame rate, and
  // xfade refuses it outright: "The inputs needs to be a constant frame rate;
  // current rate of 1/0 is invalid".
  return (
    `[0:v]split=2[a][b];` +
    `[a]trim=start=${x},setpts=PTS-STARTPTS,fps=${FPS}[main];` +
    `[b]trim=end=${x},setpts=PTS-STARTPTS,fps=${FPS}[head];` +
    `[main][head]xfade=transition=fade:duration=${x}:offset=${offset}[v]`
  );
};

/**
 * Optional clip names to process, e.g. `node scripts/loop-videos.mjs sky sea`.
 *
 * This matters: the operation is not idempotent. Running it twice on the same
 * file spends another second of the clip dissolving and crossfades an already
 * crossfaded tail. Naming the clips is how you re-encode two of them without
 * quietly degrading the third.
 */
const args = process.argv.slice(2);
/** `--pingpong` swaps the crossfade for a forward-then-reverse loop. */
const pingPong = args.includes("--pingpong");
const only = args.filter((a) => !a.startsWith("--"));

async function main() {
  const rows = [];

  for (const backdrop of BACKDROPS) {
    if (only.length && !only.includes(backdrop.name)) continue;
    const mp4 = join(DIR, `${backdrop.name}.mp4`);
    const duration = probeDuration(mp4);

    if (duration <= CROSSFADE * 2.5) {
      console.warn(
        `skip ${backdrop.name} — ${duration.toFixed(2)}s is too short to spend ${CROSSFADE}s dissolving`,
      );
      continue;
    }

    const filter = pingPong ? pingPongFilter() : loopFilter(duration, CROSSFADE);
    const tmpMp4 = join(DIR, `${backdrop.name}.loop.mp4`);
    const tmpWebm = join(DIR, `${backdrop.name}.loop.webm`);

    run([
      "-y",
      "-i", mp4,
      "-filter_complex", filter,
      "-map", "[v]",
      "-an",
      "-c:v", "libx264",
      "-profile:v", "main",
      "-crf", "30",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      tmpMp4,
    ]);

    run([
      "-y",
      "-i", mp4,
      "-filter_complex", filter,
      "-map", "[v]",
      "-an",
      "-c:v", "libvpx-vp9",
      "-crf", "40",
      "-b:v", "0",
      "-row-mt", "1",
      "-deadline", "good",
      "-cpu-used", "2",
      "-pix_fmt", "yuv420p",
      tmpWebm,
    ]);

    await rename(tmpMp4, mp4);
    await rename(tmpWebm, join(DIR, `${backdrop.name}.webm`));

    // The poster is the first frame of the looped clip, which is no longer the
    // first frame of the original. Regenerating it keeps the still and the
    // video the same picture — the whole point of pulling it from the encode.
    const poster = join(DIR, `${backdrop.name}.jpg`);
    run(["-y", "-i", mp4, "-frames:v", "1", "-q:v", "5", poster]);

    rows.push({
      clip: backdrop.name,
      was: `${duration.toFixed(2)}s`,
      now: `${(pingPong ? duration * 2 : duration - CROSSFADE).toFixed(2)}s`,
      mp4: `${((await stat(mp4)).size / 1024).toFixed(0)} KB`,
      webm: `${((await stat(join(DIR, `${backdrop.name}.webm`))).size / 1024).toFixed(0)} KB`,
    });
  }

  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
