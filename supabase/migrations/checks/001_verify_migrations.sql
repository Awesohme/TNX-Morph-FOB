-- Read-only verification. Safe to run anytime. Returns one row of true/false flags.
-- All should be true once migrations 006 and 007 are applied.
select
  exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'must_change_password'
  ) as has_must_change_password,
  exists (
    select 1 from information_schema.columns
    where table_name = 'workflow_rules' and column_name = 'assigned_label'
  ) as has_assigned_label,
  exists (
    select 1 from information_schema.tables
    where table_name = 'google_sheet_sync_configs'
  ) as has_sync_configs_table,
  (select count(*) from public.workflow_rules) as workflow_rule_count,
  (select starts_on from public.cohorts where slug = 'morph-cohort-2') as cohort2_starts_on;
