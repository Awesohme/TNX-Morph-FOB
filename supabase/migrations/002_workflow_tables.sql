create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  source_record_type text,
  source_record_id uuid,
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

alter table public.tasks alter column source_record_type drop not null;
alter table public.tasks alter column source_record_id drop not null;

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

drop trigger if exists touch_tasks_updated_at on public.tasks;
create trigger touch_tasks_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists touch_comments_updated_at on public.comments;
create trigger touch_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

drop trigger if exists touch_message_templates_updated_at on public.message_templates;
create trigger touch_message_templates_updated_at
before update on public.message_templates
for each row execute function public.touch_updated_at();

drop trigger if exists touch_workflow_rules_updated_at on public.workflow_rules;
create trigger touch_workflow_rules_updated_at
before update on public.workflow_rules
for each row execute function public.touch_updated_at();
