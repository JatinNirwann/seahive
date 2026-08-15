/**
 * Contrast against what is actually painted, not against the CSS cascade.
 *
 *   node scripts/verify-backdrop.mjs [baseUrl]
 *
 * The main contrast probe in verify.mjs walks an element's ANCESTORS to work
 * out what is behind it. The video backdrop is a sibling of the content, not an
 * ancestor, so that probe cannot see it: it reads the body's Paper and passes,
 * no matter what is playing. That is a blind spot exactly where the risk is —
 * a moving background is the one background whose luminance is not knowable
 * from the stylesheet.
 *
 * So this measures pixels. It hides every glyph, screenshots what remains, and
 * samples the real luminance under each text block. The worst pixel in that
 * region is then contrasted against the text colour, which is the honest
 * worst case a reader can land on mid-playback.
 */

import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.argv[2] ?? "http://localhost:4321/";
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const WIDTH = 1440;
const HEIGHT = 900;

/** Scroll positions, as a share of the document, covering all three clips. */
const STOPS = [0, 0.2, 0.45, 0.7, 0.92];

const srgbToLinear = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = (r, g, b) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
const contrast = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(4200);

const failures = [];
let sampled = 0;
let worst = { ratio: Infinity };

for (const stop of STOPS) {
  await page.evaluate((s) => {
    window.scrollTo(0, document.body.scrollHeight * s);
  }, stop);
  // Long enough for the crossfade to settle and the clip to be playing.
  await page.waitForTimeout(2400);

  // Every text block currently on screen, with its colour and box.
  const blocks = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("");
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;

      // Clip to the viewport on all four sides. Deriving width from a
      // negative left — which happens the moment a panel is scrolled past
      // the left edge — stretches the sample box across the whole screen and
      // reports the darkest pixel anywhere on it as this text's background.
      const left = Math.max(0, Math.round(r.left));
      const top = Math.max(0, Math.round(r.top));
      const right = Math.min(window.innerWidth, Math.round(r.right));
      const bottom = Math.min(window.innerHeight, Math.round(r.bottom));

      out.push({
        text: own.slice(0, 36),
        color: cs.color,
        large: size >= 24 || (size >= 18.66 && weight >= 700),
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
      });
    }
    return out;
  });

  // Hide the glyphs so the screenshot is purely what sits behind them.
  await page.addStyleTag({
    content: "body * { color: transparent !important; }",
    // Tag is removed below so later stops re-measure real colours.
  });
  await page.waitForTimeout(120);
  const shot = await page.screenshot({ type: "png" });
  await page.evaluate(() => {
    const tags = document.querySelectorAll("style");
    tags[tags.length - 1]?.remove();
  });

  const { data, info } = await sharp(shot)
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (const b of blocks) {
    if (b.w <= 0 || b.h <= 0) continue;
    const m = b.color.match(/-?[\d.]+/g);
    if (!m) continue;
    const alpha = m[3] !== undefined ? parseFloat(m[3]) : 1;
    // Composite the text colour over its own backdrop later; sample first.
    let lo = 1;
    let hi = 0;
    // Sampling a grid rather than every pixel: enough to catch a dark cloud
    // edge under a headline without decoding megapixels per block.
    const stepX = Math.max(1, Math.floor(b.w / 24));
    const stepY = Math.max(1, Math.floor(b.h / 12));
    for (let y = b.y; y < b.y + b.h && y < info.height; y += stepY) {
      for (let x = b.x; x < b.x + b.w && x < info.width; x += stepX) {
        const i = (y * info.width + x) * info.channels;
        const l = luminance(data[i], data[i + 1], data[i + 2]);
        if (l < lo) lo = l;
        if (l > hi) hi = l;
      }
    }

    const textL = luminance(
      parseFloat(m[0]),
      parseFloat(m[1]),
      parseFloat(m[2]),
    );
    // Worst case is whichever extreme of the background sits closest to the
    // text's own luminance.
    const ratio = Math.min(contrast(textL, lo), contrast(textL, hi));
    const required = b.large ? 3 : 4.5;
    sampled++;
    if (ratio < worst.ratio) worst = { ratio, text: b.text, stop, required };
    if (ratio < required && alpha > 0.05) {
      failures.push({
        stop,
        text: b.text,
        ratio: Number(ratio.toFixed(2)),
        required,
      });
    }
  }
}

await browser.close();

console.log(
  `Sampled ${sampled} text blocks across ${STOPS.length} scroll positions, against real pixels.`,
);
console.log(
  `Worst measured: ${worst.ratio.toFixed(2)}:1 (needs ${worst.required}) on "${worst.text}" at ${Math.round(worst.stop * 100)}% scroll`,
);

if (failures.length) {
  console.log(`\nFAIL  ${failures.length} block(s) below AA over the backdrop:`);
  for (const f of failures.slice(0, 12)) {
    console.log(
      `  ${f.ratio}:1 needs ${f.required} — "${f.text}" at ${Math.round(f.stop * 100)}%`,
    );
  }
  process.exit(1);
}

console.log("\nPASS  every sampled text block clears AA against the live backdrop");
