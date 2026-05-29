-- Cohort 2 delegation rules: route auto-generated tasks to named roles so work
-- moves without funnelling through one person. Adds an optional role label to
-- workflow rules, sets the Cohort 2 start date, and seeds event-driven rules.

-- 1. Let a rule stamp a role label onto the task it creates (e.g. "Session Lead",
--    "CM Lead", "Reviewer"). Tasks already have assigned_label; this carries it
--    from the rule. Unmapped roles surface in a visible queue, not silently on an admin.
alter table public.workflow_rules
  add column if not exists assigned_label text;

-- 2. Cohort 2 start date (Week 0 = Fri 2026-06-12). All time-based due-date
--    offsets derive from this; change it here if the date moves.
update public.cohorts
  set starts_on = coalesce(starts_on, date '2026-06-12'),
      ends_on = coalesce(ends_on, date '2026-06-12' + 56)
  where slug = 'morph-cohort-2';

-- 3. Event-driven delegation rules (trigger on record create/update only).
--    Time-based cadences (weekly ops tasks, "unreviewed > 48h") are handled by
--    the cron sweep, not here, because workflow_rules only fire on record events.
insert into public.workflow_rules (
  cohort_id, module_key, trigger_event, field_name, comparator, expected_value,
  output_action, task_title, task_description, task_priority, assigned_label
)
select
  c.id, seed.module_key, seed.trigger_event, seed.field_name, seed.comparator,
  seed.expected_value, seed.output_action, seed.task_title, seed.task_description,
  seed.task_priority, seed.assigned_label
from public.cohorts c
cross join (
  values
    -- Session readiness gate: checklist not fully complete (score < 1) -> chase the Session Lead.
    ('session_readiness', 'record_updated', 'readiness_score', 'less_than', '1', 'create_task',
     'Finish session prep', 'Slides, activity, assignment brief, recording plan, and reminders must all be ready before the session.', 'High', 'Session Lead'),
    -- Review loop: submitted but not yet reviewed -> reviewer picks it up.
    ('assignment_reviews', 'record_updated', 'review_status', 'equals', 'Not Reviewed', 'create_task',
     'Review submitted assignment', 'A submission is waiting on review. Send feedback and set the review status.', 'High', 'Reviewer'),
    -- Resubmission needed (boolean true) -> CM chases the learner.
    ('assignment_reviews', 'record_updated', 'resubmission_needed', 'truthy', '', 'create_task',
     'Chase resubmission', 'Learner needs to resubmit. Follow up until the final status is closed.', 'Medium', 'CM Owner'),
    -- At-risk participant (manually marked Red) -> CM outreach.
    ('participants', 'record_updated', 'risk', 'equals', 'Red', 'create_task',
     'Outreach to at-risk participant', 'Participant is at risk. Make contact, log the channel, and set the next touchpoint.', 'High', 'CM Owner')
) as seed(module_key, trigger_event, field_name, comparator, expected_value, output_action, task_title, task_description, task_priority, assigned_label)
where c.slug = 'morph-cohort-2'
and not exists (
  select 1 from public.workflow_rules existing
  where existing.cohort_id = c.id
    and existing.module_key = seed.module_key
    and existing.trigger_event = seed.trigger_event
    and coalesce(existing.field_name, '') = coalesce(seed.field_name, '')
    and existing.task_title = seed.task_title
);
