import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  FIELDS,
  MIN_FILL_MS,
  RATE_LIMIT_PER_HOUR,
  escapeHtml,
  headerSafe,
  referenceFor,
  validateRateRequest,
} from "../supabase/functions/rate-request/schema.ts";
import {
  acknowledgement,
  notification,
} from "../supabase/functions/rate-request/copy.ts";

/**
 * These rules run in two places — the browser bundle and a Deno Edge Function
 * — from this one file. The tests are here because the consequences of getting
 * them wrong are not cosmetic: this endpoint sends email to an address the
 * caller supplies, so validation is the thing standing between the form and a
 * spam relay.
 */

const valid = {
  name: "Rehan Textiles",
  email: "ops@rehantextiles.example",
  lane: "Jebel Ali",
  commodity: "Cotton yarn, 25 kg bags",
  volume: "2 x 40ft",
  readyDate: "Late March",
  notes: "Stackable, no temperature control needed.",
};

test("accepts a complete request and returns it trimmed", () => {
  const result = validateRateRequest({ ...valid, name: "  Rehan Textiles  " });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.name, "Rehan Textiles");
  assert.equal(result.value.lane, "Jebel Ali");
});

test("notes are the only optional field", () => {
  const result = validateRateRequest({ ...valid, notes: "" });
  assert.equal(result.ok, true);

  for (const field of FIELDS.filter((f) => f.required)) {
    const missing = validateRateRequest({ ...valid, [field.key]: "" });
    assert.equal(missing.ok, false, `${field.key} should be required`);
    if (missing.ok) continue;
    assert.ok(
      missing.errors.some((e) => e.key === field.key),
      `${field.key} should report itself`,
    );
  }
});

test("rejects an address that could not be delivered to", () => {
  for (const email of ["rehan", "rehan@", "@example.com", "a b@example.com"]) {
    const result = validateRateRequest({ ...valid, email });
    assert.equal(result.ok, false, `${email} should be rejected`);
  }
});

test("rejects oversized fields rather than truncating them", () => {
  for (const field of FIELDS) {
    const result = validateRateRequest({
      ...valid,
      [field.key]: "x".repeat(field.max + 1),
    });
    assert.equal(result.ok, false, `${field.key} over its cap should reject`);
  }
  // And accepts exactly the cap, so the boundary is not off by one.
  const atCap = validateRateRequest({ ...valid, name: "x".repeat(120) });
  assert.equal(atCap.ok, true);
});

test("strips control characters that would let a value forge a header", () => {
  const result = validateRateRequest({
    ...valid,
    lane: "Jebel Ali\r\nBcc: victim@example.com",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The newline survives as a newline; the carriage return does not.
  assert.ok(!result.value.lane.includes("\r"));
  // And `headerSafe` is what actually flattens it for the subject line.
  assert.ok(!headerSafe(result.value.lane).includes("\n"));
});

test("headerSafe flattens and caps", () => {
  assert.equal(headerSafe("a\r\n\r\nb"), "a b");
  assert.equal(headerSafe("x".repeat(400)).length, 120);
  assert.equal(headerSafe("x".repeat(400), 160).length, 160);
});

test("escapeHtml neutralises every character that opens a tag", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
  assert.equal(escapeHtml("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");
});

test("no submitted value reaches an email body as live markup", () => {
  const attack = `<img src=x onerror="alert(1)">`;
  const request = { ...valid, name: attack, commodity: attack, notes: attack };

  const seahive = notification("SHF-00001", request);
  assert.ok(!seahive.html.includes("<img"), "notification must escape markup");
  assert.ok(seahive.html.includes("&lt;img"), "and keep it visible as text");

  const customer = acknowledgement("SHF-00001", attack, "info@example.com");
  assert.ok(!customer.html.includes("<img"), "acknowledgement must escape too");
});

test("the acknowledgement echoes only the reference and the lane", () => {
  const marker = "UNIQUEMARKERSTRING";
  const customer = acknowledgement(
    "SHF-00042",
    "Jebel Ali",
    "info@example.com",
  );

  // Nothing else the sender typed may travel to an address they chose — that
  // is what stops this endpoint being useful as a relay.
  for (const field of ["name", "commodity", "volume", "notes"] as const) {
    const request = { ...valid, [field]: marker };
    const echo = acknowledgement("SHF-00042", request.lane, "info@example.com");
    assert.ok(
      !echo.html.includes(marker) && !echo.text.includes(marker),
      `${field} must not reach the acknowledgement`,
    );
  }

  assert.ok(customer.html.includes("SHF-00042"));
  assert.ok(customer.text.includes("Jebel Ali"));
});

test("the acknowledgement says it is machine-generated", () => {
  const customer = acknowledgement("SHF-1", "lane", "info@example.com");
  assert.match(customer.text, /system-generated/i);
  assert.match(customer.html, /system-generated/i);
  // And points a reply somewhere a person actually reads.
  assert.ok(customer.text.includes("info@example.com"));
});

test("the notification carries every supplied field", () => {
  const seahive = notification("SHF-00007", valid);
  for (const field of FIELDS) {
    assert.ok(
      seahive.text.includes(valid[field.key]),
      `${field.key} missing from the notification`,
    );
  }
  assert.ok(seahive.text.includes("SHF-00007"));
});

test("references are zero-padded and derived from the row id", () => {
  assert.equal(referenceFor(1), "SHF-00001");
  assert.equal(referenceFor(42), "SHF-00042");
  assert.equal(referenceFor(123456), "SHF-123456");
});

test("the abuse thresholds are actually set to something", () => {
  assert.ok(MIN_FILL_MS >= 1000, "fill timer too short to filter anything");
  assert.ok(RATE_LIMIT_PER_HOUR > 0 && RATE_LIMIT_PER_HOUR <= 20);
});
