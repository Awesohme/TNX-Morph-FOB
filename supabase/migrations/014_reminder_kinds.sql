-- Allow the finer-grained reminder slot kinds used by configurable reminders.
alter table public.reminder_deliveries
  drop constraint if exists reminder_deliveries_delivery_kind_check;

alter table public.reminder_deliveries
  add constraint reminder_deliveries_delivery_kind_check
  check (delivery_kind in ('due_soon', 'overdue', 'cm_report_needed', 'before_1d', 'before_3h', 'at_due'));
