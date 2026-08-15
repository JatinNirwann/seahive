/**
 * Checks the single-file build actually works, offline.
 *
 *   node scripts/verify-standalone.mjs <standalone.html>
 *
 * The standalone exists so the site can be opened somewhere with no server and
 * a content security policy that blocks external origins. Two things therefore
 * have to hold, and neither is safe to assume:
 *
 *   1. It makes no network requests at all. Anything left pointing at a
 *      sibling file is a blank space wherever it finally gets hosted.
 *   2. Its behaviour layer really drives the page. The markup is prerendered,
 *      so a page that has silently lost its JavaScript still looks finished in
 *      a screenshot while the ripple sits dead and the backdrop never moves.
 *
 * So this loads the file over file:// and scrolls the whole page, to make the
 * scrubbed and batched triggers actually run.
 */

import { chromium } from "playwright";
import { resolve } from "node:path";

const target = resolve(process.argv[2] ?? "out/standalone.html");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
const external = [];
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`CONSOLE: ${m.text()}`));
page.on("request", (r) => {
  const url = r.url();
  if (!/^(data|file|blob):/.test(url)) external.push(url);
});

await page.goto(`file://${target}`, { waitUntil: "load" });
// Long enough for the preloader to finish and hand over to the hero.
await page.waitForTimeout(4200);

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* The ripple is the signature element; a dead one is the loudest failure. */
const ripple = await page.evaluate(() => {
  const svg = document.querySelector("svg[aria-hidden='true']");
  const paths = svg ? [...svg.querySelectorAll("path")] : [];
  return {
    count: paths.length,
    hasGeometry: Boolean(paths[0]?.getAttribute("d")),
    opacity: svg ? getComputedStyle(svg).opacity : null,
  };
});
check(
  "Ripple system is generating geometry",
  ripple.count === 7 && ripple.hasGeometry,
  `${ripple.count} paths, opacity ${ripple.opacity}`,
);

/* Fonts: the display face carries a width axis, and losing it is invisible in
   a passing render but obvious to the eye. */
const type = await page.evaluate(() => {
  const h1 = document.querySelector("h1");
  const cs = getComputedStyle(h1);
  return { family: cs.fontFamily, stretch: cs.fontStretch, weight: cs.fontWeight };
});
check(
  "Display face keeps its expanded width",
  type.family.includes("Archivo") && type.stretch === "125%",
  `${type.stretch} ${type.weight}`,
);

/* The backdrop has to crossfade, not sit on clip one for the whole page.
   The standalone re-implements this, and the failure mode is invisible in a
   screenshot of the hero: the sky is exactly what you would expect to see
   there whether the crossfade works or not. */
{
  const bandAt = async (fraction) => {
    await page.evaluate((f) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, fraction);
    await page.waitForTimeout(2200);
    return page.evaluate(() =>
      [...document.querySelectorAll("div[aria-hidden='true'] > video")]
        .map((v, i) => ({
          i,
          opacity: +getComputedStyle(v).opacity,
          playing: !v.paused,
          error: v.error ? v.error.message : null,
        }))
        .filter((v) => v.opacity > 0.5),
    );
  };

  const top = await bandAt(0.02);
  const middle = await bandAt(0.45);
  const bottom = await bandAt(0.95);
  const visible = (band, want) => band.some((v) => v.i === want);

  check(
    "Backdrop crossfades through all three clips",
    visible(top, 0) && visible(middle, 1) && visible(bottom, 2),
    `top=${top.map((v) => v.i)} middle=${middle.map((v) => v.i)} bottom=${bottom.map((v) => v.i)}`,
  );

  // The waterline. The standalone re-implements the anchor handover too, and a
  // fraction-based fallback would still crossfade through all three clips —
  // just in the wrong place, with the page announcing sea level over the road.
  const atLine = async (offset) => {
    await page.evaluate((dy) => {
      const el = document.querySelector("#sea-level");
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - window.innerHeight * 0.5 + dy);
    }, offset);
    await page.waitForTimeout(2200);
    return page.evaluate(() =>
      [...document.querySelectorAll("div[aria-hidden='true'] > video")]
        .map((v, i) => ({ i, opacity: +getComputedStyle(v).opacity }))
        .filter((v) => v.opacity > 0.5)
        .map((v) => v.i),
    );
  };
  const above = await atLine(-140);
  const below = await atLine(140);
  check(
    "Sea clip takes over exactly at the sea-level line",
    above.includes(1) && !above.includes(2) && below.includes(2),
    `above=[${above}] below=[${below}]`,
  );

  // Opacity alone is not enough. An embedded clip served under the wrong MIME
  // type crossfades perfectly and never plays a frame, which looks like three
  // working backdrops until you watch one.
  const stalled = [...top, ...middle, ...bottom].filter((v) => !v.playing);
  check(
    "Every visible clip is actually playing",
    stalled.length === 0,
    stalled.length
      ? stalled.map((v) => `clip ${v.i}: ${v.error ?? "paused"}`).join("; ")
      : "",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
}

/* Scrubbed and batched triggers only run once the page has been scrolled. */
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 50));
  }
});
await page.waitForTimeout(1500);

const motion = await page.evaluate(() => ({
  rail: getComputedStyle(
    document.querySelector("#process ol > span > span"),
  ).transform,
  hiddenReveals: [...document.querySelectorAll("[data-reveal]")].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return false;
    return parseFloat(getComputedStyle(el).opacity) < 0.99;
  }).length,
}));
check("Process rail fills with scroll", motion.rail !== "none", motion.rail);
check(
  "Reveals fire on scroll",
  motion.hiddenReveals === 0,
  `${motion.hiddenReveals} still transparent`,
);

check("No external requests", external.length === 0, external.slice(0, 3).join(", "));
check("No console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
