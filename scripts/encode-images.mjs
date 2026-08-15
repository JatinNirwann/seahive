/**
 * Encodes the atmospheric plates to AVIF with a WebP fallback.
 *
 * These are backdrops, not subjects: every one of them sits under an Ink
 * overlay at 80% and behind the ripple system. They are pre-darkened here
 * rather than in CSS so the browser never decodes brightness it is about to
 * throw away, and so the near-black frames compress to a few kilobytes each.
 *
 *   node scripts/encode-images.mjs <source-dir>
 */

import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SOURCE = process.argv[2];
const OUT = "public/img";

/** width, and how far to pull the plate down before it goes under the overlay */
const PLATES = [
  // Near-white still water, fine ripple grain. Used behind the hero at very
  // low strength — on a light ground the texture has to read as paper grain,
  // not as a photograph, or it drags the page back down-market.
  { in: "L3.png", out: "still", width: 1800, brightness: 1.02 },
  // Pale water sheen for the lane section.
  { in: "L1.png", out: "sheen", width: 1800, brightness: 1.02 },
];

async function main() {
  if (!SOURCE) throw new Error("usage: node scripts/encode-images.mjs <dir>");
  await mkdir(OUT, { recursive: true });

  const found = await readdir(SOURCE);
  const results = [];

  for (const plate of PLATES) {
    if (!found.includes(plate.in)) {
      console.warn(`skip ${plate.in} — not in ${SOURCE}`);
      continue;
    }

    let pipeline = sharp(join(SOURCE, plate.in));

    if (plate.trimBars) {
      const { width, height } = await pipeline.metadata();
      // Trim ~8% off the top and bottom, which is where the bars sit.
      const cut = Math.round(height * 0.085);
      pipeline = pipeline.extract({
        left: 0,
        top: cut,
        width,
        height: height - cut * 2,
      });
    }

    pipeline = pipeline
      .resize({ width: plate.width, withoutEnlargement: true })
      .modulate({ brightness: plate.brightness, saturation: 0.9 });

    const base = join(OUT, plate.out);
    const avif = await pipeline
      .clone()
      .avif({ quality: 42, effort: 6 })
      .toFile(`${base}.avif`);
    const webp = await pipeline
      .clone()
      .webp({ quality: 62 })
      .toFile(`${base}.webp`);

    results.push({
      plate: plate.out,
      size: `${avif.width}x${avif.height}`,
      avif: `${(avif.size / 1024).toFixed(1)} KB`,
      webp: `${(webp.size / 1024).toFixed(1)} KB`,
    });
  }

  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
