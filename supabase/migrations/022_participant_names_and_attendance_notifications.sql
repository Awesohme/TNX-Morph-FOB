alter table public.participants
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.participants
set
  first_name = nullif(split_part(trim(coalesce(full_name, '')), ' ', 1), ''),
  last_name = nullif(trim(regexp_replace(trim(coalesce(full_name, '')), '^\S+\s*', '')), '')
where coalesce(trim(full_name), '') <> ''
  and (first_name is null or last_name is null);

update public.participants
set full_name = nullif(trim(concat_ws(' ', first_name, last_name)), '')
where coalesce(trim(full_name), '') = ''
  and coalesce(trim(concat_ws(' ', first_name, last_name)), '') <> '';

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('mention', 'task_assigned', 'announcement', 'attendance'));
