-- In-app notifications: mentions, task assignments, and admin announcements.
-- Writes happen via service-role server actions; users read/update only their own rows.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  type text not null check (type in ('mention', 'task_assigned', 'announcement')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- A user can see and mark their own notifications. Inserts come from the service role.
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
