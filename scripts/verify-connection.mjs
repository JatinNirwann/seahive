/**
 * The connection gate, exercised across the network types it has to decide on.
 *
 *   node scripts/verify-connection.mjs [baseUrl]
 *
 * The rule is "video on Wi-Fi, still image otherwise", which the web cannot
 * answer directly — `NetworkInformation.type` only exists in Chromium on
 * Android, and Safari and Firefox expose nothing at all. lib/connection.ts is
 * therefore a ladder of best evidence, and a ladder is exactly the kind of
 * thing that quietly stops working.
 *
 * So each case here fakes a different NetworkInformation before the page's own
 * scripts run, and asserts both halves of the outcome: whether the clip plays,
 * and whether it was fetched at all. The second half is the one that matters —
 * a visitor on cellular who is shown a still but charged for the download has
 * been failed, not served.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4321/";
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const CASES = [
  {
    label: "Wi-Fi",
    connection: { type: "wifi", effectiveType: "4g", saveData: false },
    expectVideo: true,
  },
  {
    label: "Cellular, 4G",
    connection: { type: "cellular", effectiveType: "4g", saveData: false },
    expectVideo: false,
  },
  {
    label: "No type, 4G",
    connection: { effectiveType: "4g", saveData: false },
    expectVideo: true,
  },
  {
    label: "No type, 3G",
    connection: { effectiveType: "3g", saveData: false },
    expectVideo: false,
  },
  {
    label: "Save-Data on",
    connection: { type: "wifi", effectiveType: "4g", saveData: true },
    expectVideo: false,
  },
  {
    // Safari and Firefox. Assume a good connection rather than punishing every
    // one of them with a still.
    label: "No API at all",
    connection: null,
    expectVideo: true,
  },
];

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const failures = [];

for (const testCase of CASES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript((c) => {
    if (c === null) {
      delete Object.getPrototypeOf(navigator).connection;
      return;
    }
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: Object.assign(new EventTarget(), c),
    });
  }, testCase.connection);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(3800);

  const state = await page.evaluate(() => {
    const video = document.querySelector("video");
    return {
      playing: !video.paused,
      fetched: Boolean(video.src),
      hasPoster: Boolean(video.poster),
    };
  });
  await page.close();

  const ok =
    state.playing === testCase.expectVideo &&
    state.fetched === testCase.expectVideo &&
    state.hasPoster;

  if (!ok) failures.push({ ...testCase, state });

  console.log(
    `${ok ? "PASS" : "FAIL"}  ${testCase.label.padEnd(14)} ` +
      `${state.playing ? "video" : "still"}, ` +
      `${state.fetched ? "clip fetched" : "nothing fetched"}, ` +
      `${state.hasPoster ? "poster present" : "NO POSTER"}`,
  );
}

await browser.close();

console.log(`\n${CASES.length - failures.length}/${CASES.length} cases passed`);
process.exit(failures.length ? 1 : 0);
