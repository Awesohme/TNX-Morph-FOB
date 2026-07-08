alter table public.cohort_plan_items
add column if not exists assignment_label text;

update public.cohort_plan_items plan
set assignment_label = source.assignment
from (
  select distinct on (cohort_id, week)
    cohort_id,
    week,
    assignment
  from public.assignment_reviews
  where nullif(trim(coalesce(assignment, '')), '') is not null
  order by cohort_id, week, updated_at desc, created_at desc
) as source
where plan.cohort_id = source.cohort_id
  and plan.week_label = source.week
  and nullif(trim(coalesce(plan.assignment_label, '')), '') is null;
