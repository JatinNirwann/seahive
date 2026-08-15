/**
 * Prepares the backdrop clips for the web.
 *
 *   node scripts/encode-video.mjs <source-dir>
 *
 * Source clips arrive at 720p with far more bitrate than a background needs.
 * These sit behind a 78% wash at low contrast, so detail that survives the
 * wash is the only detail worth paying for — and the audience is on Indian
 * mobile networks, where every one of these megabytes is the budget.
 *
 * Each clip becomes:
 *   - a WebM (VP9), which is smaller at equal quality and what most browsers
 *     will pick
 *   - an MP4 (H.264, faststart) for Safari, which does not take VP9 in this
 *     context, so shipping only WebM would leave every iPhone on the poster
 *   - a JPEG poster, which is what a metered or reduced-motion visitor sees
 *     instead of the video, and what renders before playback starts
 */

import { execFileSync } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { BACKDROPS } from "../content/backdrops.ts";

import ffmpegPath from "ffmpeg-static";

// Playwright ships a stripped ffmpeg that cannot demux MP4, so the real one
// comes from ffmpeg-static.
const FFMPEG = ffmpegPath;
const SOURCE = process.argv[2];
const OUT = "public/video";

/** Wider than a phone, small enough to decode cheaply on one. */
const WIDTH = 1280;
/** Background motion does not need 30fps, and halving it halves the work. */
const FPS = 24;
/** These sit under a 78% wash, which flattens them. Contrast is added back
    here so there is something left to see once it does — a pale clip at low
    contrast disappears under any wash strong enough to keep text readable. */
const CONTRAST = 1.35;
const BRIGHTNESS = -0.06;
/** Saturation is per clip; see content/backdrops.ts. */
const grade = (saturation) =>
  `eq=contrast=${CONTRAST}:brightness=${BRIGHTNESS}:saturation=${saturation}`;

const run = (args) => execFileSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });

async function main() {
  if (!SOURCE) throw new Error("usage: node scripts/encode-video.mjs <dir>");
  await mkdir(OUT, { recursive: true });

  const available = await readdir(SOURCE);
  const rows = [];

  for (const backdrop of BACKDROPS) {
    const input = join(SOURCE, `${backdrop.name}.mp4`);
    if (!available.includes(`${backdrop.name}.mp4`)) {
      console.warn(`skip ${backdrop.name} — not in ${SOURCE}`);
      continue;
    }

    const mp4 = join(OUT, `${backdrop.name}.mp4`);
    run([
      "-y",
      "-i", input,
      "-an",                                   // silent: it is wallpaper
      // Graded to sit inside the page's cold neutral palette. The road clip in
      // particular arrives warm and sandy, and a warm cast drifting behind
      // graphite type is the fastest way to undo the palette work.
      "-vf", `scale=${WIDTH}:-2,fps=${FPS},${grade(backdrop.saturation)}`,
      "-c:v", "libx264",
      "-profile:v", "main",
      "-crf", "30",                            // generous: it sits under a wash
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      mp4,
    ]);

    const webm = join(OUT, `${backdrop.name}.webm`);
    run([
      "-y",
      "-i", input,
      "-an",
      "-vf", `scale=${WIDTH}:-2,fps=${FPS},${grade(backdrop.saturation)}`,
      "-c:v", "libvpx-vp9",
      "-crf", "40",
      "-b:v", "0",
      "-row-mt", "1",
      "-deadline", "good",
      "-cpu-used", "2",
      "-pix_fmt", "yuv420p",
      webm,
    ]);

    // The poster is pulled from the ENCODED clip, not the source. It is what
    // stands in when video is withheld, so it has to be the same picture the
    // video would have shown — same size, same grade, same first frame — not
    // merely a similar one.
    const poster = join(OUT, `${backdrop.name}.jpg`);
    run(["-y", "-i", mp4, "-frames:v", "1", "-q:v", "5", poster]);

    rows.push({
      clip: backdrop.name,
      webm: `${((await stat(webm)).size / 1024).toFixed(0)} KB`,
      mp4: `${((await stat(mp4)).size / 1024).toFixed(0)} KB`,
      poster: `${((await stat(poster)).size / 1024).toFixed(0)} KB`,
    });
  }

  console.table(rows);
  // Only one of the two encodings is ever fetched, so the number that matters
  // is the larger single format, not their sum.
  const webmTotal = rows.reduce((sum, r) => sum + parseInt(r.webm, 10), 0);
  const mp4Total = rows.reduce((sum, r) => sum + parseInt(r.mp4, 10), 0);
  console.log(`${webmTotal} KB of WebM, ${mp4Total} KB of MP4 — a visitor fetches one set`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
