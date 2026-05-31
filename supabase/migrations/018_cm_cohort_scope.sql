-- Scope cohort visibility to membership for non-admins.
-- Previously `cohorts_read` let any authenticated role read ALL cohorts, so a community
-- manager saw every cohort's name/metadata. Per-cohort data was already membership-scoped
-- via can_access_cohort(); this brings the cohort list itself in line.
drop policy if exists cohorts_read on public.cohorts;
create policy cohorts_read on public.cohorts
for select to authenticated
using (
  public.current_app_role() = 'admin'
  or exists (
    select 1 from public.cohort_members m
    where m.cohort_id = cohorts.id and m.user_id = auth.uid()
  )
);
