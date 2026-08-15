/**
 * The rate request endpoint.
 *
 * The site is a static export with no server of its own, so this is the only
 * place a mail API key can live. It receives the form, records it, and sends
 * two emails: a full notification to Seahive and an acknowledgement to whoever
 * filled the form in.
 *
 * ── The order of operations matters ──────────────────────────────────────
 * The row is written **before** either email is attempted, and the response is
 * successful as soon as the row exists. Mail providers fail — keys get
 * revoked, domains get unverified, accounts get rate limited — and an enquiry
 * that only ever existed as an email is gone when that happens. A row with
 * `notified_at` still null is a recoverable problem; a lost customer is not.
 *
 * ── This is a public endpoint that sends mail to a caller-supplied address ──
 * That is a spam relay unless it is built not to be. In order of how much they
 * actually matter: the per-IP rate limit bounds volume, the length caps and
 * escaping in `schema.ts` bound content, and the acknowledgement deliberately
 * echoes almost nothing the sender typed. The honeypot and the fill timer
 * catch naive bots and are not relied on for anything.
 *
 * Deploy:  supabase functions deploy rate-request --project-ref <ref>
 * Secrets: RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO, SEAHIVE_INBOX
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  HONEYPOT_FIELD,
  MIN_FILL_MS,
  RATE_LIMIT_PER_HOUR,
  headerSafe,
  referenceFor,
  validateRateRequest,
} from "./schema.ts";
import { RESPONSES, SUBJECTS, acknowledgement, notification } from "./copy.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM =
  Deno.env.get("MAIL_FROM") ?? "Seahive Freight <no-reply@seahivefreight.com>";
const MAIL_REPLY_TO =
  Deno.env.get("MAIL_REPLY_TO") ?? "info@seahivefreight.com";
// Defaults to info@ for the same reason MAIL_FROM and MAIL_REPLY_TO have
// defaults: this must work correctly with no secrets set at all.
//
// It did not, once. An unset SEAHIVE_INBOX made this an empty list, the
// notification send was skipped, and the endpoint still answered 200 — so a
// real enquiry arrived, the customer was thanked, and nobody at Seahive was
// told. The row's null `notified_at` was the only trace. A missing config
// value must never be the difference between a business hearing about a
// customer and not.
//
// Comma-separated to add more recipients without a redeploy.
const SEAHIVE_INBOX = (
  Deno.env.get("SEAHIVE_INBOX") || "info@seahivefreight.com"
)
  .split(",")
  .map((address) => address.trim())
  .filter(Boolean);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  // Service role: this function is the only thing that may touch the table.
  // `rate_requests` has RLS on and no policies, so every other key is refused.
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/* The form is served from GitHub Pages and from any custom domain Seahive
   points at it later, so the origin cannot be pinned to one value here. CORS
   is not what protects this endpoint — the rate limit is. */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: RESPONSES.invalid }, 400);
  }

  // Honeypot. A bot that filled the hidden field gets a successful-looking
  // response with a plausible reference and nothing happens. Telling it that
  // it was caught just teaches it to try again without the field.
  if (typeof payload[HONEYPOT_FIELD] === "string" && payload[HONEYPOT_FIELD]) {
    return json({ ok: true, reference: referenceFor(0), message: RESPONSES.sent });
  }

  const elapsed = Number(payload.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return json({ error: RESPONSES.tooFast }, 429);
  }

  const validation = validateRateRequest(payload);
  if (!validation.ok) {
    return json({ error: RESPONSES.invalid, fields: validation.errors }, 422);
  }
  const request = validation.value;

  // The IP is hashed and never stored in the clear: rate limiting needs to
  // recognise a repeat caller, which a hash does, and it does not need to know
  // who they are.
  const ipHash = await sha256(
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "unknown",
  );

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error: countError } = await supabase
    .from("rate_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (countError) {
    console.error("rate limit lookup failed", countError);
    return json({ error: RESPONSES.failed }, 500);
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: RESPONSES.rateLimited }, 429);
  }

  const { data: row, error: insertError } = await supabase
    .from("rate_requests")
    .insert({
      name: request.name,
      email: request.email,
      lane: request.lane,
      commodity: request.commodity,
      volume: request.volume,
      ready_date: request.readyDate,
      notes: request.notes || null,
      ip_hash: ipHash,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 400),
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("insert failed", insertError);
    return json({ error: RESPONSES.failed }, 500);
  }

  const reference = referenceFor(row.id);

  // From here the request is safely recorded. Neither send can fail the
  // response: the visitor has done their part, and a mail outage is Seahive's
  // problem to notice in the table, not the visitor's to retry into.
  const laneForSubject = headerSafe(request.lane);
  const seahive = notification(reference, request);
  const customer = acknowledgement(
    reference,
    // Escaped by `acknowledgement` too; capped here so a long lane cannot pad
    // the one echoed field into a payload.
    headerSafe(request.lane, 160),
    MAIL_REPLY_TO,
  );

  // Unreachable given the default above, but if somebody sets SEAHIVE_INBOX to
  // a string of commas this must shout rather than shrug. Silence here means a
  // customer got a thank-you and Seahive never heard about them.
  if (!SEAHIVE_INBOX.length) {
    console.error(
      `SEAHIVE_INBOX is empty — nobody was told about ${reference}. Fix the secret and check rate_requests for rows with notified_at is null.`,
    );
  }

  const [notified, acknowledged] = await Promise.all([
    SEAHIVE_INBOX.length
      ? send({
          to: SEAHIVE_INBOX,
          replyTo: request.email,
          subject: SUBJECTS.notification(reference, laneForSubject),
          html: seahive.html,
          text: seahive.text,
        })
      : Promise.resolve(false),
    send({
      to: [request.email],
      replyTo: MAIL_REPLY_TO,
      subject: SUBJECTS.acknowledgement(reference),
      html: customer.html,
      text: customer.text,
    }),
  ]);

  await supabase
    .from("rate_requests")
    .update({
      notified_at: notified ? new Date().toISOString() : null,
      acknowledged_at: acknowledged ? new Date().toISOString() : null,
    })
    .eq("id", row.id);

  return json({ ok: true, reference, message: RESPONSES.sent });
});

interface Mail {
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends through Resend. Returns whether it went, and never throws — a failed
 * send is recorded as a null timestamp on the row, not raised at the visitor.
 */
async function send(mail: Mail): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — no mail sent");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: mail.to,
        reply_to: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!response.ok) {
      console.error("resend rejected", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("resend threw", error);
    return false;
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
