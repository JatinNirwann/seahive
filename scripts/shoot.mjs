/**
 * Screenshot helper.
 *
 *   node scripts/shoot.mjs <url> <out.png> [width] [height] [waitMs] [scrollTo]
 */

import { chromium } from "playwright";

const [
  url = "http://localhost:4321/",
  out = "shot.png",
  width = "1440",
  height = "900",
  waitMs = "3000",
  scrollTo = "0",
] = process.argv.slice(2);

// The pre-installed Chromium is a different build number to the one this
// Playwright version expects, so point at it rather than downloading another.
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 2,
});

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle" });
if (Number(scrollTo) > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), Number(scrollTo));
}
await page.waitForTimeout(Number(waitMs));
await page.screenshot({ path: out });

console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await browser.close();
