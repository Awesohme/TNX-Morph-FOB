alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.attachments enable row level security;
alter table public.message_templates enable row level security;
alter table public.workflow_rules enable row level security;
alter table public.workflow_runs enable row level security;

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists activity_events_read on public.activity_events;
create policy activity_events_read on public.activity_events
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists activity_events_write on public.activity_events;
create policy activity_events_write on public.activity_events
for insert to authenticated
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id))
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));

drop policy if exists message_templates_read on public.message_templates;
create policy message_templates_read on public.message_templates
for select to authenticated
using (cohort_id is null or public.can_access_cohort(cohort_id));

drop policy if exists message_templates_write on public.message_templates;
create policy message_templates_write on public.message_templates
for all to authenticated
using (public.current_app_role() in ('admin', 'facilitator'))
with check (public.current_app_role() in ('admin', 'facilitator'));

drop policy if exists workflow_rules_read on public.workflow_rules;
create policy workflow_rules_read on public.workflow_rules
for select to authenticated
using (cohort_id is null or public.can_access_cohort(cohort_id));

drop policy if exists workflow_rules_write on public.workflow_rules;
create policy workflow_rules_write on public.workflow_rules
for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists workflow_runs_read on public.workflow_runs;
create policy workflow_runs_read on public.workflow_runs
for select to authenticated
using (public.can_access_cohort(cohort_id));

drop policy if exists workflow_runs_write on public.workflow_runs;
create policy workflow_runs_write on public.workflow_runs
for insert to authenticated
with check (public.current_app_role() in ('admin', 'facilitator', 'community_manager') and public.can_access_cohort(cohort_id));
