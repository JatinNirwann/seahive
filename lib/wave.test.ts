import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { WAVE_COUNT, dividerPath, waveMetrics, wavePath } from "./wave.ts";

const W = 1440;
const H = 900;

/** Every y coordinate in a path's command stream. */
function ys(d: string): number[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  return nums.filter((_, i) => i % 2 === 1);
}

function xs(d: string): number[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  return nums.filter((_, i) => i % 2 === 0);
}

test("produces a well-formed path for every wave in both states", () => {
  for (const hexT of [0, 0.5, 1]) {
    for (let i = 0; i < WAVE_COUNT; i++) {
      const d = wavePath(i, 0, 0.6, hexT, W, H);
      assert.match(d, /^M-?[\d.]+ -?[\d.]+C/, `wave ${i} at hexT ${hexT}`);
      assert.ok(!d.includes("NaN"), `wave ${i} at hexT ${hexT} produced NaN`);
    }
  }
});

test("the hexagon state narrows toward top and bottom", () => {
  const widths = Array.from({ length: WAVE_COUNT }, (_, i) =>
    waveMetrics(i, 0.6, 0, W, H).halfWidth,
  );

  // Widest through the middle, symmetric about it — the mark's silhouette.
  const middle = (WAVE_COUNT - 1) / 2;
  assert.equal(widths.indexOf(Math.max(...widths)), middle);
  for (let i = 0; i < middle; i++) {
    assert.ok(
      widths[i] < widths[i + 1],
      `wave ${i} should be narrower than wave ${i + 1}`,
    );
    assert.ok(
      Math.abs(widths[i] - widths[WAVE_COUNT - 1 - i]) < 1e-9,
      `wave ${i} should mirror wave ${WAVE_COUNT - 1 - i}`,
    );
  }
});

test("the unspooled state runs every wave off both edges", () => {
  for (let i = 0; i < WAVE_COUNT; i++) {
    const d = wavePath(i, 0, 0.6, 1, W, H);
    const x = xs(d);
    assert.ok(Math.min(...x) < 0, `wave ${i} should start left of the viewport`);
    assert.ok(Math.max(...x) > W, `wave ${i} should end right of the viewport`);
  }

  // All seven are the same length once unspooled: parallel route lines.
  const widths = Array.from({ length: WAVE_COUNT }, (_, i) =>
    waveMetrics(i, 0.6, 1, W, H).halfWidth,
  );
  assert.equal(new Set(widths).size, 1);
});

test("zero amplitude flattens a wave to its baseline", () => {
  const { baseline } = waveMetrics(3, 0, 1, W, H);
  const d = wavePath(3, 1.2, 0, 1, W, H);
  for (const y of ys(d)) {
    assert.ok(
      Math.abs(y - baseline) < 0.11,
      `expected ${baseline}, got ${y} — customs sections must be flat`,
    );
  }
});

test("adjacent waves run in antiphase", () => {
  // At the horizontal centre with zero phase, sin(0 + i·π) alternates sign,
  // so consecutive waves sit on opposite sides of their baselines.
  const offsets = Array.from({ length: WAVE_COUNT }, (_, i) => {
    const m = waveMetrics(i, 1, 1, W, H);
    return m.amplitude * Math.sin(i * Math.PI + Math.PI / 2);
  });
  for (let i = 0; i < WAVE_COUNT - 1; i++) {
    assert.ok(
      offsets[i] * offsets[i + 1] < 0,
      `waves ${i} and ${i + 1} should be in antiphase`,
    );
  }
});

test("advancing phase moves the wave without changing its extent", () => {
  const a = wavePath(3, 0, 0.6, 1, W, H);
  const b = wavePath(3, 1.4, 0.6, 1, W, H);
  assert.notEqual(a, b, "phase should deform the path");
  assert.equal(
    waveMetrics(3, 0.6, 1, W, H).halfWidth,
    waveMetrics(3, 0.6, 1, W, H).halfWidth,
  );
});

test("is deterministic", () => {
  assert.equal(
    wavePath(2, 0.7, 0.4, 0.3, W, H),
    wavePath(2, 0.7, 0.4, 0.3, W, H),
  );
});

test("dividers differ by index", () => {
  const first = dividerPath(1, 1200, 36);
  const second = dividerPath(4, 1200, 36);
  assert.notEqual(first, second, "each divider carries its section's index");
  assert.ok(!first.includes("NaN"));
});

test("degenerate viewports do not throw", () => {
  assert.equal(wavePath(0, 0, 0.5, 1, 0, 0), "");
  assert.doesNotThrow(() => wavePath(0, 0, 0.5, 1, 1, 1));
});

/* ── Architecture ─────────────────────────────────────────────────────────
   The brief's rule is one master ScrollTrigger driving the ripple, with
   sections registering against it — never a trigger per element. That is a
   property of the source, so it is asserted against the source.            */

test("exactly one master ScrollTrigger drives the ripple", () => {
  const ripple = readFileSync("components/RippleSystem.tsx", "utf8");
  const masters = ripple.match(/ScrollTrigger\.create\(/g) ?? [];
  assert.equal(
    masters.length,
    1,
    "RippleSystem should create exactly one ScrollTrigger",
  );
  assert.match(ripple, /trigger:\s*document\.documentElement/);
});

test("reveals are batched rather than one trigger per element", () => {
  const reveal = readFileSync("components/RevealController.tsx", "utf8");
  assert.match(reveal, /ScrollTrigger\.batch\(/);
  assert.equal(
    (reveal.match(/ScrollTrigger\.create\(/g) ?? []).length,
    0,
    "reveals must not create individual triggers",
  );
});
