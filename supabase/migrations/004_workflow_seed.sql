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
and not exists (
  select 1
  from public.message_templates existing
  where existing.cohort_id = c.id
    and existing.module_key = seed.module_key
    and existing.title = seed.title
);

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
and not exists (
  select 1
  from public.workflow_rules existing
  where existing.cohort_id = c.id
    and existing.module_key = seed.module_key
    and existing.trigger_event = seed.trigger_event
    and coalesce(existing.field_name, '') = coalesce(seed.field_name, '')
    and existing.task_title = seed.task_title
);
