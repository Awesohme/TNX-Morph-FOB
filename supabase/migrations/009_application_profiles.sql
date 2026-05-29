-- Read-only applicant profiles imported from the Accepted/Rejected list.
-- One row per applicant, linked to a participant by email where possible. Surfaced
-- read-only on the participant page. Writes happen only via the admin import script.

create table if not exists public.application_profiles (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,

  -- decision bucket from the workbook sheet name (e.g. Accepted, Re-Apply Next Month)
  decision text,

  -- personal
  first_name text,
  last_name text,
  email text,
  phone text,
  gender text,
  age_range text,
  institution text,
  level_of_study text,
  background text,

  -- background & interest
  built_product_before text,
  bootcamp_interest text,
  has_idea text,
  idea_description text,
  beneficiary text,
  skills_hoping_to_gain text,

  -- community & leadership
  giving_back_importance text,
  contribution_interest text,
  interested_community_lead text,
  community_lead_reason text,
  prior_experience text,
  prior_experience_detail text,
  community_strengths text,

  -- logistics
  scholarship_code text,
  can_commit text,
  anything_else text,
  heard_about_us text,
  has_laptop text,
  has_internet text,
  good_fit_reason text,

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plain unique constraint on email so PostgREST upserts (on_conflict=email) work. The
-- import script lowercases email before writing, so this also enforces case-insensitivity.
alter table public.application_profiles
  add constraint application_profiles_email_key unique (email);
create index if not exists application_profiles_participant_idx on public.application_profiles (participant_id);

alter table public.application_profiles enable row level security;

-- Read-only for any signed-in app role; no write policy (import uses service role).
drop policy if exists application_profiles_read on public.application_profiles;
create policy application_profiles_read on public.application_profiles
  for select to authenticated
  using (public.current_app_role() is not null);

drop trigger if exists touch_application_profiles_updated_at on public.application_profiles;
create trigger touch_application_profiles_updated_at
before update on public.application_profiles
for each row execute function public.touch_updated_at();
