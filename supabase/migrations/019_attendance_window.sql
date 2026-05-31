-- Attendance open/close control on cohorts.
-- attendance_open is the master switch; the optional opens_at/closes_at further restrict to
-- a time window. Attendance is "open" when attendance_open = true AND now is within any set
-- window bounds. Mirrors the submissions_open pattern (migration 008).
alter table public.cohorts
  add column if not exists attendance_open boolean not null default false,
  add column if not exists attendance_opens_at timestamptz,
  add column if not exists attendance_closes_at timestamptz;
