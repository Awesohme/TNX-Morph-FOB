-- Round 5: CM report form rework.
-- Per-day prompts tracking (accordion), and participant multi-select for silent/stuck
-- students. The legacy numeric silent_students/stuck_students columns are kept and
-- auto-populated (= array length) on save for back-compat with the dashboard + sheet.

alter table public.cm_reports
  add column if not exists prompts_posted_days jsonb not null default '{}'::jsonb,
  add column if not exists silent_student_ids jsonb not null default '[]'::jsonb,
  add column if not exists stuck_student_ids jsonb not null default '[]'::jsonb;
