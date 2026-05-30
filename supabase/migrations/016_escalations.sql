-- Round 5: Safeguarding escalations (grounded in the TNX Solve Safeguarding Policy).
-- Staff raise an escalation against a participant with a category, severity, notes, and
-- optional evidence file (stored in the existing storage bucket under escalations/).
-- Shown on the participant profile with an updatable status.

create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  participant_name text,
  category text not null,
  severity text not null default 'Medium',
  notes text,
  evidence_bucket text,
  evidence_path text,
  status text not null default 'Pending review',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists escalations_cohort_idx on public.escalations(cohort_id);
create index if not exists escalations_participant_idx on public.escalations(participant_id);

-- Keep updated_at fresh on writes (matches the pattern used by other tables).
create or replace function public.set_escalations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists escalations_set_updated_at on public.escalations;
create trigger escalations_set_updated_at
  before update on public.escalations
  for each row execute function public.set_escalations_updated_at();

alter table public.escalations enable row level security;

-- Service-role (server actions) bypasses RLS; no anon policies — escalations are staff-only.
