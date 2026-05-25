create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  task_type text not null default 'follow_up',
  title text not null,
  description text,
  status text not null default 'Open'
    check (status in ('Open', 'In Progress', 'Blocked', 'Done', 'Closed')),
  priority text not null default 'Medium'
    check (priority in ('Low', 'Medium', 'High')),
  due_at timestamptz,
  assigned_to uuid references public.profiles(id),
  assigned_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  event_type text not null,
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  file_name text not null,
  file_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  module_key text not null,
  title text not null,
  body text not null,
  channel text not null default 'internal_note',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.workflow_rules (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  module_key text not null,
  trigger_event text not null
    check (trigger_event in ('record_created', 'record_updated')),
  field_name text,
  comparator text not null default 'equals'
    check (comparator in ('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'truthy')),
  expected_value text,
  output_action text not null
    check (output_action in ('create_task', 'add_activity')),
  task_title text,
  task_description text,
  task_priority text default 'Medium'
    check (task_priority in ('Low', 'Medium', 'High')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  workflow_rule_id uuid references public.workflow_rules(id) on delete set null,
  source_record_type text not null,
  source_record_id uuid not null,
  trigger_event text not null,
  status text not null default 'completed'
    check (status in ('completed', 'skipped', 'failed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create trigger touch_tasks_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create trigger touch_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

create trigger touch_message_templates_updated_at
before update on public.message_templates
for each row execute function public.touch_updated_at();

create trigger touch_workflow_rules_updated_at
before update on public.workflow_rules
for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.attachments enable row level security;
alter table public.message_templates enable row level security;
alter table public.workflow_rules enable row level security;
alter table public.workflow_runs enable row level security;

create policy tasks_read on public.tasks
for select to authenticated
using (public.can_access_cohort(cohort_id));

create policy tasks_write on public.tasks
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy comments_read on public.comments
for select to authenticated
using (public.can_access_cohort(cohort_id));

create policy comments_write on public.comments
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy activity_events_read on public.activity_events
for select to authenticated
using (public.can_access_cohort(cohort_id));

create policy activity_events_write on public.activity_events
for insert to authenticated
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy attachments_read on public.attachments
for select to authenticated
using (public.can_access_cohort(cohort_id));

create policy attachments_write on public.attachments
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

create policy message_templates_read on public.message_templates
for select to authenticated
using (cohort_id is null or public.can_access_cohort(cohort_id));

create policy message_templates_write on public.message_templates
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator'))
with check (public.current_app_role() in ('admin', 'facilitator'));

create policy workflow_rules_read on public.workflow_rules
for select to authenticated
using (cohort_id is null or public.can_access_cohort(cohort_id));

create policy workflow_rules_write on public.workflow_rules
for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy workflow_runs_read on public.workflow_runs
for select to authenticated
using (public.can_access_cohort(cohort_id));

create policy workflow_runs_write on public.workflow_runs
for insert to authenticated
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

insert into public.message_templates (cohort_id, module_key, title, body, channel)
select c.id, seed.module_key, seed.title, seed.body, seed.channel
from public.cohorts c
cross join (
  values
    ('participants', 'Risk escalation note', 'Participant has moved into a high-risk state. Confirm next touchpoint, owner, and remediation plan.', 'internal_note'),
    ('reviews', 'Feedback follow-up', 'Review is pending learner follow-up. Confirm reviewer owner and next response date.', 'internal_note'),
    ('community', 'Silent learner check-in', 'Learner has gone silent this week. Record outreach channel, issue summary, and next check-in date.', 'internal_note'),
    ('partnerships', 'Partnership follow-up', 'Prepare follow-up message, expected ask, and target response date.', 'internal_note')
) as seed(module_key, title, body, channel)
where c.slug = 'morph-cohort-2'
on conflict do nothing;

insert into public.workflow_rules (
  cohort_id,
  module_key,
  trigger_event,
  field_name,
  comparator,
  expected_value,
  output_action,
  task_title,
  task_description,
  task_priority
)
select
  c.id,
  seed.module_key,
  seed.trigger_event,
  seed.field_name,
  seed.comparator,
  seed.expected_value,
  seed.output_action,
  seed.task_title,
  seed.task_description,
  seed.task_priority
from public.cohorts c
cross join (
  values
    ('participants', 'record_updated', 'risk', 'equals', 'Red', 'create_task', 'Escalate participant risk', 'Participant requires immediate follow-up and resolution owner.', 'High'),
    ('assignment_reviews', 'record_updated', 'review_status', 'equals', 'Needs Resubmission', 'create_task', 'Coordinate resubmission', 'Review outcome requires a learner follow-up plan.', 'Medium'),
    ('weekly_ops_tasks', 'record_updated', 'status', 'equals', 'Blocked', 'create_task', 'Resolve blocked ops task', 'Task is blocked and needs intervention before delivery risk increases.', 'High'),
    ('session_readiness', 'record_updated', 'support_assigned', 'equals', '', 'create_task', 'Assign session support', 'Session readiness record has no support owner assigned.', 'Medium'),
    ('community', 'record_updated', 'escalations_raised', 'greater_than', '0', 'create_task', 'Review learner escalation', 'Community report contains at least one escalation that needs follow-up.', 'High')
) as seed(module_key, trigger_event, field_name, comparator, expected_value, output_action, task_title, task_description, task_priority)
where c.slug = 'morph-cohort-2'
on conflict do nothing;
