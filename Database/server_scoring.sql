-- ===========================================================================
--  Server-authoritative scoring — Waste Sorting Game
--  รันหลัง Database/setup.sql
--  (ถ้าใช้ระบบแอดมิน ให้รัน Database/admin_system.sql ต่อได้เลย)
--  ไฟล์นี้รันซ้ำได้ (idempotent)
--
--  หลักการ:
--   * server สร้างลำดับถังของรอบนั้นเอง (game_start)
--   * server เก็บ mapping ขยะ -> ถังไว้ในตาราง game_items ซึ่ง client อ่านไม่ได้
--     client จึงได้แค่ "ชื่อขยะ" ที่จะโชว์ ไม่ได้รู้ว่าต้องทิ้งถังไหน
--   * client ส่งได้แค่ "ถังที่เลือก" ต่อข้อ (game_answer)
--   * server เป็นคนคิดคะแนน / คอมโบ / ชีวิต / เวลาเองทั้งหมด
--   * client ส่งตัวเลขคะแนนเข้ามาไม่ได้อีกต่อไป (submit_score ถูกปิด)
--   * ชื่อผู้เล่นยังมาจาก client แต่ถูก validate และกันชื่อซ้ำที่ server
--   * จำกัดการเริ่มรอบ (cooldown + ต่อชั่วโมง) และ flag รอบที่จังหวะตอบผิดมนุษย์
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) ตารางรอบเกม
-- ---------------------------------------------------------------------------
create table if not exists public.game_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  seq            text[] not null,
  items          text[],
  player_name    text,
  total          integer not null check (total between 1 and 500),
  answered       integer not null default 0 check (answered >= 0),
  right_count    integer not null default 0 check (right_count >= 0),
  max_combo      integer not null default 0 check (max_combo >= 0),
  combo          integer not null default 0 check (combo >= 0),
  lives          integer not null default 3 check (lives between 0 and 3),
  score          integer not null default 0 check (score >= 0),
  status         text not null default 'active'
                 check (status in ('active', 'finished', 'abandoned')),
  started_at     timestamptz not null default now(),
  ends_at        timestamptz not null,
  last_answer_at timestamptz,
  delta_sum      bigint not null default 0,
  delta_sumsq    double precision not null default 0,
  min_delta      integer,
  max_delta      integer,
  suspicious     boolean not null default false,
  flag_reason    text,
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ของเดิมที่สร้างไว้ก่อนมี anti-bot: เติมคอลัมน์ที่ยังไม่มี
alter table public.game_runs
  add column if not exists items text[],
  add column if not exists player_name text,
  add column if not exists delta_sum bigint not null default 0,
  add column if not exists delta_sumsq double precision not null default 0,
  add column if not exists min_delta integer,
  add column if not exists max_delta integer,
  add column if not exists suspicious boolean not null default false,
  add column if not exists flag_reason text;

-- เติมชื่อผู้เล่นย้อนหลังให้รอบเก่าที่เคยบันทึกไว้ (ถ้ามีแถวคะแนนอยู่)
update public.game_runs r
   set player_name = s.name
  from public.scores s
 where s.user_id = r.user_id
   and r.player_name is null;

create index if not exists game_runs_user_status_idx
  on public.game_runs (user_id, status);
create index if not exists game_runs_user_created_idx
  on public.game_runs (user_id, created_at desc);
create index if not exists game_runs_created_idx
  on public.game_runs (created_at);
create index if not exists game_runs_suspicious_idx
  on public.game_runs (created_at desc)
  where suspicious;

alter table public.game_runs enable row level security;
-- เข้าถึงได้ทาง RPC (security definer) เท่านั้น
revoke all on public.game_runs from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) mapping ขยะ -> ถัง (server-only)
--    client อ่านตารางนี้ไม่ได้; ส่งให้ client แค่ชื่อขยะทีละชิ้น
-- ---------------------------------------------------------------------------
create table if not exists public.game_items (
  name text primary key,
  bin  text not null check (bin in ('green', 'yellow', 'blue', 'red'))
);

alter table public.game_items enable row level security;
-- สำคัญ: ถ้า client อ่านตารางนี้ได้ item-id patch จะไม่มีประโยชน์เลย
revoke all on public.game_items from public, anon, authenticated;

insert into public.game_items (name, bin) values
  ('เปลือกแอปเปิล', 'green'),
  ('เปลือกกล้วย', 'green'),
  ('เศษอาหาร', 'green'),
  ('เศษผัก', 'green'),
  ('เปลือกไข่', 'green'),
  ('เปลือกแตงโม', 'green'),
  ('เปลือกส้ม', 'green'),
  ('เปลือกมะม่วง', 'green'),
  ('เปลือกสับปะรด', 'green'),
  ('เปลือกมะพร้าว', 'green'),
  ('ข้าวเหลือ', 'green'),
  ('เส้นก๋วยเตี๋ยว', 'green'),
  ('ขนมปังเก่า', 'green'),
  ('ก้างปลา', 'green'),
  ('กระดูกหมู', 'green'),
  ('กระดูกไก่', 'green'),
  ('เปลือกกุ้ง', 'green'),
  ('เปลือกปู', 'green'),
  ('ซังข้าวโพด', 'green'),
  ('เปลือกข้าวโพด', 'green'),
  ('เปลือกหัวหอม', 'green'),
  ('เปลือกกระเทียม', 'green'),
  ('เปลือกมันฝรั่ง', 'green'),
  ('เปลือกแครอท', 'green'),
  ('เศษแตงกวา', 'green'),
  ('เศษผักสลัด', 'green'),
  ('เมล็ดผลไม้', 'green'),
  ('ก้านองุ่น', 'green'),
  ('แกนผลไม้', 'green'),
  ('เปลือกอะโวคาโด', 'green'),
  ('กากกาแฟ', 'green'),
  ('ใบชา', 'green'),
  ('กากถั่วเหลือง', 'green'),
  ('เศษเต้าหู้', 'green'),
  ('ดอกไม้เหี่ยว', 'green'),
  ('ใบไม้แห้ง', 'green'),
  ('เศษหญ้า', 'green'),
  ('กิ่งไม้', 'green'),
  ('ขวดแก้ว', 'yellow'),
  ('ขวดซอสแก้ว', 'yellow'),
  ('โหลแก้ว', 'yellow'),
  ('กระป๋องอะลูมิเนียม', 'yellow'),
  ('กระป๋องเหล็ก', 'yellow'),
  ('หนังสือพิมพ์', 'yellow'),
  ('กล่องกระดาษ', 'yellow'),
  ('ขวดพลาสติก PET', 'yellow'),
  ('ขวดน้ำ PET', 'yellow'),
  ('ขวดแชมพู', 'yellow'),
  ('ขวดน้ำยาซักผ้า', 'yellow'),
  ('ขวดนมพลาสติก', 'yellow'),
  ('กล่องอาหารพลาสติก', 'yellow'),
  ('ถาดพลาสติก', 'yellow'),
  ('ลังพลาสติก', 'yellow'),
  ('ถังพลาสติก', 'yellow'),
  ('ฝาขวดพลาสติก', 'yellow'),
  ('กระดาษสำนักงาน', 'yellow'),
  ('นิตยสาร', 'yellow'),
  ('หนังสือเก่า', 'yellow'),
  ('สมุดเก่า', 'yellow'),
  ('ถุงกระดาษ', 'yellow'),
  ('กล่องเครื่องดื่ม UHT', 'yellow'),
  ('กล่องน้ำผลไม้', 'yellow'),
  ('แกนทิชชู่', 'yellow'),
  ('กล่องไข่กระดาษ', 'yellow'),
  ('ซองจดหมาย', 'yellow'),
  ('แผ่นพับโฆษณา', 'yellow'),
  ('กระป๋องกาแฟ', 'yellow'),
  ('กระป๋องเครื่องดื่ม', 'yellow'),
  ('ฝาโลหะ', 'yellow'),
  ('ช้อนโลหะ', 'yellow'),
  ('ลวดโลหะ', 'yellow'),
  ('หม้อโลหะเก่า', 'yellow'),
  ('ถาดอะลูมิเนียม', 'yellow'),
  ('ขวดน้ำมันพืช', 'yellow'),
  ('ขวดน้ำอัดลม PET', 'yellow'),
  ('กล่องกระดาษลูกฟูก', 'yellow'),
  ('ถุงขนม', 'blue'),
  ('ทิชชู่ใช้แล้ว', 'blue'),
  ('กล่องโฟม', 'blue'),
  ('แปรงสีฟัน', 'blue'),
  ('ถุงเท้าเก่า', 'blue'),
  ('ห่อลูกอม', 'blue'),
  ('หลอดพลาสติก', 'blue'),
  ('แก้วพลาสติกใช้แล้ว', 'blue'),
  ('จานพลาสติกใช้แล้ว', 'blue'),
  ('ช้อนส้อมพลาสติก', 'blue'),
  ('ถุงพลาสติก', 'blue'),
  ('ซองเครื่องดื่ม', 'blue'),
  ('ซองบะหมี่', 'blue'),
  ('ซองเครื่องปรุง', 'blue'),
  ('ซองขนม', 'blue'),
  ('ฟองน้ำเก่า', 'blue'),
  ('ไม้กวาดเก่า', 'blue'),
  ('มีดโกนพลาสติก', 'blue'),
  ('ไหมขัดฟันใช้แล้ว', 'blue'),
  ('ซองเติมผลิตภัณฑ์', 'blue'),
  ('พลาสติกห่อเปื้อน', 'blue'),
  ('กล่องพิซซ่าเปื้อน', 'blue'),
  ('กล่องอาหารเปื้อน', 'blue'),
  ('แก้วกระดาษ', 'blue'),
  ('ฝาแก้วใช้แล้ว', 'blue'),
  ('กระดาษเปื้อนอาหาร', 'blue'),
  ('ซองสบู่เปล่า', 'blue'),
  ('กระดาษห่อเคลือบ', 'blue'),
  ('เศษกระจกแตก', 'blue'),
  ('ถ้วยเซรามิกแตก', 'blue'),
  ('จานชามแตก', 'blue'),
  ('กระถางแตก', 'blue'),
  ('ตุ๊กตาเก่า', 'blue'),
  ('รองเท้าเก่า', 'blue'),
  ('กระเป๋าเก่า', 'blue'),
  ('ปากกาหมึกหมด', 'blue'),
  ('แฟ้มพลาสติก', 'blue'),
  ('ถ่านไฟฉาย', 'red'),
  ('หลอดไฟ', 'red'),
  ('ยาหมดอายุ', 'red'),
  ('โทรศัพท์เสีย', 'red'),
  ('สารเคมี', 'red'),
  ('แบตเตอรี่ก้อน', 'red'),
  ('แบตลิเธียม', 'red'),
  ('แบตโน้ตบุ๊ก', 'red'),
  ('สายชาร์จชำรุด', 'red'),
  ('หูฟังเสีย', 'red'),
  ('เมาส์เสีย', 'red'),
  ('คีย์บอร์ดเสีย', 'red'),
  ('จอเสีย', 'red'),
  ('เครื่องคิดเลขเสีย', 'red'),
  ('กล้องเสีย', 'red'),
  ('นาฬิกาดิจิทัลเสีย', 'red'),
  ('ถังดับเพลิงเก่า', 'red'),
  ('กระป๋องสเปรย์', 'red'),
  ('ภาชนะน้ำมันเครื่อง', 'red'),
  ('ขวดน้ำยาทำความสะอาด', 'red'),
  ('ขวดน้ำยาฆ่าเชื้อ', 'red'),
  ('น้ำยาล้างห้องน้ำ', 'red'),
  ('กระป๋องสี', 'red'),
  ('ทินเนอร์', 'red'),
  ('น้ำมันเครื่องใช้แล้ว', 'red'),
  ('น้ำยาฆ่าแมลง', 'red'),
  ('กระป๋องยาฆ่าแมลง', 'red'),
  ('ขวดน้ำยาฟอกขาว', 'red'),
  ('ปรอทวัดไข้', 'red'),
  ('เข็มฉีดยาใช้แล้ว', 'red'),
  ('กระบอกฉีดยาใช้แล้ว', 'red'),
  ('ชุดตรวจใช้แล้ว', 'red'),
  ('ขวดยาใช้แล้ว', 'red'),
  ('ขวดน้ำยาล้างเล็บ', 'red'),
  ('น้ำยาล้างเล็บ', 'red'),
  ('ถ่านกระดุม', 'red'),
  ('พาวเวอร์แบงก์เก่า', 'red')
on conflict (name) do update set bin = excluded.bin;

-- ---------------------------------------------------------------------------
-- 3) สร้างลำดับถัง 150 ชิ้น โดยพยายามเลี่ยงถังเดิมติดกัน 3 ครั้ง
--    (distribution เดียวกับตาราง game_items: 38/38/37/37)
--    ถ้าจำนวนถังที่เหลือบังคับให้ซ้ำ ก็ยอมให้ซ้ำ 1 ครั้งเพื่อไม่ให้เกมค้าง
--    ฟังก์ชันภายใน ไม่ grant ให้ client เรียก
-- ---------------------------------------------------------------------------
create or replace function public.game_make_sequence()
returns text[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_pool      text[] := array[]::text[];
  v_out       text[] := array[]::text[];
  v_len       integer;
  v_i         integer;
  v_j         integer;
  v_tmp       text;
  v_start     integer;
  v_k         integer;
  v_idx       integer;
  v_pick      integer;
  v_bin       text;
  v_forbidden text;
begin
  for v_i in 1..38 loop v_pool := array_append(v_pool, 'green');  end loop;
  for v_i in 1..38 loop v_pool := array_append(v_pool, 'yellow'); end loop;
  for v_i in 1..37 loop v_pool := array_append(v_pool, 'blue');   end loop;
  for v_i in 1..37 loop v_pool := array_append(v_pool, 'red');    end loop;

  -- สลับลำดับ
  v_len := cardinality(v_pool);
  for v_i in reverse v_len..2 loop
    v_j := 1 + floor(random() * v_i)::integer;
    v_tmp := v_pool[v_i];
    v_pool[v_i] := v_pool[v_j];
    v_pool[v_j] := v_tmp;
  end loop;

  -- หยิบทีละถังโดยเลี่ยงถังเดิมติดกัน 3 ครั้ง
  while cardinality(v_pool) > 0 loop
    v_forbidden := null;
    if cardinality(v_out) >= 2
       and v_out[cardinality(v_out)] = v_out[cardinality(v_out) - 1] then
      v_forbidden := v_out[cardinality(v_out)];
    end if;

    v_len := cardinality(v_pool);
    v_start := 1 + floor(random() * v_len)::integer;
    v_pick := null;
    for v_k in 0..v_len - 1 loop
      v_idx := 1 + ((v_start - 1 + v_k) % v_len);
      if v_forbidden is null or v_pool[v_idx] <> v_forbidden then
        v_pick := v_idx;
        exit;
      end if;
    end loop;
    if v_pick is null then
      v_pick := 1; -- เหลือแต่ถังที่ห้าม ต้องยอมซ้ำ
    end if;

    v_bin := v_pool[v_pick];
    v_out := array_append(v_out, v_bin);

    v_pool[v_pick] := v_pool[v_len];
    if v_len > 1 then
      v_pool := v_pool[1:v_len - 1];
    else
      v_pool := array[]::text[];
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.game_make_sequence() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) จับคู่ลำดับถังกับชื่อขยะ (server-only)
--    คืน array ชื่อขยะยาวเท่ากับ p_seq โดยแต่ละชื่อถูกใช้ครั้งเดียวต่อรอบ
--    ถ้าตาราง game_items ยังไม่มีข้อมูล จะคืน null
-- ---------------------------------------------------------------------------
create or replace function public.game_make_items(p_seq text[])
returns text[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_bins   text[] := array['green', 'yellow', 'blue', 'red'];
  v_bin    text;
  v_pool   text[];
  v_len    integer;
  v_cursor integer;
  v_items  text[];
  v_i      integer;
begin
  if p_seq is null or cardinality(p_seq) = 0 then
    return null;
  end if;

  v_items := array_fill(null::text, array[cardinality(p_seq)]);

  foreach v_bin in array v_bins loop
    select array_agg(g.name order by random())
      into v_pool
      from public.game_items g
     where g.bin = v_bin;

    v_len := coalesce(cardinality(v_pool), 0);
    if v_len = 0 then
      return null;
    end if;

    v_cursor := 0;
    for v_i in 1..cardinality(p_seq) loop
      if p_seq[v_i] = v_bin then
        v_cursor := v_cursor + 1;
        v_items[v_i] := v_pool[1 + ((v_cursor - 1) % v_len)];
      end if;
    end loop;
  end loop;

  if array_position(v_items, null) is not null then
    return null;
  end if;

  return v_items;
end;
$$;

revoke all on function public.game_make_items(text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4.1) ตรวจว่าผู้ดูแลปิดรับผู้เล่นอยู่หรือไม่
--      ตาราง game_server_settings สร้างโดย Database/admin_system.sql
--      ถ้ายังไม่ได้รันไฟล์นั้น ให้ถือว่าเซิร์ฟเวอร์เปิดตามปกติ
-- ---------------------------------------------------------------------------
create or replace function public.game_server_closed()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.game_server_settings') is null then
    return false;
  end if;
  return coalesce(
    (select s.maintenance from public.game_server_settings s where s.id = true),
    false
  );
end;
$$;

revoke all on function public.game_server_closed() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) เริ่มรอบใหม่
--    คืน run_id + ชื่อขยะชิ้นแรก + เวลาจบ (server time)
--    จำกัด: เว้นอย่างน้อย 3 วินาทีระหว่างการเริ่มรอบ และไม่เกิน 30 รอบ/ชั่วโมง
-- ---------------------------------------------------------------------------
create or replace function public.game_start()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_seq    text[];
  v_items  text[];
  v_run    public.game_runs;
  v_last   timestamptz;
  v_recent integer;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  -- ผู้ดูแลปิดรับผู้เล่นชั่วคราว
  if public.game_server_closed() then
    raise exception using errcode = '55000', message = 'maintenance_mode';
  end if;

  -- serialize การเริ่มรอบของผู้เล่นคนเดียวกัน เพื่อไม่ให้ยิงพร้อมกันแล้วเลี่ยง rate limit
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- กันผู้เล่นที่ถูกแบนไม่ให้เริ่มรอบใหม่
  if to_regclass('public.banned_players') is not null then
    if exists (select 1 from public.banned_players b where b.user_id = v_uid) then
      raise exception using errcode = '42501', message = 'player_banned';
    end if;
  end if;

  -- กันการกดเริ่มรัว ๆ (ทำก่อน abandon เพื่อไม่ให้รอบที่กำลังเล่นอยู่ถูกปิด)
  select max(created_at) into v_last
    from public.game_runs
   where user_id = v_uid;

  if v_last is not null and now() - v_last < interval '3 seconds' then
    raise exception using errcode = '22023', message = 'too_many_requests';
  end if;

  -- จำกัดจำนวนรอบต่อชั่วโมง
  select count(*) into v_recent
    from public.game_runs
   where user_id = v_uid
     and created_at > now() - interval '1 hour';

  if v_recent >= 30 then
    raise exception using errcode = '22023', message = 'rate_limited';
  end if;

  -- ปิดรอบที่ค้างอยู่ของเครื่องนี้
  update public.game_runs
     set status = 'abandoned',
         finished_at = coalesce(finished_at, ends_at)
   where user_id = v_uid and status = 'active';

  -- เก็บประวัติแค่ 1 วัน และไม่เกิน 30 รอบล่าสุดต่อผู้เล่น
  delete from public.game_runs
   where user_id = v_uid
     and status <> 'active'
     and created_at < now() - interval '1 day';

  -- ห้ามลบรอบที่ยังอยู่ในหน้าต่าง 1 ชั่วโมง ไม่งั้นตัวนับ rate limit จะรีเซ็ตได้
  delete from public.game_runs as r
   where r.user_id = v_uid
     and r.status <> 'active'
     and r.created_at < now() - interval '1 hour'
     and r.id not in (
       select id from public.game_runs
        where user_id = v_uid and status <> 'active'
        order by created_at desc
        limit 30
     );

  v_seq := public.game_make_sequence();
  v_items := public.game_make_items(v_seq);

  if v_items is null then
    raise exception using errcode = '55000', message = 'game_items_not_seeded';
  end if;

  insert into public.game_runs (user_id, seq, items, total, ends_at)
  values (v_uid, v_seq, v_items, cardinality(v_seq), now() + interval '60 seconds')
  returning * into v_run;

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run.id,
    'total', v_run.total,
    'lives', v_run.lives,
    'first_item', v_run.items[1],
    'started_at', v_run.started_at,
    'ends_at', v_run.ends_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) ตอบ 1 ข้อ — server ตัดสินถูก/ผิดและคิดคะแนนเอง
-- ---------------------------------------------------------------------------
create or replace function public.game_answer(p_run_id uuid, p_bin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_run      public.game_runs;
  v_now      timestamptz := clock_timestamp();
  v_bin      text := lower(btrim(coalesce(p_bin, '')));
  v_expected text;
  v_correct  boolean;
  v_ended    boolean := false;
  v_reason   text := null;
  v_left     integer;
  v_items    text[];
  v_delta    integer;
  v_next     text;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if public.game_server_closed() then
    raise exception using errcode = '55000', message = 'maintenance_mode';
  end if;
  if v_bin not in ('green', 'yellow', 'blue', 'red') then
    raise exception using errcode = '22023', message = 'invalid_bin';
  end if;

  select * into v_run
    from public.game_runs
   where id = p_run_id and user_id = v_uid
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invalid_run';
  end if;

  -- ตอบหลังจบแล้ว: คืนสถานะเดิมแบบไม่ error เพื่อให้ client ไปหน้าจอจบเกม
  if v_run.status <> 'active' then
    return jsonb_build_object(
      'ok', true, 'ended', true, 'reason', v_run.status,
      'score', v_run.score, 'combo', v_run.combo,
      'max_combo', v_run.max_combo, 'right_count', v_run.right_count,
      'lives', v_run.lives, 'answered', v_run.answered, 'total', v_run.total,
      'next_item', null, 'time_left', 0
    );
  end if;

  if v_now >= v_run.ends_at then
    update public.game_runs
       set status = 'finished', finished_at = v_run.ends_at
     where id = v_run.id;

    return jsonb_build_object(
      'ok', true, 'ended', true, 'reason', 'time',
      'score', v_run.score, 'combo', v_run.combo,
      'max_combo', v_run.max_combo, 'right_count', v_run.right_count,
      'lives', v_run.lives, 'answered', v_run.answered, 'total', v_run.total,
      'next_item', null, 'time_left', 0
    );
  end if;

  -- กันการยิงรัว: ต้องเว้นอย่างน้อย 440ms ต่อข้อ (เกมจริงเว้น 450ms อยู่แล้ว)
  if v_run.last_answer_at is not null
     and v_now - v_run.last_answer_at < interval '440 milliseconds' then
    raise exception using errcode = '22023', message = 'answers_too_fast';
  end if;

  -- รอบเก่าที่เริ่มไว้ก่อนมี item mapping: สร้างชื่อขยะให้เลยแล้วเก็บไว้
  v_items := v_run.items;
  if v_items is null then
    v_items := public.game_make_items(v_run.seq);
    if v_items is null then
      raise exception using errcode = '55000', message = 'game_items_not_seeded';
    end if;
  end if;

  v_expected := v_run.seq[v_run.answered + 1];
  v_correct := (v_expected = v_bin);

  -- เก็บสถิติจังหวะตอบ ไว้ให้ game_finish ตรวจว่าเข้าข่ายบอทหรือไม่
  v_delta := greatest(0, floor(
    extract(epoch from (v_now - coalesce(v_run.last_answer_at, v_run.started_at))) * 1000
  )::integer);

  if v_correct then
    v_run.combo := v_run.combo + 1;
    v_run.right_count := v_run.right_count + 1;
    v_run.max_combo := greatest(v_run.max_combo, v_run.combo);
    v_run.score := v_run.score + 10 + least(v_run.combo - 1, 5) * 2;
  else
    v_run.combo := 0;
    v_run.lives := v_run.lives - 1;
  end if;

  v_run.answered := v_run.answered + 1;
  v_run.last_answer_at := v_now;
  v_run.delta_sum := v_run.delta_sum + v_delta;
  v_run.delta_sumsq := v_run.delta_sumsq + (v_delta::double precision * v_delta);
  v_run.min_delta := least(coalesce(v_run.min_delta, v_delta), v_delta);
  v_run.max_delta := greatest(coalesce(v_run.max_delta, v_delta), v_delta);

  if v_run.lives <= 0 then
    v_ended := true; v_reason := 'lives';
  elsif v_run.answered >= v_run.total then
    v_ended := true; v_reason := 'completed';
  elsif v_now >= v_run.ends_at then
    v_ended := true; v_reason := 'time';
  end if;

  update public.game_runs
     set answered       = v_run.answered,
         right_count    = v_run.right_count,
         max_combo      = v_run.max_combo,
         combo          = v_run.combo,
         lives          = v_run.lives,
         score          = v_run.score,
         items          = v_items,
         last_answer_at = v_run.last_answer_at,
         delta_sum      = v_run.delta_sum,
         delta_sumsq    = v_run.delta_sumsq,
         min_delta      = v_run.min_delta,
         max_delta      = v_run.max_delta,
         status         = case when v_ended then 'finished' else status end,
         finished_at    = case when v_ended
                               then least(v_now, v_run.ends_at)
                               else finished_at end
   where id = v_run.id;

  v_left := greatest(0, least(60,
    ceil(extract(epoch from (v_run.ends_at - v_now)))::integer));

  v_next := case when v_ended then null else v_items[v_run.answered + 1] end;

  return jsonb_build_object(
    'ok', true,
    'correct', v_correct,
    'expected_bin', case when v_correct then null else v_expected end,
    'score', v_run.score,
    'combo', v_run.combo,
    'max_combo', v_run.max_combo,
    'right_count', v_run.right_count,
    'lives', v_run.lives,
    'answered', v_run.answered,
    'total', v_run.total,
    'ended', v_ended,
    'reason', v_reason,
    'next_item', v_next,
    'time_left', v_left
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) จบรอบ + บันทึกคะแนน (ใช้คะแนนที่ server คิดไว้เท่านั้น)
-- ---------------------------------------------------------------------------
create or replace function public.game_finish(p_run_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_run     public.game_runs;
  v_name    text := btrim(coalesce(p_name, ''));
  v_saved   public.scores;
  v_now     timestamptz := clock_timestamp();
  v_count   integer;
  v_mean    double precision;
  v_var     double precision;
  v_sd      double precision;
  v_flagged boolean := false;
  v_flag    text := null;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 16 then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;

  select * into v_run
    from public.game_runs
   where id = p_run_id and user_id = v_uid
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invalid_run';
  end if;
  if v_run.status = 'abandoned' then
    raise exception using errcode = '22023', message = 'invalid_run';
  end if;

  if v_run.status = 'active' then
    update public.game_runs
       set status = 'finished',
           finished_at = least(v_now, v_run.ends_at),
           player_name = coalesce(player_name, v_name)
     where id = v_run.id
     returning * into v_run;
  elsif v_run.player_name is null then
    update public.game_runs
       set player_name = v_name
     where id = v_run.id
     returning * into v_run;
  end if;

  -- -----------------------------------------------------------------------
  -- ตรวจจับบอทอย่างง่ายจากจังหวะตอบ
  --   เงื่อนไข: ตอบอย่างน้อย 51 ข้อ, ตอบถูกทุกข้อ,
  --            ส่วนเบี่ยงเบนมาตรฐานของเวลาต่อข้อ < 20ms และเฉลี่ย < 700ms
  --   มนุษย์ทำไม่ได้จริงเพราะ reaction time ไม่คงที่ขนาดนั้น
  -- -----------------------------------------------------------------------
  v_count := v_run.answered;
  if v_count >= 51 and v_run.right_count = v_count and v_run.delta_sum > 0 then
    v_mean := v_run.delta_sum::double precision / v_count;
    v_var := greatest(0, (v_run.delta_sumsq / v_count) - (v_mean * v_mean));
    v_sd := sqrt(v_var);

    if v_sd < 20 and v_mean < 700 then
      v_flagged := true;
      v_flag := 'bot_timing';
    end if;
  end if;

  if v_flagged then
    update public.game_runs
       set suspicious  = true,
           flag_reason = coalesce(flag_reason, v_flag),
           player_name = coalesce(player_name, v_name)
     where id = v_run.id;

    return jsonb_build_object(
      'ok', false,
      'error', 'run_flagged',
      'name', v_name,
      'score', v_run.score,
      'answered', v_run.answered,
      'suspicious', true
    );
  end if;

  if v_run.score <= 0 then
    return jsonb_build_object('ok', false, 'error', 'no_score');
  end if;

  -- กันผู้เล่นที่เพิ่งถูกแบนระหว่างเล่น
  if to_regclass('public.banned_players') is not null then
    if exists (select 1 from public.banned_players b where b.user_id = v_uid) then
      raise exception using errcode = '42501', message = 'player_banned';
    end if;
  end if;

  begin
    insert into public.scores as existing (user_id, name, score, right_count, max_combo)
    values (v_uid, v_name, v_run.score, v_run.right_count, v_run.max_combo)
    on conflict (user_id) do update set
      score = greatest(existing.score, excluded.score),
      right_count = case when excluded.score > existing.score then excluded.right_count else existing.right_count end,
      max_combo = case when excluded.score > existing.score then excluded.max_combo else existing.max_combo end,
      updated_at = case when excluded.score > existing.score then now() else existing.updated_at end
    returning * into v_saved;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate_player_name';
  end;

  return jsonb_build_object(
    'ok', true,
    'name', v_saved.name,
    'score', v_saved.score,
    'right_count', v_saved.right_count,
    'max_combo', v_saved.max_combo
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) ปิดช่องเดิม: submit_score ไม่รับคะแนนจาก client อีกต่อไป
--    (คง signature ไว้เพื่อให้ client เก่าได้ error ที่อ่านรู้เรื่อง)
-- ---------------------------------------------------------------------------
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
begin
  raise exception using errcode = '22023', message = 'score_submission_disabled';
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) สิทธิ์การเรียก
-- ---------------------------------------------------------------------------
revoke all on function public.game_start() from public, anon, authenticated;
revoke all on function public.game_answer(uuid, text) from public, anon, authenticated;
revoke all on function public.game_finish(uuid, text) from public, anon, authenticated;
grant execute on function public.game_start() to authenticated;
grant execute on function public.game_answer(uuid, text) to authenticated;
grant execute on function public.game_finish(uuid, text) to authenticated;

revoke all on function public.submit_score(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.submit_score(text, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) ตรวจสอบหลังติดตั้ง
-- ---------------------------------------------------------------------------
-- select p.proname, pg_get_function_identity_arguments(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('game_start','game_answer','game_finish',
--                     'game_make_sequence','game_make_items');
--
-- select count(*) as items, count(distinct bin) as bins from public.game_items;
-- select count(*) from public.game_runs;
--
-- ดูรอบที่น่าสงสัย (เฉพาะ service_role / SQL editor)
-- select id, user_id, score, answered, right_count,
--        round(delta_sum::numeric / nullif(answered,0), 1) as mean_ms,
--        flag_reason, created_at
--   from public.game_runs
--  where suspicious
--  order by created_at desc
--  limit 50;
