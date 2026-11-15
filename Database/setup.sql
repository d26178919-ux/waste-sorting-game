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
-- All writes must pass through game_finish() in Database/server_scoring.sql,
-- which derives user_id from auth.uid() and computes the score on the server.
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

-- ---------------------------------------------------------------------------
-- Scoring is server-authoritative. The old client-scored submit_score() has
-- been removed from this file on purpose.
--
-- Run Database/server_scoring.sql AFTER this file to install:
--   * public.game_runs
--   * public.game_start()
--   * public.game_answer()
--   * public.game_finish()
-- and to disable the legacy submit_score() path.
-- ---------------------------------------------------------------------------

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
