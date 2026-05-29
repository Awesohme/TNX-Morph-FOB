-- Public student worksheet submissions.
-- Adds a per-cohort open/closed flag for the public submission page. All public reads and
-- writes go through server actions using the service-role client, so no anon RLS policies
-- are added here — RLS stays locked to authenticated app roles.

alter table public.cohorts
  add column if not exists submissions_open boolean not null default false;

-- Track where an assignment_reviews submission file lives in storage, so reviewers can open
-- the uploaded worksheet from the Reviews workspace.
alter table public.assignment_reviews
  add column if not exists submission_bucket text,
  add column if not exists submission_path text;

-- Reuse the existing private bucket for uploaded worksheets (created in 006). This is a
-- no-op if it already exists.
insert into storage.buckets (id, name, public)
values ('morph-ops-files', 'morph-ops-files', false)
on conflict (id) do nothing;
