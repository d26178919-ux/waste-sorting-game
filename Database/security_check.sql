
select tablename, rowsecurity as rls_enabled
  from pg_tables
 where schemaname = 'public'
 order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;

select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated')
 group by table_name, grantee
 order by table_name, grantee;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'anon' else '' end as anon_ok,
       case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'authenticated' else '' end as auth_ok,
       p.prosecdef as security_definer,
       p.proconfig as settings
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and (p.proname like 'admin\_%' escape '\' or p.proname like 'game\_%' escape '\' or p.proname in ('get_leaderboard', 'get_player_rank'))
 order by p.proname;

select count(*) filter (where coalesce(password, '') <> '') as plaintext_left,
       count(*) filter (where role = 'owner' and is_active) as active_owners,
       count(*) filter (where password_hash !~ '^\$2[aby]\$\d{2}\$' or password_hash is null) as bad_hashes
  from public.admin_users;

select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as missing_token_check
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname like 'admin\_%' escape '\'
   and p.proname not in (
         'admin_login', 'admin_logout',
         'admin_assert_session', 'admin_assert_ready',
         'admin_assert_password', 'admin_require_role', 'admin_log',
         'admin_private_score_stats'
       )
   and p.prosrc !~ 'admin_assert_session[[:space:]]*\('
 order by p.proname;

do $$
declare
  v_bad text;
begin
  if exists (
    select 1 from pg_tables
     where schemaname = 'public'
       and tablename in ('scores', 'game_runs', 'game_items')
       and not rowsecurity
  ) then
    raise exception 'SECURITY_CHECK_FAILED: RLS ถูกปิดบนตาราง scores/game_runs/game_items';
  end if;

  if exists (select 1 from public.admin_users where coalesce(password, '') <> '') then
    raise exception 'SECURITY_CHECK_FAILED: ยังมีรหัสผ่านแบบ plaintext ค้างใน admin_users';
  end if;

  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    into v_bad
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname like 'admin\_%' escape '\'
     and p.proname not in (
           'admin_login', 'admin_logout',
           'admin_assert_session', 'admin_assert_ready',
           'admin_assert_password', 'admin_require_role', 'admin_log',
           'admin_private_score_stats'
         )
     and p.prosrc !~ 'admin_assert_session[[:space:]]*\(';

  if v_bad is not null then
    raise exception 'SECURITY_CHECK_FAILED: RPC แอดมินที่ไม่ได้ตรวจ session token: %', v_bad;
  end if;

  if not exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'admin_delete_admin'
       and p.pronargs = 5
       and p.prosrc ~ 'admin_assert_password[[:space:]]*\('
       and p.prosrc ~ 'special_password_hash'
       and p.prosrc ~ 'maintenance_password_hash'
  ) then
    raise exception 'SECURITY_CHECK_FAILED: admin_delete_admin ไม่ได้ตรวจรหัสทั้ง 3 ชั้น';
  end if;

  if not has_function_privilege(
       'anon',
       'public.admin_delete_admin(text, uuid, text, text, text)',
       'EXECUTE'
     ) then
    raise exception 'SECURITY_CHECK_FAILED: anon ไม่มีสิทธิ์เรียก admin_delete_admin';
  end if;

  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as c(val)
          where c.val like 'search_path=%'
       )
  ) then
    raise exception 'SECURITY_CHECK_FAILED: มี security definer function ที่ไม่ได้ set search_path';
  end if;

  if not exists (select 1 from public.admin_users where role = 'owner' and is_active) then
    raise exception 'SECURITY_CHECK_FAILED: ไม่มี owner ที่ active';
  end if;

  raise notice 'SECURITY_CHECK: PASS';
end $$;
