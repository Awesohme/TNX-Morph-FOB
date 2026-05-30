-- Round 5: Attendance via a public sign-in/out page (like the submission page).
-- One row per participant per week; participant signs in (signed_in_at) and later signs
-- out (signed_out_at) from the public /attendance/[slug] page.

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  week text not null,
  signed_in_at timestamptz,
  signed_out_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cohort_id, participant_id, week)
);

create index if not exists attendance_cohort_idx on public.attendance(cohort_id);

alter table public.attendance enable row level security;

-- Writes happen via the service-role client in a server action (the public page is
-- unauthenticated but validates the participant belongs to the cohort), so no anon
-- policies are needed. Service-role bypasses RLS.
