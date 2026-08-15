import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const dir = process.argv[2];
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
await p.screenshot({ path: `${dir}/tour-1-hero.png` });
const stops = [["position", 950], ["process", null], ["rate-request", null]];
for (const [name, y] of stops) {
  if (y) await p.evaluate((v) => window.scrollTo(0, v), y);
  else await p.evaluate((s) => document.querySelector("#" + s)?.scrollIntoView({ block: "start" }), name);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${dir}/tour-${name}.png` });
}
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1800);
await p.screenshot({ path: `${dir}/tour-footer.png` });
await p.close();
const m = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await m.waitForTimeout(3200);
await m.screenshot({ path: `${dir}/tour-mobile-hero.png` });
console.log("ok");
await b.close();
