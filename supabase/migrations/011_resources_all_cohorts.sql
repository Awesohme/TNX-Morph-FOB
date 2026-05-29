-- Allow resources to be tagged to "all cohorts" (cohort_id null) instead of a single cohort.
alter table public.resources
  alter column cohort_id drop not null;
