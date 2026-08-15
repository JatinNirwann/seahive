import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
await p.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[2] });
await b.close();
