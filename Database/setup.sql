-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  score integer not null check (score >= 0),
  right_count integer not null default 0 check (right_count >= 0),
  max_combo integer not null default 0 check (max_combo >= 0),
  updated_at timestamptz not null default now()
);

-- Names are unique ignoring letter case and surrounding whitespace.
create unique index if not exists scores_name_unique_ci
  on public.scores (lower(btrim(name)));

alter table public.scores enable row level security;
-- Players may read only their own full row. The leaderboard RPC returns minimal fields.
-- All writes must pass through submit_score(), which derives user_id from auth.uid().
revoke all on public.scores from public, anon, authenticated;
grant select on public.scores to authenticated;

-- Remove legacy/custom policies so an older permissive policy cannot widen access.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'scores'
  loop
    execute format('drop policy %I on public.scores', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Players can read own score"
  on public.scores for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.submit_score(
  p_name text,
  p_score integer,
  p_right_count integer,
  p_max_combo integer
)
returns setof public.scores
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  clean_name text := btrim(coalesce(p_name, ''));
  saved_row public.scores;
  full_runs integer;
  remainder_count integer;
  full_run_score bigint;
  remainder_score bigint;
  max_possible_score bigint;
begin
  -- Never accept a user_id from the client: the session owns the row.
  if player_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 16 then
    raise exception 'Name must contain 1 to 16 characters';
  end if;
  if p_score is null or p_score < 0 or p_right_count is null or p_right_count < 0 or p_max_combo is null or p_max_combo < 0 then
    raise exception 'Score values must be zero or greater';
  end if;

  -- A correct answer is followed by a 450 ms transition and the round lasts 60 seconds.
  -- This is a sanity ceiling only; client-submitted game results are never authoritative.
  if p_right_count > 134
     or p_max_combo > p_right_count
     or (p_right_count = 0 and p_max_combo <> 0)
     or (p_right_count > 0 and p_max_combo = 0) then
    raise exception using errcode = '22023', message = 'invalid_score_claim';
  end if;

  if p_right_count = 0 then
    max_possible_score := 0;
  else
    full_runs := p_right_count / p_max_combo;
    remainder_count := p_right_count % p_max_combo;
    full_run_score := case
      when p_max_combo <= 5 then p_max_combo::bigint * (p_max_combo::bigint + 9)
      else 20::bigint * p_max_combo - 30
    end;
    remainder_score := case
      when remainder_count <= 5 then remainder_count::bigint * (remainder_count::bigint + 9)
      else 20::bigint * remainder_count - 30
    end;
    max_possible_score := full_runs::bigint * full_run_score + remainder_score;
  end if;

  if p_score::bigint < p_right_count::bigint * 10
     or p_score::bigint > max_possible_score then
    raise exception using errcode = '22023', message = 'invalid_score_claim';
  end if;

  if exists (
    select 1 from public.scores
    where lower(btrim(name)) = lower(clean_name)
      and user_id <> player_id
  ) then
    raise exception using errcode = '23505', message = 'duplicate_player_name';
  end if;

  begin
    insert into public.scores as existing (user_id, name, score, right_count, max_combo)
    values (player_id, clean_name, p_score, p_right_count, p_max_combo)
    on conflict (user_id) do update set
      score = greatest(existing.score, excluded.score),
      right_count = case when excluded.score > existing.score then excluded.right_count else existing.right_count end,
      max_combo = case when excluded.score > existing.score then excluded.max_combo else existing.max_combo end,
      updated_at = case when excluded.score > existing.score then now() else existing.updated_at end
    returning * into saved_row;
  exception when unique_violation then
    -- Also handle two players claiming the same name at nearly the same time.
    raise exception using errcode = '23505', message = 'duplicate_player_name';
  end;

  return next saved_row;
end;
$$;

revoke all on function public.submit_score(text, integer, integer, integer) from public, anon;
revoke all on function public.submit_score(text, integer, integer, integer) from authenticated;
grant execute on function public.submit_score(text, integer, integer, integer) to authenticated;

create or replace function public.get_leaderboard()
returns table (rank_no bigint, name text, score integer, is_you boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    row_number() over (order by s.score desc, s.updated_at asc, s.user_id asc),
    s.name,
    s.score,
    s.user_id = auth.uid()
  from public.scores as s
  order by s.score desc, s.updated_at asc, s.user_id asc
  limit 100;
$$;

revoke all on function public.get_leaderboard() from public, anon, authenticated;
grant execute on function public.get_leaderboard() to authenticated;

create or replace function public.get_player_rank()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*)::bigint + 1
    from public.scores as other
    where other.score > own.score
       or (other.score = own.score and other.updated_at < own.updated_at)
       or (other.score = own.score and other.updated_at = own.updated_at and other.user_id < own.user_id)
  )
  from public.scores as own
  where own.user_id = auth.uid();
$$;

revoke all on function public.get_player_rank() from public, anon, authenticated;
grant execute on function public.get_player_rank() to authenticated;

-- Enable Supabase Realtime for the leaderboard, if the publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'scores'
     ) then
    execute 'alter publication supabase_realtime add table public.scores';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin accounts
-- ---------------------------------------------------------------------------
-- ระบบหลังบ้าน (ตาราง admin_users, การ hash รหัสผ่าน, session, audit log,
-- การแบนผู้เล่น และ RPC ทั้งหมด) ถูกย้ายไปอยู่ที่ Database/admin_system.sql
-- ให้รันไฟล์นั้นต่อจากไฟล์นี้หนึ่งครั้ง
--
-- หมายเหตุ: เวอร์ชันเดิมของไฟล์นี้เคยสร้าง admin_users พร้อมรหัสผ่านแบบ
-- plaintext และล้างข้อมูลแอดมินทุกครั้งที่รัน ซึ่งทำให้ตั้งรหัสผ่านใหม่ไม่ได้
-- ตอนนี้ตัดส่วนนั้นออกแล้ว เพื่อไม่ให้ทับรหัสผ่านที่เปลี่ยนไว้แล้ว

-- Read-only score statistics used by the admin dashboard. public.scores is only
-- read here; no score rows, columns, or policies are modified.
create or replace function public.admin_private_score_stats()
returns table (player_count bigint, average_score numeric, highest_score integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint, coalesce(avg(s.score), 0), coalesce(max(s.score), 0)::integer
  from public.scores as s;
$$;
revoke all on function public.admin_private_score_stats() from public, anon, authenticated;
grant execute on function public.admin_private_score_stats() to service_role;
