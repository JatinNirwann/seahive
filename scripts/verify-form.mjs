/**
 * Drives the rate request form in a real browser.
 *
 * The endpoint itself is verified separately, by posting to the deployed
 * function directly (see CLAUDE.md). What is verified here is the half that lives
 * in the page, and the seam between them:
 *
 * - the exact payload the form puts on the wire, field by field
 * - every response path rendered: success, field errors, transport failure
 * - that a failure is reported as a failure rather than thanked for
 *
 * The endpoint call is intercepted rather than allowed out. That is deliberate
 * and not a compromise: it makes the suite deterministic, keeps it runnable in
 * CI with no secrets and no network, and lets it assert the request body —
 * which is the actual contract — instead of only the reply. The live function
 * is proven to accept exactly this shape by the direct posts.
 *
 * Serve the export first, built with NEXT_PUBLIC_SUPABASE_URL set:
 *   python3 -m http.server 4321 --directory out
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4321/";
const ENDPOINT_GLOB = "**/functions/v1/rate-request";

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`CONSOLE: ${m.text()}`));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const status = () =>
  page.evaluate(() => {
    const el = document.querySelector('[role="status"]');
    return {
      text: el?.textContent?.trim() ?? "",
      live: el?.getAttribute("aria-live") ?? null,
    };
  });

const fill = async (values) => {
  for (const [id, value] of Object.entries(values)) await page.fill(`#${id}`, value);
};

const SAMPLE = {
  "req-name": "Rehan Textiles",
  "req-email": "ops@rehantextiles.example",
  "req-lane": "INNSA to AEJEA",
  "req-commodity": "Cotton yarn, 25 kg bags",
  "req-volume": "2 x 40ft",
  "req-timeline": "Late March",
  "req-notes": "Stackable.",
};

await page.evaluate(() =>
  document.querySelector("#rate-request")?.scrollIntoView({ block: "center" }),
);
await page.waitForTimeout(400);

/* ── The honeypot has to be invisible to people and visible to bots ──────── */
const honeypot = await page.evaluate(() => {
  const input = document.querySelector('input[name="website"]');
  if (!input) return null;
  const box = input.getBoundingClientRect();
  return {
    tabIndex: input.tabIndex,
    onScreen: box.right > 0 && box.left < window.innerWidth,
    hiddenFromAT: !!input.closest("[aria-hidden='true']"),
    // display:none would be skipped by many bots, defeating the point.
    display: getComputedStyle(input).display,
  };
});
check(
  "Honeypot is off-screen, untabbable, hidden from assistive tech, still rendered",
  honeypot &&
    honeypot.tabIndex === -1 &&
    !honeypot.onScreen &&
    honeypot.hiddenFromAT &&
    honeypot.display !== "none",
  JSON.stringify(honeypot),
);

/* ── What the form actually puts on the wire ─────────────────────────────── */

let captured = null;
await page.route(ENDPOINT_GLOB, async (route) => {
  const request = route.request();
  captured = {
    method: request.method(),
    headers: request.headers(),
    body: JSON.parse(request.postData() ?? "{}"),
  };
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      reference: "SHF-00042",
      message: "Request received.",
    }),
  });
});

// The endpoint refuses anything filled faster than a human could type it, so
// the test has to spend the time a human would.
await page.waitForTimeout(3400);
await fill(SAMPLE);
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);

check("The form posts to the endpoint", captured?.method === "POST", captured?.method);

const body = captured?.body ?? {};
const expected = {
  name: SAMPLE["req-name"],
  email: SAMPLE["req-email"],
  lane: SAMPLE["req-lane"],
  commodity: SAMPLE["req-commodity"],
  volume: SAMPLE["req-volume"],
  readyDate: SAMPLE["req-timeline"],
  notes: SAMPLE["req-notes"],
};
const wrong = Object.entries(expected).filter(([k, v]) => body[k] !== v);
check(
  "Every field arrives under its schema key with the typed value",
  wrong.length === 0,
  wrong.length ? JSON.stringify(wrong) : Object.keys(expected).join(", "),
);

check(
  "The fill timer is measured and sent",
  typeof body.elapsedMs === "number" && body.elapsedMs >= 3000,
  `elapsedMs=${body.elapsedMs}`,
);
check(
  "The honeypot travels empty when a human filled the form",
  body.website === "",
  JSON.stringify(body.website),
);
check(
  "The project key is attached",
  Boolean(captured?.headers.authorization?.startsWith("Bearer ")) &&
    Boolean(captured?.headers.apikey),
  captured?.headers.authorization?.slice(0, 14),
);

/* ── Success ─────────────────────────────────────────────────────────────── */

const sent = await status();
check(
  "Success shows the reference the endpoint issued",
  /Sent/i.test(sent.text) && sent.text.includes("SHF-00042"),
  sent.text.slice(0, 90),
);
check("The outcome is announced politely", sent.live === "polite", `aria-live=${sent.live}`);
check(
  "The form clears, so the next visitor does not inherit the last enquiry",
  (await page.inputValue("#req-name")) === "",
);

/* ── Field errors from the endpoint ──────────────────────────────────────── */

// Everything above this line expected to succeed, so any console error so far
// is a real one. Below, two responses fail on purpose — a 422 and an aborted
// request — and Chromium logs both as "Failed to load resource" regardless of
// whether the page handled them. Snapshot here so that expected noise is
// checked separately rather than folded into the count.
const errorsBeforeFailurePaths = errors.length;

// Deliberately a length rejection on `name`, not a malformed email. The
// browser's own `type="email"` and `required` checks fire first and stop the
// submit ever happening, so a bad address never reaches this path in practice.
// An over-long name passes native validation — there is no maxlength attribute
// — and is refused by the server. That is the case this rendering exists for.
await page.unroute(ENDPOINT_GLOB);
await page.route(ENDPOINT_GLOB, (route) =>
  route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      error: "Please check the highlighted fields.",
      fields: [
        { key: "name", message: "Name / company must be 120 characters or fewer." },
      ],
    }),
  }),
);

await page.waitForTimeout(3400);
await fill({ ...SAMPLE, "req-name": "x".repeat(200) });
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);

const invalid = await page.evaluate(() => ({
  text: document.querySelector('[role="status"]')?.textContent?.trim() ?? "",
  ariaInvalid: document.querySelector("#req-name")?.getAttribute("aria-invalid"),
  described: document.querySelector("#req-name")?.getAttribute("aria-describedby") ?? "",
  kept: document.querySelector("#req-commodity")?.value ?? "",
}));
check(
  "A rejected field is reported and marked on the input",
  /120 characters or fewer/i.test(invalid.text) && invalid.ariaInvalid === "true",
  `aria-invalid=${invalid.ariaInvalid}`,
);
check(
  "The error is wired to the input for assistive tech",
  invalid.described.includes("req-name-error"),
  invalid.described || "(none)",
);
check(
  "Nothing the visitor typed is cleared by a rejection",
  invalid.kept === SAMPLE["req-commodity"],
  `commodity="${invalid.kept.slice(0, 30)}"`,
);

/* ── Transport failure: the case that actually matters ───────────────────── */

await page.unroute(ENDPOINT_GLOB);
await page.route(ENDPOINT_GLOB, (route) => route.abort());

await page.waitForTimeout(3400);
await fill({ ...SAMPLE, "req-commodity": "Must not be lost" });
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);

const failure = (await status()).text;
check(
  "A failed send says so and hands the request back",
  /Not sent/i.test(failure) && failure.includes("Must not be lost"),
  failure.slice(0, 100),
);
check(
  "A failed send never claims success",
  !/SHF-\d/.test(failure) && !/A confirmation is on its way/i.test(failure),
  failure.slice(0, 70),
);

check(
  "Zero console errors on the paths meant to succeed",
  errorsBeforeFailurePaths === 0,
  errors.slice(0, 2).join(" | "),
);

// On the two paths meant to fail, the only acceptable entries are the browser
// noting the failed request. Anything else is the page throwing.
const unexpected = errors
  .slice(errorsBeforeFailurePaths)
  .filter((e) => !/422|ERR_FAILED|ERR_ABORTED|Failed to fetch/.test(e));
check(
  "The deliberate failures produce no error beyond the failed requests",
  unexpected.length === 0,
  unexpected.slice(0, 2).join(" | "),
);

await browser.close();

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
