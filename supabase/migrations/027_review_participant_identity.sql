-- Bind reviews to participant identity. Names remain display snapshots, not match keys.
-- Only unambiguous legacy rows are backfilled; ambiguous rows remain for staff review.
alter table public.assignment_reviews
  add column if not exists participant_id uuid references public.participants(id) on delete set null;

with unique_names as (
  select cohort_id,
    lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) as name_key,
    min(id::text)::uuid as participant_id
  from public.participants
  where nullif(btrim(full_name), '') is not null
  group by cohort_id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g'))
  having count(*) = 1
), candidates as (
  select r.id, r.cohort_id, r.week, p.participant_id,
    count(*) over (partition by r.cohort_id, p.participant_id, r.week) as matches
  from public.assignment_reviews r
  join unique_names p on p.cohort_id = r.cohort_id
    and p.name_key = lower(regexp_replace(btrim(r.participant_name), '\s+', ' ', 'g'))
  where r.participant_id is null
)
update public.assignment_reviews r
set participant_id = c.participant_id
from candidates c
where r.id = c.id and c.matches = 1
  and not exists (
    select 1 from public.assignment_reviews bound
    where bound.cohort_id = c.cohort_id and bound.participant_id = c.participant_id
      and bound.week is not distinct from c.week
  );

-- NULL identities keep legacy rows intact. Real submissions always have a week and ID.
create unique index if not exists assignment_reviews_participant_week_key
  on public.assignment_reviews (cohort_id, participant_id, week);

-- Archive OLD under the same row lock as the replacement update. This preserves a
-- review saved concurrently with an upload, including decisions on unsubmitted rows.
create or replace function public.archive_review_before_resubmission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.review_status <> 'Not Reviewed'
    or old.quality_score is not null
    or nullif(btrim(old.feedback_summary), '') is not null
    or nullif(btrim(old.final_status), '') is not null
    or old.feedback_sent or old.resubmission_needed then
    insert into public.activity_events (
      cohort_id, source_record_type, source_record_id, event_type, title, description, payload
    ) values (
      old.cohort_id, 'reviews', old.id, 'review_archived',
      'Previous review preserved before resubmission',
      'A replacement worksheet returned this activity to the review queue.',
      jsonb_build_object('previous_review', to_jsonb(old))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists archive_review_before_resubmission on public.assignment_reviews;
create trigger archive_review_before_resubmission
before update on public.assignment_reviews
for each row
when (new.submitted and new.review_status = 'Not Reviewed'
  and new.submitted_at is distinct from old.submitted_at)
execute function public.archive_review_before_resubmission();
