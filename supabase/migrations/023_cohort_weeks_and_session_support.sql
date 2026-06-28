alter table public.cohorts
  add column if not exists week_count integer not null default 6
    check (week_count between 1 and 52);

alter table public.session_readiness
  add column if not exists session_time time,
  add column if not exists support_assigned_id uuid references public.profiles(id);

alter table public.cohort_members
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists touch_cohort_members_updated_at on public.cohort_members;
create trigger touch_cohort_members_updated_at
before update on public.cohort_members
for each row execute function public.touch_updated_at();

create index if not exists session_readiness_support_assigned_idx
  on public.session_readiness (support_assigned_id);

create index if not exists cohort_members_user_cohort_idx
  on public.cohort_members (user_id, cohort_id);
