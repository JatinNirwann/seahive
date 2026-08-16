/**
 * The rate request contract. One definition, both ends of the wire.
 *
 * This file is imported by the browser (through `lib/rateRequest.ts`) and by
 * the Edge Function that runs on Deno. That is deliberate: a form whose client
 * and server disagree about what is valid produces the worst possible failure
 * — a submission the browser accepts and the server silently drops.
 *
 * It therefore has **no imports and no runtime dependencies**. Anything added
 * here has to run unchanged on Deno, on Node under `node --test`, and in a
 * browser bundle.
 */

export type FieldKey =
  | "name"
  | "email"
  | "lane"
  | "commodity"
  | "volume"
  | "readyDate"
  | "notes";

export interface FieldSpec {
  key: FieldKey;
  /** Human label, used in the notification email and in error messages. */
  label: string;
  /** Hard cap. Anything longer is rejected rather than truncated. */
  max: number;
  required: boolean;
  email?: boolean;
}

/**
 * Caps are deliberately tight. This endpoint sends mail to an address the
 * caller supplies, so every character allowed through is a character a spammer
 * could try to deliver to a third party. The caps are generous for a real
 * enquiry and useless for a payload.
 */
export const FIELDS: FieldSpec[] = [
  { key: "name", label: "Name / company", max: 120, required: true },
  { key: "email", label: "Email", max: 200, required: true, email: true },
  // The key stays `lane` because it is the column name on a table that already
  // holds requests; only what the enquirer and Seahive read has changed. Every
  // shipment leaves India, so asking for the origin was asking for a constant.
  { key: "lane", label: "Destination", max: 160, required: true },
  { key: "commodity", label: "Commodity", max: 200, required: true },
  { key: "volume", label: "Volume", max: 120, required: true },
  { key: "readyDate", label: "Target readiness date", max: 80, required: true },
  { key: "notes", label: "Anything else", max: 2000, required: false },
];

export type RateRequest = Record<FieldKey, string>;

/**
 * Bots post the instant the DOM is ready. A human cannot fill six fields in
 * under three seconds.
 *
 * This is a filter, not a security boundary: the elapsed time is measured in
 * the browser and a determined caller can send whatever it likes. It is here
 * because it costs nothing and stops the undetermined majority. The rate limit
 * is what actually bounds the damage.
 */
export const MIN_FILL_MS = 3000;

/** Submissions allowed per IP per hour before the endpoint stops accepting. */
export const RATE_LIMIT_PER_HOUR = 5;

/** Name of the honeypot input. Left empty by humans, filled by form bots. */
export const HONEYPOT_FIELD = "website";

/**
 * Pragmatic, not RFC 5322. The only thing worth verifying here is that the
 * address could plausibly be delivered to — Resend is the real authority, and
 * a regex that tries to be complete rejects valid addresses for no gain.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface Invalid {
  key: FieldKey;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: RateRequest }
  | { ok: false; errors: Invalid[] };

/**
 * Validates and normalises one submission.
 *
 * Every value is trimmed and every control character other than newline and
 * tab is stripped. Control characters in a header-adjacent value are how
 * header injection starts, and there is no legitimate enquiry that contains
 * them.
 */
export function validateRateRequest(input: unknown): ValidationResult {
  const errors: Invalid[] = [];
  const value = {} as RateRequest;
  const raw = (input ?? {}) as Record<string, unknown>;

  for (const field of FIELDS) {
    const supplied = raw[field.key];
    const text =
      typeof supplied === "string" ? clean(supplied) : supplied == null ? "" : "";

    if (!text) {
      if (field.required) {
        errors.push({ key: field.key, message: `${field.label} is required.` });
      }
      value[field.key] = "";
      continue;
    }

    if (text.length > field.max) {
      errors.push({
        key: field.key,
        message: `${field.label} must be ${field.max} characters or fewer.`,
      });
      continue;
    }

    if (field.email && !EMAIL.test(text)) {
      errors.push({
        key: field.key,
        message: `${field.label} does not look like an email address.`,
      });
      continue;
    }

    value[field.key] = text;
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Trim, collapse control characters, and normalise newlines. */
function clean(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // Everything in C0/C1 except newline and tab. Header injection needs CR or
    // LF in a single-line value; the multi-line notes field keeps its newlines
    // because it is only ever placed in a body.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
}

/**
 * HTML-escapes a value for an email body.
 *
 * Both emails are HTML, and every value in them came from an unauthenticated
 * stranger. Escaping is what stops a submission carrying markup into an inbox
 * — including into the acknowledgement, which is delivered to an address the
 * same stranger chose.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strips anything that could break out of a single header line.
 *
 * Used for the subject, which carries the lane. A newline here would let a
 * submission append headers of its own.
 */
export function headerSafe(text: string, max = 120): string {
  return text.replace(/[\r\n]+/g, " ").slice(0, max).trim();
}

/** `SHF-00042` from the row id. Derivable, so it never has to be stored. */
export function referenceFor(id: number | bigint): string {
  return `SHF-${String(id).padStart(5, "0")}`;
}
