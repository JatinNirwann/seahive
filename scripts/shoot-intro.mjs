import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:4321/", { waitUntil: "domcontentloaded" });
// Warm the cache so the second load hits the intro timing cleanly.
await p.waitForTimeout(4000);
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(Number(process.argv[2] ?? 700));
await p.screenshot({ path: process.argv[3] });
await b.close();
