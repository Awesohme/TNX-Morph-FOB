alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temp_password_issued_at timestamptz;

alter table public.assignment_reviews
  add column if not exists submitted_at timestamptz,
  add column if not exists google_sheet_row_key text,
  add column if not exists google_sheet_row_hash text,
  add column if not exists google_sheet_last_synced_at timestamptz;

alter table public.participants
  add column if not exists google_sheet_row_key text,
  add column if not exists google_sheet_row_hash text,
  add column if not exists google_sheet_last_synced_at timestamptz;

alter table public.weekly_ops_tasks
  add column if not exists google_sheet_row_key text,
  add column if not exists google_sheet_row_hash text,
  add column if not exists google_sheet_last_synced_at timestamptz;

alter table public.session_readiness
  add column if not exists google_sheet_row_key text,
  add column if not exists google_sheet_row_hash text,
  add column if not exists google_sheet_last_synced_at timestamptz;

alter table public.cm_reports
  add column if not exists google_sheet_row_key text,
  add column if not exists google_sheet_row_hash text,
  add column if not exists google_sheet_last_synced_at timestamptz;

alter table public.resources
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

alter table public.attachments
  alter column file_url drop not null;

alter table public.attachments
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

create table if not exists public.google_sheet_sync_configs (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  dataset_key text not null,
  spreadsheet_id text not null,
  sheet_name text not null,
  enabled boolean not null default true,
  header_row integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  unique (cohort_id, dataset_key)
);

create table if not exists public.google_sheet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  dataset_key text not null,
  direction text not null check (direction in ('pull', 'push', 'full')),
  status text not null check (status in ('running', 'completed', 'failed')),
  message text,
  rows_pulled integer not null default 0,
  rows_pushed integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  initiated_by uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists participants_google_sheet_row_key_idx on public.participants (cohort_id, google_sheet_row_key);
create index if not exists assignment_reviews_google_sheet_row_key_idx on public.assignment_reviews (cohort_id, google_sheet_row_key);
create index if not exists weekly_ops_tasks_google_sheet_row_key_idx on public.weekly_ops_tasks (cohort_id, google_sheet_row_key);
create index if not exists session_readiness_google_sheet_row_key_idx on public.session_readiness (cohort_id, google_sheet_row_key);
create index if not exists cm_reports_google_sheet_row_key_idx on public.cm_reports (cohort_id, google_sheet_row_key);
create index if not exists google_sheet_sync_configs_cohort_dataset_idx on public.google_sheet_sync_configs (cohort_id, dataset_key);
create index if not exists google_sheet_sync_runs_cohort_started_idx on public.google_sheet_sync_runs (cohort_id, started_at desc);

alter table public.google_sheet_sync_configs enable row level security;
alter table public.google_sheet_sync_runs enable row level security;

drop policy if exists google_sheet_sync_configs_read on public.google_sheet_sync_configs;
create policy google_sheet_sync_configs_read on public.google_sheet_sync_configs
for select to authenticated
using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

drop policy if exists google_sheet_sync_configs_write on public.google_sheet_sync_configs;
create policy google_sheet_sync_configs_write on public.google_sheet_sync_configs
for all to authenticated
using (public.current_app_role() = 'admin' and public.can_access_cohort(cohort_id))
with check (public.current_app_role() = 'admin' and public.can_access_cohort(cohort_id));

drop policy if exists google_sheet_sync_runs_read on public.google_sheet_sync_runs;
create policy google_sheet_sync_runs_read on public.google_sheet_sync_runs
for select to authenticated
using (
  public.current_app_role() in ('admin', 'facilitator')
  and (cohort_id is null or public.can_access_cohort(cohort_id))
);

drop policy if exists google_sheet_sync_runs_write on public.google_sheet_sync_runs;
create policy google_sheet_sync_runs_write on public.google_sheet_sync_runs
for insert to authenticated
with check (
  public.current_app_role() in ('admin', 'facilitator')
  and (cohort_id is null or public.can_access_cohort(cohort_id))
);

drop trigger if exists touch_google_sheet_sync_configs_updated_at on public.google_sheet_sync_configs;
create trigger touch_google_sheet_sync_configs_updated_at
before update on public.google_sheet_sync_configs
for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public)
values ('morph-ops-files', 'morph-ops-files', false)
on conflict (id) do nothing;
