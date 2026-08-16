/**
 * Every string that leaves this function as email.
 *
 * The project rule is that nothing user-visible is written inline. These live
 * beside the function rather than in `content/` because they run on Deno, not
 * in the Next bundle — but the rule is the same: one file to review, correct
 * or translate the whole voice of the mail Seahive sends.
 *
 * Two emails, two very different jobs:
 *
 * - **The acknowledgement** goes to a stranger who filled in a form. It is
 *   machine-generated and says so plainly, because an autoresponder that
 *   pretends to be a person is the fastest way to lose the trust the page just
 *   earned. It echoes almost nothing they typed — see `schema.ts` for why.
 * - **The notification** goes to Seahive. It carries everything, and its
 *   reply-to is the enquirer, so answering is one click.
 */

import { escapeHtml, FIELDS, type RateRequest } from "./schema.ts";

const BRAND = "Seahive Freight Private Limited";

/* Plain, near-neutral email HTML. Mail clients are not browsers: no external
   stylesheet survives, no custom font loads, and a dark-mode client will
   recolour whatever it likes. Inline styles, system stack, high contrast. */
const shell = (inner: string) => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f7;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #cdd4d6;">
<tr><td style="padding:28px 28px 0;">
<p style="margin:0;font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#0b4a63;">${BRAND}</p>
</td></tr>
<tr><td style="padding:20px 28px 28px;font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#13181a;">
${inner}
</td></tr>
</table>
</body></html>`;

const row = (label: string, value: string) => `
<tr>
  <td style="padding:10px 12px 10px 0;border-top:1px solid #e3e7e8;font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#3a4347;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-top:1px solid #e3e7e8;color:#13181a;vertical-align:top;">${escapeHtml(value).replace(/\n/g, "<br>")}</td>
</tr>`;

/* ── To Seahive: a new query ─────────────────────────────────────────────── */

export function notification(reference: string, request: RateRequest) {
  const rows = FIELDS.filter((f) => request[f.key])
    .map((f) => row(f.label, request[f.key]))
    .join("");

  const html = shell(`
<h1 style="margin:0 0 4px;font:700 20px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#13181a;">New rate request</h1>
<p style="margin:0 0 20px;font:400 13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#3a4347;">${escapeHtml(reference)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font:inherit;border-collapse:collapse;">${rows}</table>
<p style="margin:22px 0 0;font-size:13px;color:#3a4347;">Reply to this email to answer ${escapeHtml(request.name)} directly — the reply-to is already set to their address.</p>`);

  const text = [
    `New rate request — ${reference}`,
    "",
    ...FIELDS.filter((f) => request[f.key]).map(
      (f) => `${f.label}: ${request[f.key]}`,
    ),
    "",
    "Reply to this email to answer the sender directly.",
  ].join("\n");

  return { html, text };
}

/* ── To the enquirer: an acknowledgement ─────────────────────────────────── */

/**
 * `lane` is the only thing the sender typed that comes back to them, and it is
 * escaped and capped by the caller. Everything else here is fixed text.
 */
export function acknowledgement(
  reference: string,
  lane: string,
  replyTo: string,
) {
  const html = shell(`
<h1 style="margin:0 0 16px;font:700 20px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#13181a;">Thank you — we have your request</h1>
<p style="margin:0 0 16px;">Our commercial team will review your requirement and come back to you shortly with a rate plan.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font:inherit;border-collapse:collapse;">
${row("Reference", reference)}
${row("Destination", lane)}
</table>
<p style="margin:20px 0 0;">Quote your reference in any follow-up and we will find your file immediately.</p>
<p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #e3e7e8;font-size:13px;color:#3a4347;">
This is a system-generated confirmation sent automatically when your request reached us — nobody has typed a reply yet. It confirms receipt only, and is not a quotation. Rates are subject to space, equipment and current market conditions.
</p>
<p style="margin:12px 0 0;font-size:13px;color:#3a4347;">
Replies to this message reach us at <a href="mailto:${escapeHtml(replyTo)}" style="color:#0b4a63;">${escapeHtml(replyTo)}</a>.
</p>`);

  const text = [
    "Thank you — we have your request",
    "",
    "Our commercial team will review your requirement and come back to you shortly with a rate plan.",
    "",
    `Reference: ${reference}`,
    `Destination: ${lane}`,
    "",
    "Quote your reference in any follow-up and we will find your file immediately.",
    "",
    "---",
    "This is a system-generated confirmation sent automatically when your request",
    "reached us. It confirms receipt only, and is not a quotation. Rates are",
    "subject to space, equipment and current market conditions.",
    "",
    `Replies to this message reach us at ${replyTo}.`,
    BRAND,
  ].join("\n");

  return { html, text };
}

export const SUBJECTS = {
  notification: (reference: string, lane: string) =>
    `New rate request — ${reference} — ${lane}`,
  acknowledgement: (reference: string) =>
    `We have your rate request — ${reference}`,
};

/* ── What the endpoint says back to the browser ──────────────────────────── */

export const RESPONSES = {
  sent: "Request received.",
  invalid: "Please check the highlighted fields.",
  tooFast: "That was submitted a little too quickly — please try once more.",
  rateLimited:
    "Several requests have already come from this connection in the last hour. Please email us directly instead.",
  failed:
    "Something went wrong at our end and your request was not sent. Please email us directly.",
};
