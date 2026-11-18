-- Run in Neon → SQL Editor → branch main → Run.
-- Private contact records; only connect via Vercel's server-side DATABASE_URL.
-- Do not put DATABASE_URL in index.html or client-side JavaScript.
CREATE TABLE IF NOT EXISTS public.anc_preregistrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  consent_email boolean NOT NULL CHECK (consent_email = true),
  source text NOT NULL DEFAULT 'anc-priority-landing',
  created_at timestamptz NOT NULL DEFAULT now(),
  priority_email_sent_at timestamptz,
  team_registration_completed_at timestamptz,
  final_spot_confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS anc_preregistrations_created_at_idx
  ON public.anc_preregistrations (created_at DESC);

-- Optional verification query (run after submitting from the live site):
-- SELECT full_name, email, phone, created_at
-- FROM public.anc_preregistrations ORDER BY created_at DESC LIMIT 30;
