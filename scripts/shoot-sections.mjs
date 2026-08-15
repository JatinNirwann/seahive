import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
p.on("console", m => m.type()==="error" && errs.push("CONSOLE: " + m.text()));
await p.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
const dir = process.argv[2];
const shots = ["#services", "#lanes", "#excellence", "#process", "#rate-request"];
for (const sel of shots) {
  await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), sel);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${dir}/sec-${sel.slice(1)}.png` });
}
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1600);
await p.screenshot({ path: `${dir}/sec-footer.png` });
console.log(errs.join("\n") || "no console errors");
await b.close();
