/**
 * The quality floor, measured rather than asserted.
 *
 *   node scripts/verify.mjs [baseUrl]
 *
 * Drives real Chromium against the built static export. Every number this
 * prints came out of the browser; nothing here is estimated.
 */

import { chromium } from "playwright";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BASE = process.argv[2] ?? "http://localhost:4321/";
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const WIDTHS = [360, 375, 768, 1024, 1440];

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* ── Contrast ──────────────────────────────────────────────────────────────
   Runs in the page. Composites the full ancestor background stack and
   normalises every colour through a canvas, so color-mix() and Tailwind v4's
   oklab() output resolve instead of being skipped. Anything the browser cannot
   parse is reported, never guessed at.                                      */
const CONTRAST_PROBE = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Tailwind v4 emits oklab() for any colour carrying an opacity modifier, and
  // canvas fillStyle will not parse it. Converting it here rather than skipping
  // it is the difference between checking the page and checking the easy half
  // of the page — most body copy on this site is an opacity modifier.
  const oklabToRGB = (L, a, bb) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
    const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    return lin.map((c) => {
      const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(255, Math.round(v * 255)));
    });
  };

  const toRGBA = (value) => {
    if (!value || value === "transparent") return [0, 0, 0, 0];

    const ok = value.match(/^oklab\(([^)]+)\)$/);
    if (ok) {
      const parts = ok[1].split("/");
      const [L, a, b2] = parts[0].trim().split(/\s+/).map(parseFloat);
      const alpha = parts[1] !== undefined ? parseFloat(parts[1]) : 1;
      return [...oklabToRGB(L, a, b2), alpha];
    }

    ctx.fillStyle = "#000";
    try {
      ctx.fillStyle = value;
    } catch {
      return null;
    }
    const out = ctx.fillStyle;
    if (out.startsWith("#")) {
      const h = out.slice(1);
      const n =
        h.length === 3
          ? h.split("").map((c) => parseInt(c + c, 16))
          : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      return [...n, 1];
    }
    const m = out.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };

  const over = (fg, bg) => {
    const a = fg[3];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1,
    ];
  };

  const lum = ([r, g, b]) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const backdrop = (el) => {
    let acc = [0, 0, 0, 0];
    let node = el;
    while (node && node !== document.documentElement.parentNode) {
      const bg = toRGBA(getComputedStyle(node).backgroundColor);
      if (bg && bg[3] > 0) acc = acc[3] === 0 ? bg : over(acc, bg);
      if (acc[3] >= 0.999) break;
      node = node.parentElement;
    }
    return acc[3] > 0 ? acc : [255, 255, 255, 1];
  };

  const failures = [];
  const unparseable = [];
  let checked = 0;

  const nodes = document.querySelectorAll("body *");
  for (const el of nodes) {
    // Leaf text only: elements whose own direct children include real text.
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (!ownText) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const fg = toRGBA(cs.color);
    if (!fg) {
      unparseable.push(`${el.tagName}.${el.className} color=${cs.color}`);
      continue;
    }

    const bg = backdrop(el);
    const composed = fg[3] < 1 ? over(fg, bg) : fg;
    const r = ratio(composed, bg);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    checked++;
    if (r < required) {
      failures.push({
        text: ownText.slice(0, 42),
        tag: el.tagName,
        ratio: Number(r.toFixed(2)),
        required,
        size: Number(size.toFixed(1)),
        color: cs.color,
      });
    }
  }

  return { checked, failures, unparseable };
};

const browser = await chromium.launch({ executablePath: EXEC });

/* ── 1. Responsive: no horizontal scroll ────────────────────────────────── */
{
  const overflows = [];
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    const bad = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (bad > 1) overflows.push(`${width}px overflows by ${bad}px`);
    await page.close();
  }
  record(
    "No horizontal scroll at 360/375/768/1024/1440",
    overflows.length === 0,
    overflows.join("; "),
  );
}

/* ── 2. Contrast, semantics, focus, console ─────────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // Walk the whole page so lazy sections have rendered before sampling.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  const contrast = await page.evaluate(CONTRAST_PROBE);
  record(
    `Contrast AA (${contrast.checked} text elements sampled)`,
    contrast.failures.length === 0 && contrast.unparseable.length === 0,
    [
      contrast.failures
        .map((f) => `${f.tag} "${f.text}" ${f.ratio}:1 needs ${f.required}`)
        .join(" | "),
      contrast.unparseable.length
        ? `unparseable: ${contrast.unparseable.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" || "),
  );

  const semantics = await page.evaluate(() => ({
    h1: document.querySelectorAll("h1").length,
    forms: document.querySelectorAll("form").length,
    unlabelled: Array.from(
      document.querySelectorAll("input, select, textarea"),
    ).filter((el) => {
      if (el.type === "hidden" || el.type === "radio") return false;
      if (el.getAttribute("aria-label")) return false;
      return !document.querySelector(`label[for="${el.id}"]`);
    }).length,
    imgsWithoutDims: Array.from(document.querySelectorAll("img")).filter(
      (i) => !i.getAttribute("width") || !i.getAttribute("height"),
    ).length,
  }));

  record("Exactly one h1", semantics.h1 === 1, `found ${semantics.h1}`);
  record(
    "Every form control has a label",
    semantics.unlabelled === 0,
    `${semantics.unlabelled} unlabelled`,
  );
  record(
    "Every image declares width and height",
    semantics.imgsWithoutDims === 0,
    `${semantics.imgsWithoutDims} missing`,
  );

  // Focus ring: tab to the first control inside the light section and confirm
  // an outline is actually painted.
  const focus = await page.evaluate(() => {
    const el = document.querySelector("#req-email");
    if (!el) return null;
    el.focus();
    const cs = getComputedStyle(el);
    return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor };
  });
  record(
    "Visible focus ring on controls",
    !!focus && focus.style !== "none" && parseFloat(focus.width) >= 1,
    focus ? `${focus.width} ${focus.style} ${focus.color}` : "control not found",
  );

  const touch = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll("a, button, input, select, textarea"),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      // Links inline in prose are exempt.
      if (el.tagName === "A" && el.closest("p")) return false;
      // The skip link has no target until it is focused, at which point it
      // takes padding. Measuring its collapsed sr-only box is meaningless.
      if (el.classList.contains("sr-only")) return false;
      // The form's honeypot is rendered but hidden from the accessibility
      // tree and taken out of the tab order, so nobody can reach it by touch
      // or by keyboard. It is bait, not a control.
      if (el.closest('[aria-hidden="true"]')) return false;
      return r.height < 44;
    }).length,
  );
  record("Interactive targets at least 44px tall", touch === 0, `${touch} under`);

  record("Zero console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

/* ── 3. Reduced motion: content already visible ─────────────────────────── */
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.querySelector("#excellence")?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const hidden = Array.from(document.querySelectorAll("[data-reveal]")).filter(
      (el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return false;
        return parseFloat(getComputedStyle(el).opacity) < 0.99;
      },
    ).length;
    const curtain = getComputedStyle(document.querySelector(".ripple-curtain"));
    return { hidden, curtainOpacity: curtain.opacity, curtainVis: curtain.visibility };
  });
  record(
    "Reduced motion: in-view content fully opaque",
    state.hidden === 0,
    `${state.hidden} still transparent`,
  );
  record(
    "Reduced motion: preloader curtain lifted",
    state.curtainOpacity === "0" || state.curtainVis === "hidden",
    `opacity ${state.curtainOpacity}, ${state.curtainVis}`,
  );
  await page.close();
}

/* ── 3b. The waterline and the sea clip agree ───────────────────────────────
   The page says "Sea level" out loud at the point the sea takes over, so the
   two have to be driven by the same thing. They are: the backdrop anchors on
   #sea-level. This asserts it end to end rather than trusting the wiring —
   road above the line, sea below it. */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);

  const clipsAt = async (offset) => {
    await page.evaluate((dy) => {
      const el = document.querySelector("#sea-level");
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - window.innerHeight * 0.5 + dy);
    }, offset);
    await page.waitForTimeout(1800);
    return page.evaluate(() =>
      Array.from(document.querySelectorAll("div[aria-hidden='true'] > video"))
        .map((v, i) => ({ i, opacity: parseFloat(getComputedStyle(v).opacity) }))
        .filter((v) => v.opacity > 0.5)
        .map((v) => v.i),
    );
  };

  const above = await clipsAt(-140);
  const below = await clipsAt(140);
  record(
    "Sea clip takes over exactly at the sea-level line",
    above.includes(1) && !above.includes(2) && below.includes(2),
    `above=[${above}] below=[${below}]`,
  );
  await page.close();
}

/* ── 4. LCP on a throttled mobile profile ───────────────────────────────── */
{
  const page = await browser.newPage({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    // Lighthouse's mobile profile: 1.6 Mbps down, 750 Kbps up, 150ms RTT.
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(6000);
  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const entries = performance.getEntriesByType(
          "largest-contentful-paint",
        );
        if (entries.length) return resolve(entries.at(-1).startTime);
        new PerformanceObserver((list) =>
          resolve(list.getEntries().at(-1).startTime),
        ).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(null), 3000);
      }),
  );
  record(
    "LCP under 2.5s on throttled 4G with 4x CPU",
    lcp !== null && lcp < 2500,
    lcp === null ? "not measured" : `${Math.round(lcp)}ms`,
  );
  await page.close();
}

/* ── 5. JavaScript weight ───────────────────────────────────────────────────
   Measured as what the page actually requests, not as the sum of the output
   directory — that would count chunks belonging to the 404 route, which no
   visitor to this page ever downloads. The on-disk total is printed alongside
   so the difference is visible rather than hidden.                          */
{
  const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
  const requested = new Set();
  page.on("response", (r) => {
    if (r.url().endsWith(".js")) requested.add(new URL(r.url()).pathname);
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.waitForTimeout(1200);
  await page.close();

  let gz = 0;
  for (const p of requested) gz += gzipSync(await readFile(join("out", p))).length;

  const walk = async (p) => {
    const out = [];
    for (const entry of await readdir(p, { withFileTypes: true })) {
      const full = join(p, entry.name);
      if (entry.isDirectory()) out.push(...(await walk(full)));
      else if (entry.name.endsWith(".js")) out.push(full);
    }
    return out;
  };
  let onDisk = 0;
  for (const f of await walk("out/_next/static")) {
    onDisk += gzipSync(await readFile(f)).length;
  }

  record(
    "JS loaded by the page under 200KB gzipped",
    gz < 200 * 1024,
    `${(gz / 1024).toFixed(1)} KB gzipped across ${requested.size} files (${(onDisk / 1024).toFixed(1)} KB on disk including the 404 route)`,
  );

  // Backdrop weight. Reported rather than gated: none of it is on the
  // critical path — clips carry preload="none" and only load once their band
  // of the page is reached — so the number that matters is LCP above, not this.
  const media = await readdir("public/video");
  const sum = async (ext) => {
    let bytes = 0;
    for (const f of media.filter((n) => n.endsWith(ext))) {
      bytes += (await stat(join("public/video", f))).size;
    }
    return bytes;
  };
  const clips = await sum(".mp4");
  const posters = await sum(".jpg");
  record(
    "Backdrop weight",
    true,
    `${(clips / 1024).toFixed(0)} KB across ${media.filter((n) => n.endsWith(".mp4")).length} clips, ` +
      `${(posters / 1024).toFixed(0)} KB of posters — lazy, none on the critical path`,
  );
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length ? 1 : 0);
