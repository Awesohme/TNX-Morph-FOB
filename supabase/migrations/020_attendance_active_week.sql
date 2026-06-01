-- Tie attendance to a single active class/week, and collect session feedback.
-- attendance_week on cohorts = the week the public attendance page is currently collecting
-- for (set by admin before each session). session_summary/feedback on attendance let
-- participants leave notes on sign-in and feedback on sign-out.
alter table public.cohorts
  add column if not exists attendance_week text;

alter table public.attendance
  add column if not exists session_summary text,
  add column if not exists feedback text;
