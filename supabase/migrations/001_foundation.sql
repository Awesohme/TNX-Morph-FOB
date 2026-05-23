create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'community_manager'
    check (role in ('admin', 'facilitator', 'community_manager')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  starts_on date,
  ends_on date,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'community_manager'
    check (role in ('admin', 'facilitator', 'community_manager')),
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create table public.config_options (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  category text not null,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  unique (cohort_id, category, value)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  external_id text,
  full_name text,
  email text,
  whatsapp text,
  source text,
  accepted boolean not null default false,
  onboarding_complete boolean not null default false,
  attendance jsonb not null default '{}'::jsonb,
  submissions jsonb not null default '{}'::jsonb,
  mvp_status text not null default 'Not Started',
  demo_status text not null default 'Not Presented',
  risk text not null default 'Green',
  cm_owner text,
  last_contact date,
  next_action text,
  cert_eligible boolean not null default false,
  badge_issued boolean not null default false,
  alumni_joined boolean not null default false,
  notes text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.assignment_reviews (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week text,
  assignment text,
  participant_name text,
  submission_link text,
  submitted boolean not null default false,
  reviewer text,
  review_status text not null default 'Not Reviewed',
  feedback_sent boolean not null default false,
  resubmission_needed boolean not null default false,
  final_status text,
  quality_score numeric,
  feedback_summary text,
  deadline date,
  review_due date,
  notes text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.weekly_ops_tasks (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week text,
  day text,
  action text not null,
  owner text,
  support text,
  channel text,
  due_time text,
  status text not null default 'Not Started',
  evidence_link text,
  notes text,
  priority text not null default 'Medium',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.session_readiness (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week text,
  session_date date,
  session_lead text,
  topic text,
  checklist jsonb not null default '{}'::jsonb,
  support_assigned text,
  readiness_score numeric not null default 0,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.recruitment_channels (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  channel text not null,
  target_audience text,
  target_registrations integer not null default 0,
  registrations integer not null default 0,
  accepted integer not null default 0,
  joined_whatsapp integer not null default 0,
  joined_classroom integer not null default 0,
  attended_week_1 integer not null default 0,
  active_by_week_3 integer not null default 0,
  graduated integer not null default 0,
  notes text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.cm_reports (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week text,
  cm text,
  prompts_posted boolean not null default false,
  attendance_updated boolean not null default false,
  submissions_updated boolean not null default false,
  silent_students integer not null default 0,
  stuck_students integer not null default 0,
  escalations_raised integer not null default 0,
  weekly_report_sent boolean not null default false,
  energy_level text,
  key_concerns text,
  next_actions text,
  status text not null default 'Not Started',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week text,
  content_type text,
  student_product text,
  asset_needed text,
  permission_granted boolean not null default false,
  owner text,
  due_date date,
  status text not null default 'Not Started',
  caption_drafted boolean not null default false,
  posted boolean not null default false,
  reposted boolean not null default false,
  link text,
  notes text,
  priority text not null default 'Medium',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  partner_platform text not null,
  contact text,
  incentive_requested text,
  target_beneficiaries text,
  status text not null default 'Not Started',
  owner text,
  last_contact date,
  next_follow_up date,
  value text,
  evidence_link text,
  notes text,
  priority text not null default 'Medium',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.alumni (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text,
  email text,
  whatsapp text,
  product text,
  mvp_link text,
  certificate_issued boolean not null default false,
  badge_issued boolean not null default false,
  posted_online boolean not null default false,
  reposted_by_tnx boolean not null default false,
  alumni_group_joined boolean not null default false,
  next_step text,
  support_needed text,
  follow_up_date date,
  notes text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function public.can_access_cohort(target_cohort_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_app_role() = 'admin'
    or exists (
      select 1
      from public.cohort_members
      where cohort_id = target_cohort_id and user_id = auth.uid()
    )
$$;

create or replace function public.claim_first_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where role = 'admin' and is_active = true) then
    raise exception 'An active admin already exists';
  end if;

  insert into public.profiles (id, email, role, is_active)
  values (auth.uid(), auth.jwt() ->> 'email', 'admin', true)
  on conflict (id) do update
  set role = 'admin', is_active = true, email = excluded.email, updated_at = now();
end;
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.can_access_cohort(uuid) from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_access_cohort(uuid) to authenticated;
grant execute on function public.claim_first_admin() to authenticated;

create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger touch_cohorts_updated_at
before update on public.cohorts
for each row execute function public.touch_updated_at();

create trigger touch_cohort_members_updated_at
before update on public.cohort_members
for each row execute function public.touch_updated_at();

create trigger touch_config_options_updated_at
before update on public.config_options
for each row execute function public.touch_updated_at();

create trigger touch_participants_updated_at
before update on public.participants
for each row execute function public.touch_updated_at();

create trigger touch_assignment_reviews_updated_at
before update on public.assignment_reviews
for each row execute function public.touch_updated_at();

create trigger touch_weekly_ops_tasks_updated_at
before update on public.weekly_ops_tasks
for each row execute function public.touch_updated_at();

create trigger touch_session_readiness_updated_at
before update on public.session_readiness
for each row execute function public.touch_updated_at();

create trigger touch_recruitment_channels_updated_at
before update on public.recruitment_channels
for each row execute function public.touch_updated_at();

create trigger touch_cm_reports_updated_at
before update on public.cm_reports
for each row execute function public.touch_updated_at();

create trigger touch_content_items_updated_at
before update on public.content_items
for each row execute function public.touch_updated_at();

create trigger touch_partnerships_updated_at
before update on public.partnerships
for each row execute function public.touch_updated_at();

create trigger touch_alumni_updated_at
before update on public.alumni
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.config_options enable row level security;
alter table public.participants enable row level security;
alter table public.assignment_reviews enable row level security;
alter table public.weekly_ops_tasks enable row level security;
alter table public.session_readiness enable row level security;
alter table public.recruitment_channels enable row level security;
alter table public.cm_reports enable row level security;
alter table public.content_items enable row level security;
alter table public.partnerships enable row level security;
alter table public.alumni enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (public.current_app_role() is not null);
create policy profiles_update_admin on public.profiles for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy cohorts_read on public.cohorts for select to authenticated using (public.current_app_role() is not null);
create policy cohorts_write_admin on public.cohorts for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy cohort_members_read on public.cohort_members for select to authenticated using (public.current_app_role() is not null);
create policy cohort_members_write_admin on public.cohort_members for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy audit_logs_read_admin on public.audit_logs for select to authenticated using (public.current_app_role() = 'admin');
create policy audit_logs_insert_admin on public.audit_logs for insert to authenticated with check (public.current_app_role() = 'admin');

create policy config_options_read on public.config_options for select to authenticated using (cohort_id is null or public.can_access_cohort(cohort_id));
create policy config_options_write_ops on public.config_options for all to authenticated using (public.current_app_role() in ('admin', 'facilitator')) with check (public.current_app_role() in ('admin', 'facilitator'));

create policy participants_read on public.participants for select to authenticated using (public.can_access_cohort(cohort_id));
create policy participants_write_ops on public.participants for all to authenticated using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy assignment_reviews_read on public.assignment_reviews for select to authenticated using (public.can_access_cohort(cohort_id));
create policy assignment_reviews_write_ops on public.assignment_reviews for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

create policy weekly_ops_tasks_read on public.weekly_ops_tasks for select to authenticated using (public.can_access_cohort(cohort_id));
create policy weekly_ops_tasks_write_ops on public.weekly_ops_tasks for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

create policy session_readiness_read on public.session_readiness for select to authenticated using (public.can_access_cohort(cohort_id));
create policy session_readiness_write_ops on public.session_readiness for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

create policy recruitment_channels_read on public.recruitment_channels for select to authenticated using (public.can_access_cohort(cohort_id));
create policy recruitment_channels_write_ops on public.recruitment_channels for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

create policy cm_reports_read on public.cm_reports for select to authenticated using (public.can_access_cohort(cohort_id));
create policy cm_reports_write_ops on public.cm_reports for all to authenticated using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy content_items_read on public.content_items for select to authenticated using (public.can_access_cohort(cohort_id));
create policy content_items_write_ops on public.content_items for all to authenticated using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy partnerships_read on public.partnerships for select to authenticated using (public.can_access_cohort(cohort_id));
create policy partnerships_write_ops on public.partnerships for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

create policy alumni_read on public.alumni for select to authenticated using (public.can_access_cohort(cohort_id));
create policy alumni_write_ops on public.alumni for all to authenticated using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id)) with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

insert into public.cohorts (slug, name, description, status)
values ('morph-cohort-2', 'Morph by TNX Cohort 2', 'Operations control room migrated from the Cohort 2 workbook.', 'planning')
on conflict (slug) do nothing;

insert into public.config_options (cohort_id, category, label, value, sort_order)
select c.id, seed.category, seed.label, seed.value, seed.sort_order
from public.cohorts c
cross join (
  values
    ('status', 'Not Started', 'Not Started', 10),
    ('status', 'In Progress', 'In Progress', 20),
    ('status', 'Done', 'Done', 30),
    ('status', 'Blocked', 'Blocked', 40),
    ('status', 'Deferred', 'Deferred', 50),
    ('risk', 'Green', 'Green', 10),
    ('risk', 'Amber', 'Amber', 20),
    ('risk', 'Red', 'Red', 30),
    ('yes_no', 'Yes', 'Yes', 10),
    ('yes_no', 'No', 'No', 20),
    ('mvp_status', 'Not Started', 'Not Started', 10),
    ('mvp_status', 'In Progress', 'In Progress', 20),
    ('mvp_status', 'Almost Done', 'Almost Done', 30),
    ('mvp_status', 'Completed', 'Completed', 40),
    ('demo_status', 'Not Presented', 'Not Presented', 10),
    ('demo_status', 'Live Presented', 'Live Presented', 20),
    ('demo_status', 'Recorded Submitted', 'Recorded Submitted', 30),
    ('demo_status', 'Pending Recording', 'Pending Recording', 40),
    ('review_status', 'Not Reviewed', 'Not Reviewed', 10),
    ('review_status', 'In Review', 'In Review', 20),
    ('review_status', 'Feedback Sent', 'Feedback Sent', 30),
    ('review_status', 'Needs Resubmission', 'Needs Resubmission', 40),
    ('review_status', 'Closed', 'Closed', 50),
    ('priority', 'Low', 'Low', 10),
    ('priority', 'Medium', 'Medium', 20),
    ('priority', 'High', 'High', 30)
) as seed(category, label, value, sort_order)
where c.slug = 'morph-cohort-2'
on conflict (cohort_id, category, value) do nothing;
