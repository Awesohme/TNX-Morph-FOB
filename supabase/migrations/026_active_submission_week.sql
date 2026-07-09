-- Active submission week on cohorts = the single week the public submission page is
-- currently collecting. This mirrors attendance_week, but keeps a submission-only label.

alter table public.cohorts
  add column if not exists submission_week text,
  add column if not exists submission_label text;
