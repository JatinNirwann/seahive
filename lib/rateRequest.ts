/**
 * Submitting the rate request form.
 *
 * The site is a static export, so there is no server here to post to. The form
 * posts to a Supabase Edge Function, which is the only place a mail API key
 * can live. See `supabase/functions/rate-request/`.
 *
 * The validation rules are not redefined here — they are imported from the
 * same file the function uses, so the browser and the endpoint can never
 * disagree about what a valid enquiry looks like.
 */

export {
  FIELDS,
  HONEYPOT_FIELD,
  MIN_FILL_MS,
  validateRateRequest,
  type FieldKey,
  type Invalid,
  type RateRequest,
} from "@/supabase/functions/rate-request/schema.ts";

import {
  HONEYPOT_FIELD,
  type Invalid,
  type RateRequest,
} from "@/supabase/functions/rate-request/schema.ts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Where the form posts, or null when this build was not given a project.
 *
 * Null is a supported state, not a broken one: the standalone artifact and any
 * unconfigured build fall back to printing the composed request rather than
 * pretending to send it. A form that silently drops submissions is worse than
 * a form that admits it has no backend.
 */
export const ENDPOINT: string | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? `${SUPABASE_URL}/functions/v1/rate-request`
    : null;

export type SubmitResult =
  | { status: "sent"; reference: string; message: string }
  | { status: "invalid"; message: string; fields: Invalid[] }
  | { status: "error"; message: string };

/** Milliseconds since the form was mounted, for the endpoint's fill timer. */
export type Elapsed = () => number;

export async function submitRateRequest(
  request: RateRequest,
  elapsedMs: number,
  honeypot: string,
): Promise<SubmitResult> {
  if (!ENDPOINT) {
    return { status: "error", message: "No endpoint configured." };
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Public by design — this key identifies the project, it does not
        // authorise anything. `rate_requests` has RLS on with no policies, so
        // this key cannot read a single row.
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        ...request,
        elapsedMs,
        [HONEYPOT_FIELD]: honeypot,
      }),
    });
  } catch {
    // Offline, DNS failure, the project paused. Nothing was sent, and the
    // caller shows the visitor their own text so it is not lost.
    return {
      status: "error",
      message: "We could not reach our server. Your request was not sent.",
    };
  }

  let body: {
    ok?: boolean;
    reference?: string;
    message?: string;
    error?: string;
    fields?: Invalid[];
  };
  try {
    body = await response.json();
  } catch {
    return {
      status: "error",
      message: "We got an unreadable reply from our server.",
    };
  }

  if (response.ok && body.ok && body.reference) {
    return {
      status: "sent",
      reference: body.reference,
      message: body.message ?? "Request received.",
    };
  }

  if (response.status === 422 && body.fields?.length) {
    return {
      status: "invalid",
      message: body.error ?? "Please check the highlighted fields.",
      fields: body.fields,
    };
  }

  return {
    status: "error",
    message: body.error ?? "Your request was not sent.",
  };
}
