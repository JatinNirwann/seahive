"use client";

import clsx from "clsx";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import Section from "@/components/ui/Section";
import { CONTACT_INTRO } from "@/content/copy";
import {
  ENDPOINT,
  FIELDS,
  HONEYPOT_FIELD,
  submitRateRequest,
  type FieldKey,
  type Invalid,
  type RateRequest,
} from "@/lib/rateRequest";

/**
 * The rate request form. The page's actual purpose.
 *
 * A real <form> with real <label>s, real validation and a real fieldset — not
 * divs wearing a form's clothes.
 *
 * Fields are uncontrolled — the inputs are the source of truth for what the
 * visitor is about to send, rather than a mirror of React state.
 *
 * Submission posts to a Supabase Edge Function — see `lib/rateRequest.ts` and
 * `supabase/functions/rate-request/`. There is no server here to post to: the
 * site is a static export, so the endpoint has to live off-site.
 *
 * When this build was given no endpoint (`ENDPOINT` is null — the standalone
 * artifact, or any build without the env vars) the form does not pretend. It
 * prints the composed request so nothing typed is lost, and says plainly that
 * nothing was sent. The same fallback catches a failed send, which is the case
 * that actually matters: the one thing this form must never do is accept a
 * request, lose it, and thank the visitor for it.
 */
export default function Contact() {
  const [composed, setComposed] = useState<string | null>(null);
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "unsent"
  >("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [invalid, setInvalid] = useState<Invalid[]>([]);

  // When the form became fillable. The endpoint rejects submissions that
  // arrive impossibly fast, which is the cheapest bot filter there is.
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const read = (key: string) => String(data.get(key) ?? "").trim();

    const request = Object.fromEntries(
      FIELDS.map((field) => [field.key, read(field.key)]),
    ) as RateRequest;

    // What the visitor typed, kept aside so a failure can hand it back rather
    // than swallow it.
    const transcript = FIELDS.filter((field) => request[field.key])
      .map((field) => `${field.label}: ${request[field.key]}`)
      .join("\n");

    if (!ENDPOINT) {
      setState("unsent");
      setMessage(
        "This build has no endpoint configured, so nothing was transmitted.",
      );
      setComposed(transcript);
      return;
    }

    setState("sending");
    setInvalid([]);

    const result = await submitRateRequest(
      request,
      Date.now() - mountedAt.current,
      read(HONEYPOT_FIELD),
    );

    if (result.status === "sent") {
      setState("sent");
      setReference(result.reference);
      setMessage(result.message);
      setComposed(null);
      form.reset();
      return;
    }

    if (result.status === "invalid") {
      setState("idle");
      setInvalid(result.fields);
      setMessage(result.message);
      return;
    }

    setState("unsent");
    setMessage(result.message);
    setComposed(transcript);
  };

  const errorFor = (key: FieldKey) =>
    invalid.find((entry) => entry.key === key)?.message;

  return (
    <Section id="rate-request" amplitude={0.2} className="py-24 sm:py-32">
      <div className="shell layer-content grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-12 lg:col-span-4">
          <p data-reveal className="font-data text-eyebrow uppercase text-marine">
            {CONTACT_INTRO.eyebrow}
          </p>
          <h2
            data-reveal
            className="mt-5 font-display font-expanded text-display-2 text-ink"
          >
            {CONTACT_INTRO.heading}
          </h2>
          <p data-reveal className="mt-6 max-w-[40ch] text-body-lg text-graphite">
            {CONTACT_INTRO.body}
          </p>
        </div>

        <div className="col-span-12 lg:col-span-7 lg:col-start-6">
          <form data-reveal onSubmit={handleSubmit}>
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="sr-only">Rate request</legend>

              {/* `name` is the schema key, not the label — it is what the
                  endpoint validates against, and both ends import the same
                  definition so they cannot drift. */}
              <Field
                id="req-name"
                name="name"
                label="Your name / company"
                autoComplete="organization"
                required
                error={errorFor("name")}
              />
              <Field
                id="req-email"
                name="email"
                label="Email address"
                type="email"
                autoComplete="email"
                required
                error={errorFor("email")}
              />
              <Field
                id="req-lane"
                name="lane"
                label="Origin & destination"
                hint="Place names or port codes"
                placeholder="INNSA to AEJEA"
                required
                error={errorFor("lane")}
              />
              <Field
                id="req-commodity"
                name="commodity"
                label="Commodity type"
                hint="What is in the boxes"
                placeholder="Cotton yarn, 25 kg bags"
                required
                error={errorFor("commodity")}
              />
              <Field
                id="req-volume"
                name="volume"
                label="Volume"
                hint="Containers, CBM or chargeable weight"
                placeholder="2 × 40ft"
                required
                error={errorFor("volume")}
              />
              <Field
                id="req-timeline"
                name="readyDate"
                label="Target readiness date"
                hint="When cargo is available"
                placeholder="Late March"
                required
                error={errorFor("readyDate")}
              />

              <div className="sm:col-span-2">
                <label
                  htmlFor="req-notes"
                  className="block font-data text-eyebrow uppercase text-graphite"
                >
                  Anything else
                </label>
                <textarea
                  id="req-notes"
                  name="notes"
                  rows={3}
                  className="mt-2 w-full border border-mist-deep bg-surface px-3 py-2.5 text-body text-ink placeholder:text-graphite/70"
                />
              </div>

              {/* Honeypot. Off-screen rather than display:none — some bots skip
                  what is not rendered — and taken out of the tab order and the
                  accessibility tree, so nobody using the form ever meets it. */}
              <div aria-hidden="true" className="absolute -left-[9999px] w-px overflow-hidden">
                <label htmlFor="req-website">Website</label>
                <input
                  id="req-website"
                  name={HONEYPOT_FIELD}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </fieldset>

            {/* The page's purpose. The only other solid accent fill is the hero CTA. */}
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-7 inline-flex min-h-11 items-center bg-marine px-8 font-data text-data font-500 tracking-wide text-surface transition-colors hover:bg-marine-deep disabled:cursor-not-allowed disabled:opacity-70"
            >
              {state === "sending" ? "Sending…" : "Send rate request"}
            </button>
          </form>

          {/* One live region for every outcome, so a screen reader hears the
              result whichever way it went. */}
          <div role="status" aria-live="polite">
            {state === "sent" && (
              <div className="mt-6 border border-marine/40 bg-marine/5 p-5">
                <p className="font-data text-eyebrow uppercase text-marine">
                  Sent — reference {reference}
                </p>
                <p className="mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed text-graphite">
                  {message} A confirmation is on its way to your inbox, and our
                  commercial team will come back to you shortly. Quote{" "}
                  <span className="font-data text-ink">{reference}</span> in any
                  follow-up.
                </p>
              </div>
            )}

            {state === "unsent" && (
              <div className="mt-6 border border-marine/40 bg-marine/5 p-5">
                <p className="font-data text-eyebrow uppercase text-marine">
                  Not sent
                </p>
                <p className="mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed text-graphite">
                  {message} Your request is written out below — copy it into an
                  email so nothing is lost.
                </p>
                {composed && (
                  <pre className="mt-4 overflow-x-auto border-t border-marine/25 pt-4 font-data text-[0.8rem] leading-relaxed whitespace-pre-wrap text-graphite">
                    {composed}
                  </pre>
                )}
              </div>
            )}

            {state === "idle" && invalid.length > 0 && (
              <div className="mt-6 border border-marine/40 bg-marine/5 p-5">
                <p className="font-data text-eyebrow uppercase text-marine">
                  Check these fields
                </p>
                <ul className="mt-3 list-disc pl-5 text-[0.875rem] leading-relaxed text-graphite">
                  {invalid.map((entry) => (
                    <li key={entry.key}>{entry.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Field({
  id,
  name,
  label,
  hint,
  type = "text",
  placeholder,
  required,
  autoComplete,
  inputRef,
  error,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Server-side rejection for this field, if any. */
  error?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-data text-eyebrow uppercase text-graphite"
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        // The border is the only thing that changes. There is one accent on
        // this page and no status hues, so an invalid field is marked by
        // weight, not by turning red.
        className={clsx(
          "mt-2 min-h-11 w-full border bg-surface px-3 text-body text-ink placeholder:text-graphite/70",
          error ? "border-2 border-marine" : "border-mist-deep",
        )}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[0.75rem] text-ink">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[0.75rem] text-graphite">
          {hint}
        </p>
      )}
    </div>
  );
}
