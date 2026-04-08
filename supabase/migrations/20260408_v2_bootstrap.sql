create extension if not exists "pgcrypto";

create table if not exists public.seasons (
  id text primary key,
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_current boolean not null default false
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_seed text not null,
  tagline text not null default '',
  featured_medal_code text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions_private (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  date_key text not null,
  duration_ms bigint not null,
  edges integer not null default 0,
  used_porn boolean not null default false,
  ejaculated boolean not null default false,
  note text,
  perceived_arousal integer,
  stop_reason text,
  segments jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  plan_snapshot jsonb
);

create table if not exists public.session_metrics (
  session_id text primary key references public.sessions_private (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date_key text not null,
  total_score numeric,
  grade text,
  control_score numeric,
  capacity_score numeric,
  stability_score numeric,
  cei_score numeric,
  rci_score numeric,
  pdi_score numeric,
  hw numeric,
  stim_minutes numeric,
  rest_penalty numeric
);

create table if not exists public.medal_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  medal_code text not null,
  season_id text references public.seasons (id) on delete set null,
  family text not null,
  tier text not null,
  name text not null,
  description text not null,
  motto text not null,
  public_visible boolean not null default true,
  unlocked_at timestamptz not null,
  source_session_id text,
  primary key (user_id, medal_code)
);

create table if not exists public.season_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id text not null references public.seasons (id) on delete cascade,
  ladder_score integer not null,
  tier text not null,
  division text not null,
  percentile numeric not null default 0,
  progress_to_next numeric not null default 0,
  change_value integer not null default 0,
  promotion_zone boolean not null default false,
  relegation_zone boolean not null default false,
  provisional boolean not null default true,
  mastery_score numeric not null,
  growth_score numeric,
  consistency_score numeric not null,
  confidence_score numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

alter table public.profiles enable row level security;
alter table public.sessions_private enable row level security;
alter table public.session_metrics enable row level security;
alter table public.medal_unlocks enable row level security;
alter table public.season_ratings enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = user_id);

drop policy if exists "sessions_private_select_self" on public.sessions_private;
create policy "sessions_private_select_self" on public.sessions_private
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_private_write_self" on public.sessions_private;
create policy "sessions_private_write_self" on public.sessions_private
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "session_metrics_select_self" on public.session_metrics;
create policy "session_metrics_select_self" on public.session_metrics
  for select using (auth.uid() = user_id);

drop policy if exists "session_metrics_write_self" on public.session_metrics;
create policy "session_metrics_write_self" on public.session_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "medal_unlocks_select_self" on public.medal_unlocks;
create policy "medal_unlocks_select_self" on public.medal_unlocks
  for select using (auth.uid() = user_id);

drop policy if exists "medal_unlocks_write_self" on public.medal_unlocks;
create policy "medal_unlocks_write_self" on public.medal_unlocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "season_ratings_select_self" on public.season_ratings;
create policy "season_ratings_select_self" on public.season_ratings
  for select using (auth.uid() = user_id);

drop policy if exists "season_ratings_write_self" on public.season_ratings;
create policy "season_ratings_write_self" on public.season_ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.leaderboard_public as
select
  sr.season_id,
  sr.user_id,
  p.display_name,
  p.avatar_seed,
  p.tagline,
  p.featured_medal_code,
  sr.ladder_score,
  sr.tier,
  sr.division,
  sr.percentile,
  sr.progress_to_next,
  sr.change_value,
  sr.promotion_zone,
  sr.relegation_zone,
  sr.provisional,
  sr.mastery_score,
  sr.growth_score,
  sr.consistency_score,
  sr.confidence_score,
  sr.updated_at
from public.season_ratings sr
join public.profiles p on p.user_id = sr.user_id
where p.visibility = 'public';

grant select on public.leaderboard_public to anon, authenticated;

