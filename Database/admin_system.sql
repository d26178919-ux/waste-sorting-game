-- ---------------------------------------------------------------------------
-- 0) Extension
-- ---------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) ตาราง admin_users (รองรับทั้งการติดตั้งใหม่และการอัปเกรดของเดิม)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id     uuid primary key default gen_random_uuid(),
  username    text not null,
  password_hash text,
  role        text not null default 'editor'
              check (role in ('owner', 'editor', 'viewer')),
  is_active   boolean not null default true,
  must_change_password boolean not null default false,
  created_at  timestamptz not null default now(),
  last_login_at timestamptz,
  -- legacy: เก็บไว้เพื่อความเข้ากันได้กับ setup.sql เดิม แต่จะถูกเคลียร์เป็น ''
  password    text
);

alter table public.admin_users add column if not exists password_hash text;
alter table public.admin_users add column if not exists role text not null default 'editor';
alter table public.admin_users add column if not exists is_active boolean not null default true;
alter table public.admin_users add column if not exists must_change_password boolean not null default false;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists last_login_at timestamptz;
alter table public.admin_users add column if not exists password text;

-- คอลัมน์ legacy ต้องไม่บล็อกการเพิ่มแอดมินใหม่
alter table public.admin_users alter column password drop not null;

-- แปลงรหัสผ่าน plaintext เดิมให้เป็น hash แล้วลบทิ้ง
update public.admin_users
   set password_hash = extensions.crypt(password, extensions.gen_salt('bf', 10)),
       password = '',
       must_change_password = true
 where password_hash is null
   and coalesce(password, '') <> '';

-- ถ้าอัปเกรดจากระบบเดิม (มีแต่ role editor) ให้มี owner อย่างน้อย 1 คน
update public.admin_users
   set role = 'owner'
 where user_id = (
         select user_id from public.admin_users
          order by created_at asc, user_id asc
          limit 1
       )
   and not exists (select 1 from public.admin_users where role = 'owner');

create unique index if not exists admin_users_username_unique_ci
  on public.admin_users (lower(btrim(username)));

alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to service_role;

-- ---------------------------------------------------------------------------
-- 2) ตารางสนับสนุน
-- ---------------------------------------------------------------------------
-- ค่าตั้งของระบบ (singleton 1 แถว) — เก็บเฉพาะ bcrypt hash ของ "รหัสผ่านพิเศษ"
-- ไม่มีทางอ่านค่านี้ออกจากฝั่ง client ได้ (RLS + revoke ทั้งหมด)
create table if not exists public.admin_settings (
  id                    boolean primary key default true,
  special_password_hash text not null,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.admin_users(user_id) on delete set null,
  constraint admin_settings_singleton check (id)
);

create table if not exists public.admin_sessions (
  token_hash   text primary key,
  admin_id     uuid not null references public.admin_users(user_id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index if not exists admin_sessions_admin_idx on public.admin_sessions (admin_id);
create index if not exists admin_sessions_expiry_idx on public.admin_sessions (expires_at);

create table if not exists public.admin_login_attempts (
  username        text primary key,
  fail_count      integer not null default 0,
  first_failed_at timestamptz not null default now(),
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.banned_players (
  user_id    uuid primary key,
  reason     text,
  banned_by  uuid references public.admin_users(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id             bigint generated always as identity primary key,
  admin_id       uuid,
  action         text not null,
  target_user_id uuid,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_sessions enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.banned_players enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_settings enable row level security;

revoke all on public.admin_sessions from public, anon, authenticated;
revoke all on public.admin_login_attempts from public, anon, authenticated;
revoke all on public.banned_players from public, anon, authenticated;
revoke all on public.admin_audit_log from public, anon, authenticated;
revoke all on public.admin_settings from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) บล็อกการส่งคะแนนของผู้เล่นที่ถูกแบน
--    ใช้ trigger บน scores เพื่อไม่ต้องเขียน submit_score() ใหม่ทั้งก้อน
--    ฟังก์ชันของแอดมินจะ set_config('wsg.admin_bypass','on') เพื่อข้ามการบล็อก
-- ---------------------------------------------------------------------------
create or replace function public.block_banned_player_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('wsg.admin_bypass', true), '') = 'on' then
    return new;
  end if;
  if exists (select 1 from public.banned_players b where b.user_id = new.user_id) then
    raise exception using errcode = '42501', message = 'player_banned';
  end if;
  return new;
end;
$$;

drop trigger if exists scores_block_banned on public.scores;
create trigger scores_block_banned
  before insert or update on public.scores
  for each row execute function public.block_banned_player_writes();

-- ---------------------------------------------------------------------------
-- 4) ตัวช่วยภายใน (ไม่เปิดให้ client เรียก)
-- ---------------------------------------------------------------------------
create or replace function public.admin_assert_session(p_token text)
returns public.admin_users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_hash  text;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception using errcode = '28000', message = 'invalid_session';
  end if;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select a.* into v_admin
    from public.admin_sessions s
    join public.admin_users a on a.user_id = s.admin_id
   where s.token_hash = v_hash
     and s.expires_at > now()
     and a.is_active;

  if not found then
    raise exception using errcode = '28000', message = 'invalid_session';
  end if;

  update public.admin_sessions
     set last_seen_at = now()
   where token_hash = v_hash;

  return v_admin;
end;
$$;

create or replace function public.admin_require_role(p_admin public.admin_users, p_roles text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin.role is null or not (p_admin.role = any(p_roles)) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
end;
$$;

create or replace function public.admin_log(
  p_admin_id uuid,
  p_action text,
  p_target uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log(admin_id, action, target_user_id, details)
  values (p_admin_id, p_action, p_target, p_details);
$$;

-- ---------------------------------------------------------------------------
-- 5) เข้าสู่ระบบ / ออกจากระบบ
-- ---------------------------------------------------------------------------
create or replace function public.admin_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key      text := lower(btrim(coalesce(p_username, '')));
  v_admin    public.admin_users;
  v_attempt  public.admin_login_attempts;
  v_ok       boolean := false;
  v_token    text;
  v_fail     integer;
  v_expires  timestamptz := now() + interval '8 hours';
begin
  if v_key = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_credentials');
  end if;

  select * into v_attempt from public.admin_login_attempts where username = v_key;
  if found and v_attempt.locked_until is not null then
    if v_attempt.locked_until > now() then
      -- คืนค่าแทนการ raise เพราะ raise จะ rollback การนับครั้งที่ผิด
      return jsonb_build_object(
        'ok', false,
        'error', 'too_many_attempts',
        'retry_after', v_attempt.locked_until
      );
    end if;
    update public.admin_login_attempts
       set fail_count = 0, locked_until = null
     where username = v_key;
  end if;

  select * into v_admin
    from public.admin_users a
   where lower(btrim(a.username)) = v_key
     and a.is_active;

  if found then
    if v_admin.password_hash is not null then
      v_ok := (extensions.crypt(p_password, v_admin.password_hash) = v_admin.password_hash);
    elsif coalesce(v_admin.password, '') <> '' then
      -- ยังไม่เคย migrate: เทียบแบบเดิมแล้วอัปเกรดเป็น hash ทันที
      v_ok := (v_admin.password = p_password);
      if v_ok then
        update public.admin_users
           set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
               password = ''
         where user_id = v_admin.user_id;
      end if;
    end if;
  end if;

  if not v_ok then
    insert into public.admin_login_attempts as t (username, fail_count, first_failed_at, updated_at)
    values (v_key, 1, now(), now())
    on conflict (username) do update
      set fail_count = t.fail_count + 1,
          locked_until = case
            when t.fail_count + 1 >= 5 then now() + interval '15 minutes'
            else t.locked_until
          end,
          updated_at = now();

    delete from public.admin_login_attempts where updated_at < now() - interval '1 day';

    select fail_count into v_fail
      from public.admin_login_attempts where username = v_key;

    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_credentials',
      'attempts_left', greatest(0, 5 - coalesce(v_fail, 0))
    );
  end if;

  delete from public.admin_login_attempts where username = v_key;
  delete from public.admin_sessions where expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.admin_sessions(token_hash, admin_id, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_admin.user_id, v_expires);

  update public.admin_users set last_login_at = now() where user_id = v_admin.user_id;
  perform public.admin_log(v_admin.user_id, 'login', null,
                           jsonb_build_object('username', v_admin.username));

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', v_expires,
    'username', v_admin.username,
    'user_id', v_admin.user_id,
    'role', v_admin.role,
    'must_change_password', v_admin.must_change_password
  );
end;
$$;

create or replace function public.admin_logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null then
    return jsonb_build_object('ok', true);
  end if;
  delete from public.admin_sessions
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Dashboard: สถิติ + ตารางคะแนน (ค้นหา / เรียง / แบ่งหน้า / กรองแบน)
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard(
  p_token  text,
  p_search text default '',
  p_limit  integer default 50,
  p_offset integer default 0,
  p_sort   text default 'score',
  p_dir    text default 'desc',
  p_banned boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  public.admin_users;
  v_stats  jsonb;
  v_rows   jsonb;
  v_total  bigint;
  v_expires timestamptz;
  v_limit  integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := btrim(coalesce(p_search, ''));
  v_sort   text := lower(coalesce(p_sort, 'score'));
  v_dir    text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
begin
  v_admin := public.admin_assert_session(p_token);

  select expires_at into v_expires
    from public.admin_sessions
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_sort not in ('score', 'name', 'right_count', 'max_combo', 'updated_at') then
    v_sort := 'score';
  end if;

  select jsonb_build_object(
           'player_count',  (select count(*) from public.scores),
           'average_score', (select coalesce(round(avg(score))::int, 0) from public.scores),
           'highest_score', (select coalesce(max(score), 0) from public.scores),
           'banned_count',  (select count(*) from public.banned_players),
           'total_right',   (select coalesce(sum(right_count), 0) from public.scores)
         )
    into v_stats;

  select count(*) into v_total
    from public.scores s
    left join public.banned_players b on b.user_id = s.user_id
   where (v_search = '' or lower(s.name) like '%' || lower(v_search) || '%')
     and (p_banned is null or (b.user_id is not null) = p_banned);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_rows
    from (
      select s.user_id,
             s.name,
             s.score,
             s.right_count,
             s.max_combo,
             s.updated_at,
             (b.user_id is not null) as is_banned,
             b.reason as ban_reason,
             b.created_at as banned_at
        from public.scores s
        left join public.banned_players b on b.user_id = s.user_id
       where (v_search = '' or lower(s.name) like '%' || lower(v_search) || '%')
         and (p_banned is null or (b.user_id is not null) = p_banned)
       order by
         case when v_sort = 'name'       and v_dir = 'asc'  then s.name       end asc,
         case when v_sort = 'name'       and v_dir = 'desc' then s.name       end desc,
         case when v_sort = 'score'      and v_dir = 'asc'  then s.score      end asc,
         case when v_sort = 'score'      and v_dir = 'desc' then s.score      end desc,
         case when v_sort = 'right_count' and v_dir = 'asc'  then s.right_count end asc,
         case when v_sort = 'right_count' and v_dir = 'desc' then s.right_count end desc,
         case when v_sort = 'max_combo'  and v_dir = 'asc'  then s.max_combo  end asc,
         case when v_sort = 'max_combo'  and v_dir = 'desc' then s.max_combo  end desc,
         case when v_sort = 'updated_at' and v_dir = 'asc'  then s.updated_at end asc,
         case when v_sort = 'updated_at' and v_dir = 'desc' then s.updated_at end desc,
         s.score desc,
         s.user_id asc
       limit v_limit offset v_offset
    ) r;

  return jsonb_build_object(
    'expires_at', v_expires,
    'admin', jsonb_build_object(
      'username', v_admin.username,
      'user_id', v_admin.user_id,
      'role', v_admin.role,
      'must_change_password', v_admin.must_change_password
    ),
    'stats', v_stats,
    'rows', v_rows,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'sort', v_sort,
    'dir', v_dir
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) จัดการคะแนนผู้เล่น
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_score(p_token text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_name  text;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor']);

  delete from public.scores where user_id = p_user_id returning name into v_name;
  if not found then
    raise exception using errcode = 'P0002', message = 'player_not_found';
  end if;

  perform public.admin_log(v_admin.user_id, 'delete_score', p_user_id,
                           jsonb_build_object('name', v_name));
  return jsonb_build_object('ok', true, 'deleted', v_name);
end;
$$;

create or replace function public.admin_reset_score(p_token text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_name  text;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor']);

  perform set_config('wsg.admin_bypass', 'on', true);

  update public.scores
     set score = 0, right_count = 0, max_combo = 0, updated_at = now()
   where user_id = p_user_id
   returning name into v_name;

  if not found then
    raise exception using errcode = 'P0002', message = 'player_not_found';
  end if;

  perform public.admin_log(v_admin.user_id, 'reset_score', p_user_id,
                           jsonb_build_object('name', v_name));
  return jsonb_build_object('ok', true, 'reset', v_name);
end;
$$;

create or replace function public.admin_rename_player(p_token text, p_user_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_name  text := btrim(coalesce(p_name, ''));
  v_old   text;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor']);

  if char_length(v_name) < 1 or char_length(v_name) > 16 then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;

  if exists (
    select 1 from public.scores
     where lower(btrim(name)) = lower(v_name)
       and user_id <> p_user_id
  ) then
    raise exception using errcode = '23505', message = 'duplicate_player_name';
  end if;

  perform set_config('wsg.admin_bypass', 'on', true);

  begin
    update public.scores set name = v_name
     where user_id = p_user_id
     returning name into v_old;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate_player_name';
  end;

  if not found then
    raise exception using errcode = 'P0002', message = 'player_not_found';
  end if;

  perform public.admin_log(v_admin.user_id, 'rename_player', p_user_id,
                           jsonb_build_object('name', v_name));
  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) แบน / ปลดแบน
-- ---------------------------------------------------------------------------
create or replace function public.admin_ban_player(p_token text, p_user_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  public.admin_users;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_name   text;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor']);

  select name into v_name from public.scores where user_id = p_user_id;

  insert into public.banned_players(user_id, reason, banned_by)
  values (p_user_id, v_reason, v_admin.user_id)
  on conflict (user_id) do update
    set reason = excluded.reason,
        banned_by = excluded.banned_by,
        created_at = now();

  perform public.admin_log(v_admin.user_id, 'ban_player', p_user_id,
                           jsonb_build_object('name', v_name, 'reason', v_reason));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_unban_player(p_token text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_name  text;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor']);

  select name into v_name from public.scores where user_id = p_user_id;

  delete from public.banned_players where user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'ban_not_found';
  end if;

  perform public.admin_log(v_admin.user_id, 'unban_player', p_user_id,
                           jsonb_build_object('name', v_name));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) รหัสผ่านของตัวเอง + audit log
-- ---------------------------------------------------------------------------
drop function if exists public.admin_change_password(text, text, text);

create or replace function public.admin_change_password(
  p_token text,
  p_current text,
  p_new text,
  p_special text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin        public.admin_users;
  v_current_hash text;
  v_special_hash text;
  v_new          text := coalesce(p_new, '');
  v_special      text := btrim(coalesce(p_special, ''));
begin
  v_admin := public.admin_assert_session(p_token);

  if v_admin.password_hash is null
     or extensions.crypt(coalesce(p_current, ''), v_admin.password_hash) <> v_admin.password_hash then
    raise exception using errcode = '28P01', message = 'invalid_password';
  end if;

  select special_password_hash into v_special_hash
    from public.admin_settings
   where id;

  if v_special_hash is null then
    raise exception using errcode = '55000', message = 'special_password_not_configured';
  end if;

  if extensions.crypt(v_special, v_special_hash) <> v_special_hash then
    raise exception using errcode = '28P01', message = 'invalid_special_password';
  end if;

  if char_length(v_new) < 8 or char_length(v_new) > 128 then
    raise exception using errcode = '22023', message = 'weak_password';
  end if;

  if v_new = p_current then
    raise exception using errcode = '22023', message = 'same_password';
  end if;

  update public.admin_users
     set password_hash = extensions.crypt(v_new, extensions.gen_salt('bf', 10)),
         password = '',
         must_change_password = false
   where user_id = v_admin.user_id;

  v_current_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  delete from public.admin_sessions
   where admin_id = v_admin.user_id
     and token_hash <> v_current_hash;

  perform public.admin_log(v_admin.user_id, 'change_password', null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9.1) ตั้ง/เปลี่ยน "รหัสผ่านพิเศษ"
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_special_password(
  p_token text,
  p_current text,
  p_special text,
  p_new_special text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin          public.admin_users;
  v_special_hash   text;
  v_current_special text := btrim(coalesce(p_special, ''));
  v_new_special    text := btrim(coalesce(p_new_special, ''));
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner']);

  if v_admin.password_hash is null
     or extensions.crypt(coalesce(p_current, ''), v_admin.password_hash) <> v_admin.password_hash then
    raise exception using errcode = '28P01', message = 'invalid_password';
  end if;

  select special_password_hash into v_special_hash
    from public.admin_settings
   where id;

  if v_special_hash is null then
    raise exception using errcode = '55000', message = 'special_password_not_configured';
  end if;

  if extensions.crypt(v_current_special, v_special_hash) <> v_special_hash then
    raise exception using errcode = '28P01', message = 'invalid_special_password';
  end if;

  if char_length(v_new_special) < 4 or char_length(v_new_special) > 64 then
    raise exception using errcode = '22023', message = 'weak_special_password';
  end if;

  if extensions.crypt(v_new_special, v_special_hash) = v_special_hash then
    raise exception using errcode = '22023', message = 'same_special_password';
  end if;

  update public.admin_settings
     set special_password_hash = extensions.crypt(v_new_special, extensions.gen_salt('bf', 10)),
         updated_at = now(),
         updated_by = v_admin.user_id
   where id;

  perform public.admin_log(v_admin.user_id, 'set_special_password', null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_audit_list(p_token text, p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_rows  jsonb;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner', 'editor', 'viewer']);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_rows
    from (
      select l.id, l.action, l.target_user_id, l.details, l.created_at,
             coalesce(a.username, 'system') as admin_username
        from public.admin_audit_log l
        left join public.admin_users a on a.user_id = l.admin_id
       order by l.created_at desc, l.id desc
       limit v_limit
    ) r;

  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) จัดการบัญชีแอดมิน
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_admins(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_rows  jsonb;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner']);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_rows
    from (
      select user_id, username, role, is_active, must_change_password,
             created_at, last_login_at
        from public.admin_users
       order by created_at asc
    ) r;

  return v_rows;
end;
$$;

create or replace function public.admin_add_admin(
  p_token text,
  p_username text,
  p_password text,
  p_role text default 'editor'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_name  text := btrim(coalesce(p_username, ''));
  v_role  text := lower(coalesce(p_role, 'editor'));
  v_new   public.admin_users;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner']);

  if char_length(v_name) < 1 or char_length(v_name) > 64 then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception using errcode = '22023', message = 'weak_password';
  end if;
  if v_role not in ('owner', 'editor', 'viewer') then
    raise exception using errcode = '22023', message = 'invalid_role';
  end if;

  begin
    insert into public.admin_users(username, password_hash, role, must_change_password, password)
    values (v_name, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_role, true, '')
    returning * into v_new;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate_admin';
  end;

  perform public.admin_log(v_admin.user_id, 'add_admin', null,
                           jsonb_build_object('username', v_name, 'role', v_role));
  return jsonb_build_object('ok', true, 'user_id', v_new.user_id);
end;
$$;

create or replace function public.admin_set_admin_active(p_token text, p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_users;
  v_target public.admin_users;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner']);

  if p_user_id = v_admin.user_id then
    raise exception using errcode = '22023', message = 'cannot_disable_self';
  end if;

  select * into v_target from public.admin_users where user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'admin_not_found';
  end if;

  if v_target.role = 'owner' and v_target.is_active and not p_active then
    if (select count(*) from public.admin_users where role = 'owner' and is_active) <= 1 then
      raise exception using errcode = '22023', message = 'last_owner';
    end if;
  end if;

  update public.admin_users set is_active = p_active where user_id = p_user_id;

  if not p_active then
    delete from public.admin_sessions where admin_id = p_user_id;
  end if;

  perform public.admin_log(v_admin.user_id,
                           case when p_active then 'enable_admin' else 'disable_admin' end,
                           null,
                           jsonb_build_object('username', v_target.username));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reset_admin_password(p_token text, p_user_id uuid, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  public.admin_users;
  v_target public.admin_users;
begin
  v_admin := public.admin_assert_session(p_token);
  perform public.admin_require_role(v_admin, array['owner']);

  if char_length(coalesce(p_password, '')) < 8 then
    raise exception using errcode = '22023', message = 'weak_password';
  end if;

  select * into v_target from public.admin_users where user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'admin_not_found';
  end if;

  update public.admin_users
     set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         password = '',
         must_change_password = true
   where user_id = p_user_id;

  delete from public.admin_sessions where admin_id = p_user_id;

  perform public.admin_log(v_admin.user_id, 'reset_admin_password', null,
                           jsonb_build_object('username', v_target.username));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) สิทธิ์การเรียกใช้ (grant)
-- ---------------------------------------------------------------------------
revoke all on function public.admin_assert_session(text) from public, anon, authenticated;
revoke all on function public.admin_require_role(public.admin_users, text[]) from public, anon, authenticated;
revoke all on function public.admin_log(uuid, text, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.admin_login(text, text) from public;
revoke all on function public.admin_logout(text) from public;
revoke all on function public.admin_dashboard(text, text, integer, integer, text, text, boolean) from public;
revoke all on function public.admin_delete_score(text, uuid) from public;
revoke all on function public.admin_reset_score(text, uuid) from public;
revoke all on function public.admin_rename_player(text, uuid, text) from public;
revoke all on function public.admin_ban_player(text, uuid, text) from public;
revoke all on function public.admin_unban_player(text, uuid) from public;
revoke all on function public.admin_change_password(text, text, text, text) from public;
revoke all on function public.admin_set_special_password(text, text, text, text) from public;
revoke all on function public.admin_audit_list(text, integer) from public;
revoke all on function public.admin_list_admins(text) from public;
revoke all on function public.admin_add_admin(text, text, text, text) from public;
revoke all on function public.admin_set_admin_active(text, uuid, boolean) from public;
revoke all on function public.admin_reset_admin_password(text, uuid, text) from public;
revoke all on function public.block_banned_player_writes() from public, anon, authenticated;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_dashboard(text, text, integer, integer, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_delete_score(text, uuid) to anon, authenticated;
grant execute on function public.admin_reset_score(text, uuid) to anon, authenticated;
grant execute on function public.admin_rename_player(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_ban_player(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_unban_player(text, uuid) to anon, authenticated;
grant execute on function public.admin_change_password(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_set_special_password(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_audit_list(text, integer) to anon, authenticated;
grant execute on function public.admin_list_admins(text) to anon, authenticated;
grant execute on function public.admin_add_admin(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_set_admin_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_reset_admin_password(text, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 12) บัญชีเริ่มต้น
-- ---------------------------------------------------------------------------
insert into public.admin_users (username, password_hash, role, must_change_password, password)
select 'admin',
       extensions.crypt('Dragon_Lukasiki', extensions.gen_salt('bf', 10)),
       'owner',
       true,
       ''
 where not exists (select 1 from public.admin_users);

-- seed รหัสผ่านพิเศษเฉพาะครั้งแรก และไม่ทับค่าที่ owner เปลี่ยนไว้แล้ว
insert into public.admin_settings (id, special_password_hash)
select true, extensions.crypt('im gay', extensions.gen_salt('bf', 10))
 where not exists (select 1 from public.admin_settings);

-- ---------------------------------------------------------------------------
-- 13) ตรวจสอบผลติดตั้ง
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
