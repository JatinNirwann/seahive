-- Rate requests submitted through the form on the site.
--
-- This table is the durable record. The two emails the endpoint sends are a
-- convenience on top of it: mail providers fail, and an enquiry that only ever
-- existed as an email is gone when that happens. `notified_at` and
-- `acknowledged_at` are null until the corresponding send succeeded, so a mail
-- outage shows up as a query rather than as silence.
--
-- The public reference shown to the customer is derived, never stored:
--   'SHF-' || lpad(id::text, 5, '0')   -- see referenceFor() in schema.ts

create table public.rate_requests (
  id          bigint generated always as identity primary key,

  name        text        not null,
  email       text        not null,
  lane        text        not null,
  commodity   text        not null,
  volume      text        not null,
  ready_date  text        not null,
  notes       text,

  -- Hashed, never the address itself. Rate limiting needs to recognise a
  -- repeat caller; it does not need to know who they are.
  ip_hash     text        not null,
  user_agent  text,

  created_at       timestamptz not null default now(),
  -- Null means the send did not succeed. These are the columns to check first
  -- when someone says they never got a reply.
  notified_at      timestamptz,
  acknowledged_at  timestamptz
);

comment on table public.rate_requests is
  'Rate requests from the public form. Written by the rate-request Edge Function only.';
comment on column public.rate_requests.ip_hash is
  'SHA-256 of the client IP. Used only to rate limit; never reversed or displayed.';
comment on column public.rate_requests.notified_at is
  'When Seahive was emailed. Null means that send failed and the enquiry needs picking up by hand.';

-- The rate limit query: recent rows for one caller.
create index rate_requests_ip_hash_created_at_idx
  on public.rate_requests (ip_hash, created_at desc);

-- Chronological review of the queue.
create index rate_requests_created_at_idx
  on public.rate_requests (created_at desc);

-- RLS on, and deliberately NO policies.
--
-- That combination denies every request that arrives with the anon or
-- authenticated key — which is the entire public surface, since the anon key
-- ships in the page source. The Edge Function uses the service role key, which
-- bypasses RLS. So the only path to this data is through the function, and
-- customer enquiries can never be read by a visitor who reads the JS bundle.
--
-- Adding a policy here would open that up. Don't, unless a signed-in staff
-- dashboard is being built, and then scope it to that role explicitly.
alter table public.rate_requests enable row level security;
