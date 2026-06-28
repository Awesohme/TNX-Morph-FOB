-- Submission open/close schedule on cohorts.
-- submissions_open remains the master switch; optional bounds restrict when the public
-- submission page is live.
alter table public.cohorts
  add column if not exists submissions_opens_at timestamptz,
  add column if not exists submissions_closes_at timestamptz;
