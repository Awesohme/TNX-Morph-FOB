-- Per-user task reminder preferences. Each user picks which reminder slots they want
-- (up to three "before due" presets + an overdue nudge). Read by the reminder dispatcher.
create table if not exists public.user_reminder_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  remind_1d boolean not null default true,    -- ~24h before due
  remind_3h boolean not null default false,   -- ~3h before due
  remind_at_due boolean not null default false,
  remind_overdue boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_reminder_prefs enable row level security;

drop policy if exists user_reminder_prefs_rw on public.user_reminder_prefs;
create policy user_reminder_prefs_rw on public.user_reminder_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
