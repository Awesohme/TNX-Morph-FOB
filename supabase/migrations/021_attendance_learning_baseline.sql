alter table public.attendance
  add column if not exists topic_baseline text,
  add column if not exists knowledge_before_rating integer check (knowledge_before_rating between 1 and 5),
  add column if not exists session_takeaway text,
  add column if not exists next_step text,
  add column if not exists knowledge_after_rating integer check (knowledge_after_rating between 1 and 5);
