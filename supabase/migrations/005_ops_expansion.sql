create table if not exists public.cohort_plan_items (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week_label text not null,
  sort_order integer not null default 0,
  theme text,
  session_type text,
  live_session_focus text,
  student_output text,
  async_task text,
  review_loop text,
  owner_label text,
  support_label text,
  success_metric text,
  risk text,
  mitigation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text not null,
  resource_type text not null default 'Link'
    check (resource_type in ('Link', 'File', 'Template', 'Recording', 'Assignment Brief', 'Asset', 'Other')),
  week_label text,
  owner_label text,
  url text,
  file_url text,
  notes text,
  status text not null default 'Active'
    check (status in ('Active', 'Draft', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.record_resources (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (resource_id, source_record_type, source_record_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  delivery_kind text not null
    check (delivery_kind in ('due_soon', 'overdue', 'cm_report_needed')),
  status text not null
    check (status in ('sent', 'failed', 'skipped')),
  sent_at timestamptz not null default now(),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tasks_cohort_assignee_status_due_idx
  on public.tasks (cohort_id, assigned_to, status, due_at);

create index if not exists record_resources_record_lookup_idx
  on public.record_resources (source_record_type, source_record_id);

create index if not exists resources_cohort_type_week_idx
  on public.resources (cohort_id, resource_type, week_label);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id, is_active);

create index if not exists reminder_deliveries_task_user_sent_idx
  on public.reminder_deliveries (task_id, user_id, sent_at desc);

alter table public.cohort_plan_items enable row level security;
alter table public.resources enable row level security;
alter table public.record_resources enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_deliveries enable row level security;

drop policy if exists cohort_plan_items_read on public.cohort_plan_items;
create policy cohort_plan_items_read on public.cohort_plan_items
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists cohort_plan_items_write on public.cohort_plan_items;
create policy cohort_plan_items_write on public.cohort_plan_items
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists resources_write on public.resources;
create policy resources_write on public.resources
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists record_resources_read on public.record_resources;
create policy record_resources_read on public.record_resources
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists record_resources_write on public.record_resources;
create policy record_resources_write on public.record_resources
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists push_subscriptions_read on public.push_subscriptions;
create policy push_subscriptions_read on public.push_subscriptions
for select to authenticated
using (user_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists push_subscriptions_write on public.push_subscriptions;
create policy push_subscriptions_write on public.push_subscriptions
for all to authenticated
using (user_id = auth.uid() or public.current_app_role() = 'admin')
with check (user_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists reminder_deliveries_read on public.reminder_deliveries;
create policy reminder_deliveries_read on public.reminder_deliveries
for select to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
  or public.can_access_cohort(cohort_id)
);

drop policy if exists reminder_deliveries_write on public.reminder_deliveries;
create policy reminder_deliveries_write on public.reminder_deliveries
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator') and public.can_access_cohort(cohort_id));

drop trigger if exists touch_cohort_plan_items_updated_at on public.cohort_plan_items;
create trigger touch_cohort_plan_items_updated_at
before update on public.cohort_plan_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_resources_updated_at on public.resources;
create trigger touch_resources_updated_at
before update on public.resources
for each row execute function public.touch_updated_at();

drop trigger if exists touch_push_subscriptions_updated_at on public.push_subscriptions;
create trigger touch_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.touch_updated_at();

insert into public.cohort_plan_items (
  cohort_id,
  week_label,
  sort_order,
  theme,
  session_type,
  live_session_focus,
  student_output,
  async_task,
  review_loop,
  owner_label,
  support_label,
  success_metric,
  risk,
  mitigation
)
select
  c.id,
  seed.week_label,
  seed.sort_order,
  seed.theme,
  seed.session_type,
  seed.live_session_focus,
  seed.student_output,
  seed.async_task,
  seed.review_loop,
  seed.owner_label,
  seed.support_label,
  seed.success_metric,
  seed.risk,
  seed.mitigation
from public.cohorts c
cross join (
  values
    ('Week 0', 0, 'Onboarding', 'Setup', 'Orientation, expectations, tools, channels, rules', 'Joined WhatsApp/Classroom; tool accounts created; intro posted', 'Complete onboarding checklist', 'CM verifies setup before Week 1', 'Iyanu', 'CMs', '90% onboarded before first session', 'Low setup completion', 'Friday reminder + direct support'),
    ('Week 1', 1, 'Product Mindset + Problem Identification', 'Teach + Activity', 'What products solve; spotting real problems; problem statement basics', '3 problems + 1 selected problem', 'Talk to 2–3 people about selected problem', 'CM flags vague problems by Wednesday', 'Olamide', 'CMs', '80% submit problem statement', 'Vague/too broad ideas', 'Share good/bad examples early'),
    ('Week 2', 2, 'Validation + Persona', 'Teach + Guided Work', 'User empathy, validation interviews, personas, solution framing', 'Persona + validated problem statement', 'Validate with 2–3 users and document feedback', 'Facilitator reviews top blockers', 'K', 'CMs', '75% submit persona + validation notes', 'Students skip user research', 'Require 2–3 quotes/screenshots as evidence'),
    ('Week 3', 3, 'UI/UX Foundations', 'Practical Class 1', 'UX vs UI, user flows, wireframes, visual rules', 'User flow + rough wireframe', 'Sketch 1–3 screens', 'Design review queue opens', 'Michael/Kome', 'CMs', '70% submit wireframe', 'Tool/design confusion', 'Simpler examples + templates'),
    ('Week 4', 4, 'Design Clinic + Iteration', 'Practical Class 2', 'Students present designs; facilitator reviews; improve one screen', 'Improved wireframe + one polished screen', 'Apply feedback and submit revised design', 'Reviewer marks feedback applied', 'Michael/Kome', 'CMs', '70% submit improved screen', 'Students do not act on feedback', 'Feedback checklist + resubmission status'),
    ('Week 5', 5, 'AI / No-Code MVP Build', 'Practical Class 1', 'PRD prompting, AI building, no-code options, deployment basics', 'Working core feature or prototype link', 'Ship one core feature; test with 3 people', 'Technical triage queue opens', 'Olamide', 'Sheriff/Blessing', '60% have working core feature', 'MVP build overwhelm', 'Focus on one feature only'),
    ('Week 6', 6, 'Build Clinic + Pitch Prep', 'Practical Class 2', 'Troubleshoot builds; review MVPs; prepare pitch/demo', 'Improved MVP + 5-min pitch outline', 'Submit final MVP link + pitch/recording', 'Final eligibility review', 'Olamide', 'CMs', '10–20 demo-ready graduates', 'Last-minute no-shows', 'Recorded pitch option + deadline'),
    ('Demo Day', 7, 'Showcase', 'Presentation', 'Live/recorded demos, panel feedback, awards, certificates', 'Presentation + alumni onboarding', 'Complete feedback form', 'Certificate/badge issue', 'Olamide', 'Team', 'All eligible receive cert/badge', 'Poor attendance', 'Send links by email + WhatsApp + reminders')
) as seed(week_label, sort_order, theme, session_type, live_session_focus, student_output, async_task, review_loop, owner_label, support_label, success_metric, risk, mitigation)
where c.slug = 'morph-cohort-2'
and not exists (
  select 1
  from public.cohort_plan_items existing
  where existing.cohort_id = c.id
    and existing.week_label = seed.week_label
);
