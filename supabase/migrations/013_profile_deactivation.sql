-- Distinguish a deliberately *deactivated* user from a not-yet-activated (pending) invite.
-- is_active already gates access; deactivated_at lets us filter/label deactivated accounts
-- without losing their data or authorship.
alter table public.profiles
  add column if not exists deactivated_at timestamptz;
