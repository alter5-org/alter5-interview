-- GDPR audit log for consents.
--
-- Until now, consent was stored as two booleans on `applications`
-- (consent_privacy, consent_ai_decision). That's enough for the happy
-- path but not for compliance: we cannot prove WHEN the consent was
-- given, WHICH policy version the candidate agreed to, or the network
-- context at that moment. GDPR Art.7(1) + Art.5(2) ("accountability")
-- require us to be able to demonstrate this, and supervisory authorities
-- routinely ask for the exact wording the user saw.
--
-- Each submission of the application form inserts one row per consent
-- type. The original booleans on `applications` stay (they're faster to
-- read for common queries), but this table is the source of truth for
-- audit + subject-access requests.

create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  consent_type text not null check (consent_type in ('privacy', 'ai_decision', 'human_review')),
  granted boolean not null,
  policy_version text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_events_app
  on consent_events (application_id, created_at desc);

create index if not exists idx_consent_events_type
  on consent_events (consent_type, created_at desc);

alter table consent_events enable row level security;
-- No policies: anon/authenticated can't read. Service role bypasses RLS.
