/* ระบบหลังบ้าน — Waste Sorting Game
 * ทำงานร่วมกับ Database/admin_system.sql ผ่าน Supabase RPC เท่านั้น
 * ไม่มีการเรียก Edge Function และไม่เก็บ service_role key ฝั่ง client
 */
(() => {
  'use strict';

  const CONFIG = window.SUPABASE_CONFIG || {};
  const TOKEN_KEY = 'wsg_admin_token';
  const EXPIRES_KEY = 'wsg_admin_expires_at';
  const SESSION_WARN_MS = 15 * 60 * 1000;
  const THEME_KEY = 'wsg_theme';
  const $ = (id) => document.getElementById(id);
  const TABS = ['scores', 'banned', 'audit', 'commands', 'admins'];
  const AUDIT_MAX_ROWS = 35;

  const ROLE_LABELS = { owner: 'owner', editor: 'editor', viewer: 'viewer' };

  const MESSAGES = {
    missing_credentials: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
    invalid_credentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    too_many_attempts: 'พยายามเข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่',
    invalid_session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    password_change_required: 'ต้องเปลี่ยนรหัสผ่านก่อนใช้งานส่วนอื่น',
    forbidden: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
    weak_password: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
    same_password: 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม',
    invalid_password: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
    password_not_configured: 'บัญชีนี้ยังไม่มีรหัสผ่านที่ใช้งานได้ — กรุณาเปลี่ยนรหัสผ่านก่อน',
    invalid_special_password: 'รหัสผ่านพิเศษไม่ถูกต้อง',
    weak_special_password: 'รหัสผ่านพิเศษต้องยาว 4–64 ตัวอักษร',
    same_special_password: 'รหัสผ่านพิเศษใหม่ต้องต่างจากเดิม',
    special_password_not_configured: 'ยังไม่ได้ตั้งรหัสผ่านพิเศษ หรือค่าที่เก็บไว้เสียหาย — ต้องตั้งใหม่ด้วย SQL ก่อน',
    duplicate_player_name: 'ชื่อผู้เล่นนี้ถูกใช้แล้ว',
    duplicate_admin: 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
    invalid_name: 'ชื่อต้องยาว 1–16 ตัวอักษร',
    invalid_role: 'บทบาทไม่ถูกต้อง',
    invalid_reason: 'กรุณากรอกเหตุผล 3–200 ตัวอักษร',
    invalid_score: 'คะแนนต้องเป็นจำนวนเต็ม 0–1,000,000',
    invalid_status: 'สถานะรอบเกมไม่ถูกต้อง',
    invalid_action: 'คำสั่งตรวจสอบรอบเกมไม่ถูกต้อง',
    invalid_session_id: 'รหัสเซสชันไม่ถูกต้อง',
    player_not_found: 'ไม่พบผู้เล่นนี้ (อาจถูกลบไปแล้ว)',
    admin_not_found: 'ไม่พบผู้ใช้แอดมินนี้',
    ban_not_found: 'ผู้เล่นนี้ไม่ได้ถูกแบน',
    player_banned: 'ผู้เล่นนี้ถูกแบน — ต้องปลดแบนก่อน',
    run_not_found: 'ไม่พบรอบเกมนี้',
    run_not_suspicious: 'รอบนี้ไม่ได้ถูก flag อยู่',
    run_not_active: 'รอบนี้ไม่ได้กำลังเล่นอยู่',
    run_not_finished: 'ต้องปิดรอบเกมก่อนจึงจะอนุมัติได้',
    player_name_missing: 'ไม่พบชื่อผู้เล่นสำหรับบันทึกคะแนน',
    session_not_found: 'ไม่พบเซสชันนี้ (อาจหมดอายุแล้ว)',
    cannot_revoke_self: 'ตัดเซสชันที่กำลังใช้งานอยู่ไม่ได้',
    cannot_disable_self: 'ปิดใช้งานบัญชีของตัวเองไม่ได้',
    last_owner: 'ต้องมี owner ที่ใช้งานอยู่อย่างน้อย 1 คน',
    invalid_maintenance_password: 'รหัสยืนยันไม่ถูกต้อง',
    maintenance_not_configured: 'ยังไม่ได้ตั้งรหัสยืนยันเซิร์ฟเวอร์ — กรุณาตั้งค่าในฐานข้อมูลก่อน',
    not_connected: 'ยังเชื่อมต่อฐานข้อมูลไม่สำเร็จ'
  };

  const ACTION_LABELS = {
    login: 'เข้าสู่ระบบ',
    delete_score: 'ลบคะแนน',
    reset_score: 'รีเซ็ตคะแนน',
    score_set: 'ตั้งคะแนนใหม่',
    rename_player: 'เปลี่ยนชื่อผู้เล่น',
    ban_player: 'แบนผู้เล่น',
    unban_player: 'ปลดแบนผู้เล่น',
    run_approve: 'อนุมัติรอบเกม',
    run_reject: 'ยืนยันว่าเป็นบอท',
    run_flag: 'ตั้ง flag รอบเกม',
    run_terminate: 'ยกเลิกรอบเกม',
    revoke_session: 'ตัดเซสชัน',
    change_password: 'เปลี่ยนรหัสผ่าน',
    set_special_password: 'ตั้งรหัสผ่านพิเศษ',
    add_admin: 'เพิ่มผู้ดูแล',
    enable_admin: 'เปิดใช้งานผู้ดูแล',
    disable_admin: 'ปิดใช้งานผู้ดูแล',
    reset_admin_password: 'รีเซ็ตรหัสผ่านผู้ดูแล',
    maintenance_on: 'ปิดใช้งานเซิร์ฟเวอร์',
    maintenance_off: 'เปิดใช้งานเซิร์ฟเวอร์'
  };

  const COMMAND_GROUPS = [
    { id: 'players', title: 'ผู้เล่น', hint: 'ค้นหา ดูโปรไฟล์ และเปลี่ยนชื่อผู้เล่น' },
    { id: 'scores', title: 'คะแนน', hint: 'ตั้ง รีเซ็ต หรือลบคะแนนผู้เล่น' },
    { id: 'moderation', title: 'แบน / ปลดแบน', hint: 'จัดการผู้เล่นที่ละเมิดกติกา' },
    { id: 'runs', title: 'ตรวจสอบรอบเกม', hint: 'ตรวจ anti-bot และจัดการรอบที่ผิดปกติ' },
    { id: 'security', title: 'ความปลอดภัย', hint: 'จัดการเซสชันของผู้ดูแลระบบ' },
    { id: 'system', title: 'ระบบ', hint: 'ภาพรวมสถิติและสถานะเซิร์ฟเวอร์' }
  ];

  const COMMANDS = [
    { id: 'player.search', group: 'players', roles: ['owner', 'editor', 'viewer'], label: 'ค้นหาผู้เล่น', hint: 'ค้นจากชื่อหรือ UUID' },
    { id: 'player.detail', group: 'players', roles: ['owner', 'editor', 'viewer'], label: 'ดูโปรไฟล์ / ประวัติ', hint: 'คะแนน อันดับ สถานะแบน และรอบล่าสุด' },
    { id: 'player.rename', group: 'players', roles: ['owner', 'editor'], label: 'เปลี่ยนชื่อผู้เล่น', hint: 'แก้ชื่อที่แสดงบนอันดับ' },

    { id: 'score.set', group: 'scores', roles: ['owner'], label: 'ตั้งคะแนนใหม่', hint: 'กำหนดคะแนนเองพร้อมเหตุผล' },
    { id: 'score.reset', group: 'scores', roles: ['owner', 'editor'], label: 'รีเซ็ตคะแนน', hint: 'ตั้งคะแนนและสถิติเป็น 0' },
    { id: 'score.delete', group: 'scores', roles: ['owner', 'editor'], label: 'ลบคะแนน', hint: 'ลบผู้เล่นออกจากอันดับถาวร' },

    { id: 'player.ban', group: 'moderation', roles: ['owner', 'editor'], label: 'แบนผู้เล่น', hint: 'บล็อกการเล่นและการส่งคะแนน' },
    { id: 'player.unban', group: 'moderation', roles: ['owner', 'editor'], label: 'ปลดแบนผู้เล่น', hint: 'คืนสิทธิ์ให้ผู้เล่น' },

    { id: 'run.flagged', group: 'runs', roles: ['owner', 'editor', 'viewer'], label: 'รอบที่ถูก flag', hint: 'รายการรอบที่ anti-bot สงสัย' },
    { id: 'run.search', group: 'runs', roles: ['owner', 'editor', 'viewer'], label: 'ค้นหารอบตามผู้เล่น', hint: 'ดูประวัติรอบทั้งหมดของผู้เล่น' },
    { id: 'run.approve', group: 'runs', roles: ['owner', 'editor'], label: 'อนุมัติรอบ', hint: 'ล้าง flag โดยไม่บันทึกคะแนน' },
    { id: 'run.save', group: 'runs', roles: ['owner'], label: 'อนุมัติ + บันทึกคะแนน', hint: 'owner เท่านั้น — บันทึกคะแนนจากรอบที่ตรวจแล้ว' },
    { id: 'run.reject', group: 'runs', roles: ['owner', 'editor'], label: 'ยืนยันว่าเป็นบอท', hint: 'คงสถานะ flag และไม่บันทึกคะแนน' },
    { id: 'run.flag', group: 'runs', roles: ['owner', 'editor'], label: 'ตั้ง flag ด้วยมือ', hint: 'ทำเครื่องหมายรอบที่สงสัย' },
    { id: 'run.terminate', group: 'runs', roles: ['owner', 'editor'], label: 'ยกเลิกรอบที่กำลังเล่น', hint: 'ปิดรอบ active ทันที' },

    { id: 'sessions.manage', group: 'security', roles: ['owner'], label: 'จัดการเซสชัน', hint: 'ดูและตัดเซสชันของผู้ดูแล' },

    { id: 'system.stats', group: 'system', roles: ['owner', 'editor', 'viewer'], label: 'สถิติระบบ', hint: 'ผู้เล่น รอบเกม และจำนวนที่ถูก flag' },
    { id: 'server.maintenance', group: 'system', roles: ['owner', 'editor'], label: 'ปิด/เปิดใช้งานเซิร์ฟเวอร์', hint: 'หยุดรับผู้เล่นชั่วคราว (ต้องใส่รหัสยืนยัน)' }
  ];

  const state = {
    db: null,
    token: null,
    admin: null,
    tab: 'scores',
    search: '',
    bannedSearch: '',
    page: 0,
    limit: 50,
    sort: 'score',
    dir: 'desc',
    total: 0,
    rows: [],
    bannedRows: [],
    adminRows: [],
    confirmResolve: null,
    renameTarget: null,
    banTarget: null,
    resetAdminTarget: null,
    playerPickMode: 'player.detail',
    playerSearchRows: [],
    scoreTarget: null,
    reasonResolve: null,
    passwordRequest: null,
    runTarget: null,
    runListStatus: 'suspicious',
    runListPlayer: null,
    runListPage: 0,
    runListTitle: '',
    runListTotal: 0,
    sessions: [],
    maintenance: null,
    maintenanceBusy: false,
    expiresAt: null,
    sessionWarned: false,
    sessionWarnTimer: null,
    sessionEndTimer: null,
    sessionTickTimer: null
  };

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  const fmtNumber = (value) => Number(value || 0).toLocaleString('th-TH');

  const fmtDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const textOf = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

  const toIso = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  };

  function setMessage(el, text, type = '') {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('success', type === 'success');
    el.classList.toggle('info', type === 'info');
  }

  let toastTimer = null;
  function toast(text, isError = false) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('error', isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3600);
  }

  /* ------------------------------------------------------------------ */
  /* page / tab transitions                                              */
  /* ------------------------------------------------------------------ */

  function animateEnter(el, className) {
    if (!el) return;
    el.classList.remove(className);
    // รีเฟลช์เพื่อให้ animation เล่นใหม่ได้แม้เปลี่ยนหน้าถี่ ๆ
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener('animationend', function onEnd(event) {
      if (event.target !== el) return;
      el.classList.remove(className);
      el.removeEventListener('animationend', onEnd);
    });
  }

  /* ------------------------------------------------------------------ */
  /* theme (light / dark)                                               */
  /* ------------------------------------------------------------------ */

  function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist = true) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;

    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* ignore */ }
    }

    const button = $('themeToggle');
    if (button) {
      const dark = next === 'dark';
      const label = dark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#09090b' : '#fafafa');
  }

  function bindTheme() {
    applyTheme(currentTheme(), false);
    const button = $('themeToggle');
    if (button) {
      button.addEventListener('click', () => {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }
    window.addEventListener('storage', (event) => {
      if (event.key === THEME_KEY) {
        applyTheme(event.newValue === 'dark' ? 'dark' : 'light', false);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* session timer (แจ้งเตือนก่อนหมดอายุ + ออกจากระบบอัตโนมัติ)          */
  /* ------------------------------------------------------------------ */

  function persistSession(token, expiresAt) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
      const date = token && expiresAt ? new Date(expiresAt) : null;
      if (date && Number.isFinite(date.getTime())) {
        sessionStorage.setItem(EXPIRES_KEY, date.toISOString());
      } else {
        sessionStorage.removeItem(EXPIRES_KEY);
      }
    } catch (error) { /* ignore */ }
  }

  function clearSessionTimers() {
    if (state.sessionWarnTimer) clearTimeout(state.sessionWarnTimer);
    if (state.sessionEndTimer) clearTimeout(state.sessionEndTimer);
    if (state.sessionTickTimer) clearInterval(state.sessionTickTimer);
    state.sessionWarnTimer = null;
    state.sessionEndTimer = null;
    state.sessionTickTimer = null;
  }

  function fmtRemaining(ms) {
    const minutes = Math.max(0, Math.ceil(ms / 60000));
    if (minutes < 1) return 'น้อยกว่า 1 นาที';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} ชม. ${rest} นาที` : `${rest} นาที`;
  }

  function updateSessionTimer() {
    const el = $('sessionTimer');
    if (!el) return;
    const remaining = state.expiresAt ? state.expiresAt - Date.now() : null;
    const settingsEl = $('settingsSession');
    if (remaining === null || remaining <= 0) {
      el.hidden = true;
      if (settingsEl) settingsEl.textContent = '—';
      return;
    }
    el.hidden = false;
    el.textContent = `เซสชันเหลือ ${fmtRemaining(remaining)}`;
    el.classList.toggle('warning', remaining <= SESSION_WARN_MS);
    el.title = `หมดอายุเวลา ${new Date(state.expiresAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}`;
    if (settingsEl) {
      settingsEl.textContent = `เหลือ ${fmtRemaining(remaining)}`;
      settingsEl.classList.toggle('warning', remaining <= SESSION_WARN_MS);
    }
  }

  function warnSession() {
    if (state.sessionWarned) return;
    state.sessionWarned = true;
    updateSessionTimer();
    const remaining = state.expiresAt ? state.expiresAt - Date.now() : 0;
    toast(`เซสชันจะหมดอายุในอีก ${fmtRemaining(Math.max(remaining, 0))} — ควรบันทึกงานให้เสร็จ`);
  }

  function scheduleSession(expiresAt) {
    clearSessionTimers();
    const ts = expiresAt ? new Date(expiresAt).getTime() : NaN;
    state.expiresAt = Number.isFinite(ts) ? ts : null;
    state.sessionWarned = false;
    updateSessionTimer();
    if (!state.expiresAt) return;

    const remaining = state.expiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    if (remaining <= SESSION_WARN_MS) {
      warnSession();
    } else {
      state.sessionWarnTimer = setTimeout(warnSession, remaining - SESSION_WARN_MS);
    }
    state.sessionEndTimer = setTimeout(expireSession, remaining);
    state.sessionTickTimer = setInterval(updateSessionTimer, 30000);
  }

  function expireSession() {
    handleLoginFailure(new Error('invalid_session'));
  }

  function setPasswordDialogMode() {
    const forced = !!(state.admin && state.admin.must_change_password);
    const cancel = $('passwordCancel');
    if (cancel) cancel.hidden = forced;
    const dialog = $('passwordDialog');
    if (dialog) dialog.dataset.forced = String(forced);
  }

  function isSessionError(err) {
    return String((err && err.message) || '').includes('invalid_session');
  }

  function errorMessage(err) {
    const raw = String((err && (err.message || err.error_description)) || '');
    const code = String((err && err.code) || '');
    if (code === 'PGRST202' || code === '42883' || /could not find the function|does not exist/i.test(raw)) {
      return 'ยังไม่ได้ติดตั้งฐานข้อมูลแอดมิน — กรุณารัน Database/admin_system.sql ใน Supabase SQL Editor';
    }
    const key = Object.keys(MESSAGES).find((name) => raw.includes(name));
    if (key) return MESSAGES[key];
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต';
    return raw ? `เกิดข้อผิดพลาด: ${raw}` : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  }

  async function rpc(name, params) {
    if (!state.db) throw new Error('not_connected');
    const { data, error } = await state.db.rpc(name, params);
    if (error) {
      console.error('[wsg-admin] rpc failed:', name, error);
      throw error;
    }
    return data;
  }

  function fail(err, target) {
    if (isSessionError(err)) {
      handleLoginFailure(err);
      return;
    }
    const raw = String((err && (err.message || err.error_description)) || '');
    if (raw.includes('password_change_required')) {
      if (state.admin) state.admin.must_change_password = true;
      setPasswordDialogMode();
      if (target) setMessage(target, MESSAGES.password_change_required, 'error');
      openPasswordDialog();
      return;
    }
    const text = errorMessage(err);
    if (target) setMessage(target, text, 'error');
    toast(text, true);
  }

  function handleLoginFailure(err) {
    state.token = null;
    state.admin = null;
    state.expiresAt = null;
    clearSessionTimers();
    persistSession(null, null);
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    setPasswordDialogMode();
    showLogin(isSessionError(err) ? MESSAGES.invalid_session : errorMessage(err), 'error');
  }

  function openDialog(dialog) {
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function setPasswordToggle(button, show) {
    const input = $(button.dataset.togglePassword);
    if (!input) return;
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'ซ่อน' : 'ดู';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
  }

  function resetPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => setPasswordToggle(button, false));
  }

  function bindPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
      button.addEventListener('click', () => setPasswordToggle(button, button.getAttribute('aria-pressed') !== 'true'));
    });
  }

  function cell(text, className = '') {
    const td = document.createElement('td');
    td.textContent = textOf(text);
    if (className) td.className = className;
    return td;
  }

  function cellNode(node) {
    const td = document.createElement('td');
    td.append(node);
    return td;
  }

  function badge(text, modifier) {
    const el = document.createElement('span');
    el.className = `badge ${modifier || ''}`.trim();
    el.textContent = text;
    return el;
  }

  function emptyRow(colspan, text) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colspan;
    td.className = 'empty';
    td.textContent = text;
    tr.append(td);
    return tr;
  }

  function loadingRow(colspan) {
    return emptyRow(colspan, 'กำลังโหลดข้อมูล…');
  }

  function can(roles) {
    return !!(state.admin && roles.includes(state.admin.role));
  }

  function make(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== '') el.textContent = text;
    return el;
  }

  function pillEl(text, modifier = '') {
    return make('span', `pill ${modifier}`.trim(), text);
  }

  function detailItem(label, value) {
    const wrap = make('div', 'result-item');
    wrap.append(make('span', 'result-label', label));
    wrap.append(make('span', 'result-value', textOf(value)));
    return wrap;
  }

  function runStatusLabel(status) {
    return {
      active: 'กำลังเล่น',
      finished: 'จบแล้ว',
      abandoned: 'ถูกยกเลิก'
    }[status] || status || '—';
  }

  function playerLabel(row) {
    return (row && (row.name || row.player_name)) || 'ผู้เล่น';
  }

  function refreshPlayerTables() {
    if (state.tab === 'scores') return loadScores();
    if (state.tab === 'banned') return loadBanned();
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ */
  /* screens                                                             */
  /* ------------------------------------------------------------------ */

  function showLogin(message = '', type = '') {
    $('loginPanel').hidden = false;
    $('dashboard').hidden = true;
    $('sessionTimer').hidden = true;
    animateEnter($('loginPanel'), 'view-enter');
    const settingsMenu = $('settingsMenu');
    if (settingsMenu) settingsMenu.open = false;
    resetPasswordToggles();
    setPasswordDialogMode();
    setMessage($('loginMessage'), message, type);
    const user = $('username');
    if (user) user.focus();
  }

  function showDashboard() {
    $('loginPanel').hidden = true;
    $('dashboard').hidden = false;
    animateEnter($('dashboard'), 'view-enter');
  }

  function applyAdmin(admin) {
    if (admin) state.admin = { ...(state.admin || {}), ...admin };
    const current = state.admin || {};
    const roleLabel = ROLE_LABELS[current.role] || current.role || '—';
    $('adminName').textContent = current.username || '—';
    const roleEl = $('adminRole');
    roleEl.textContent = roleLabel;
    roleEl.className = `badge ${current.role || ''}`.trim();
    const settingsName = $('settingsAdminName');
    if (settingsName) settingsName.textContent = current.username || '—';
    const settingsRole = $('settingsAdminRole');
    if (settingsRole) {
      settingsRole.textContent = roleLabel;
      settingsRole.className = `badge ${current.role || ''}`.trim();
    }
    const avatar = $('settingsAvatar');
    if (avatar) avatar.textContent = String(current.username || '?').charAt(0).toUpperCase();
    $('adminsTab').hidden = current.role !== 'owner';
    $('specialPasswordButton').hidden = current.role !== 'owner';
    $('maintenanceButton').hidden = !can(['owner', 'editor']);
    $('passwordWarning').hidden = !current.must_change_password;
    renderCommands();
  }

  function applyStats(stats) {
    if (!stats) return;
    $('playerCount').textContent = fmtNumber(stats.player_count);
    $('averageScore').textContent = fmtNumber(Math.round(Number(stats.average_score || 0)));
    $('highestScore').textContent = fmtNumber(stats.highest_score);
    $('bannedCount').textContent = fmtNumber(stats.banned_count);
    if (typeof stats.maintenance === 'boolean') applyMaintenance({ maintenance: stats.maintenance });
  }

  function applyMaintenance(status) {
    if (status && typeof status.maintenance === 'boolean') {
      state.maintenance = { ...(state.maintenance || {}), ...status };
    }
    const on = !!(state.maintenance && state.maintenance.maintenance);
    const banner = $('maintenanceWarning');
    if (banner) banner.hidden = !on || !can(['owner', 'editor']);
    const statusEl = $('settingsServerStatus');
    if (statusEl) {
      statusEl.textContent = on ? 'ปิดรับผู้เล่น' : 'เปิดปกติ';
      statusEl.className = `pill ${on ? 'danger' : 'ok'}`;
    }
  }

  async function loadMaintenanceStatus() {
    if (!state.token || !can(['owner', 'editor'])) return;
    try {
      const data = await rpc('admin_maintenance_status', { p_token: state.token });
      applyMaintenance(data);
    } catch (err) {
      // ถ้ายังไม่ได้รัน SQL ส่วนนี้ อย่าทำให้ dashboard ทั้งหน้าใช้งานไม่ได้
      console.warn('[wsg-admin] maintenance status failed', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /* tabs                                                                */
  /* ------------------------------------------------------------------ */

  function switchTab(tab) {
    if (!TABS.includes(tab)) return;
    if (tab === 'commands' && $('commandsTab').hidden) {
      if (state.tab === 'commands') tab = 'scores';
      else return;
    }
    const previous = state.tab;
    const changed = tab !== previous;
    const direction = TABS.indexOf(tab) >= TABS.indexOf(previous) ? 'right' : 'left';
    state.tab = tab;
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
    });
    TABS.forEach((name) => {
      const panel = $('tab-' + name);
      const active = name === tab;
      panel.hidden = !active;
      if (active && changed) {
        panel.dataset.enter = direction;
        animateEnter(panel, 'tab-enter');
      } else {
        panel.classList.remove('tab-enter');
      }
    });
    if (tab === 'scores') return loadScores();
    if (tab === 'banned') return loadBanned();
    if (tab === 'audit') return loadAudit();
    if (tab === 'commands') { renderCommands(); return; }
    if (tab === 'admins') return loadAdmins();
  }

  /* ------------------------------------------------------------------ */
  /* command center                                                      */
  /* ------------------------------------------------------------------ */

  function renderCommands() {
    const host = $('commandGroups');
    if (!host) return;

    host.textContent = '';
    const groups = COMMAND_GROUPS
      .map((group) => ({
        ...group,
        commands: COMMANDS.filter((cmd) => cmd.group === group.id && can(cmd.roles))
      }))
      .filter((group) => group.commands.length > 0);

    groups.forEach((group) => {
      const section = make('section', 'command-group');
      section.append(make('h3', '', group.title));
      section.append(make('p', '', group.hint));
      const grid = make('div', 'command-grid');
      group.commands.forEach((cmd) => {
        const button = make('button', 'command-card');
        button.type = 'button';
        button.dataset.command = cmd.id;
        button.append(make('strong', '', cmd.label));
        button.append(make('span', '', cmd.hint));
        grid.append(button);
      });
      section.append(grid);
      host.append(section);
    });

    $('commandsTab').hidden = groups.length === 0;
    if (!groups.length && state.tab === 'commands') switchTab('scores');
  }

  function runCommand(id) {
    const command = COMMANDS.find((item) => item.id === id);
    if (!command || !can(command.roles)) {
      toast(MESSAGES.forbidden, true);
      return;
    }

    switch (id) {
      case 'player.search':
        return openPlayerPicker('player.detail', 'ค้นหาผู้เล่น', 'พิมพ์ชื่อหรือ UUID แล้วกดค้นหา');
      case 'player.detail':
        return openPlayerPicker('player.detail', 'ดูโปรไฟล์ผู้เล่น', 'เลือกผู้เล่นที่ต้องการดูข้อมูล');
      case 'player.rename':
        return openPlayerPicker('player.rename', 'เปลี่ยนชื่อผู้เล่น', 'เลือกผู้เล่นที่ต้องการเปลี่ยนชื่อ');
      case 'score.set':
        return openPlayerPicker('score.set', 'ตั้งคะแนนใหม่', 'เลือกผู้เล่นที่ต้องการกำหนดคะแนน');
      case 'score.reset':
        return openPlayerPicker('score.reset', 'รีเซ็ตคะแนน', 'เลือกผู้เล่นที่ต้องการรีเซ็ต');
      case 'score.delete':
        return openPlayerPicker('score.delete', 'ลบคะแนน', 'เลือกผู้เล่นที่ต้องการลบออกจากอันดับ');
      case 'player.ban':
        return openPlayerPicker('player.ban', 'แบนผู้เล่น', 'เลือกผู้เล่นที่ต้องการแบน');
      case 'player.unban':
        return openPlayerPicker('player.unban', 'ปลดแบนผู้เล่น', 'เลือกผู้เล่นที่ต้องการปลดแบน');
      case 'run.flagged':
        return loadRuns({ status: 'suspicious', player: null, page: 0, title: 'รอบที่ถูก flag' });
      case 'run.search':
        return openPlayerPicker('runs.player', 'ค้นหารอบตามผู้เล่น', 'เลือกผู้เล่นเพื่อดูรอบเกมทั้งหมด');
      case 'run.approve':
        return loadRuns({ status: 'suspicious', player: null, page: 0, title: 'เลือกรอบเพื่ออนุมัติ' });
      case 'run.save':
        return loadRuns({ status: 'suspicious', player: null, page: 0, title: 'เลือกรอบเพื่ออนุมัติและบันทึกคะแนน' });
      case 'run.reject':
        return loadRuns({ status: 'suspicious', player: null, page: 0, title: 'เลือกรอบเพื่อยืนยันว่าเป็นบอท' });
      case 'run.flag':
        return loadRuns({ status: 'all', player: null, page: 0, title: 'เลือกรอบเพื่อตั้ง flag' });
      case 'run.terminate':
        return loadRuns({ status: 'active', player: null, page: 0, title: 'รอบที่กำลังเล่น' });
      case 'sessions.manage':
        return loadSessions();
      case 'system.stats':
        return loadSystemStats();
      case 'server.maintenance':
        return openMaintenanceDialog();
      default:
        return undefined;
    }
  }

  function openPlayerPicker(mode, title, hint) {
    state.playerPickMode = mode;
    state.playerSearchRows = [];
    $('playerSearchForm').reset();
    $('playerSearchResults').textContent = '';
    $('playerSearchTitle').textContent = title;
    $('playerSearchHint').textContent = hint;
    setMessage($('playerSearchMessage'), '');
    openDialog($('playerSearchDialog'));
    $('playerSearchInput').focus();
  }

  async function onPlayerSearch(event) {
    event.preventDefault();
    const query = $('playerSearchInput').value.trim();
    setMessage($('playerSearchMessage'), 'กำลังค้นหา…', 'info');
    try {
      const data = await rpc('admin_player_search', {
        p_token: state.token,
        p_query: query,
        p_limit: 20,
        p_offset: 0
      });
      state.playerSearchRows = Array.isArray(data && data.rows) ? data.rows : [];
      renderPlayerSearchResults();
      setMessage(
        $('playerSearchMessage'),
        state.playerSearchRows.length ? `พบ ${fmtNumber(data && data.total)} รายการ` : 'ไม่พบผู้เล่นที่ตรงกับคำค้น',
        state.playerSearchRows.length ? 'success' : 'error'
      );
    } catch (err) {
      state.playerSearchRows = [];
      $('playerSearchResults').textContent = '';
      fail(err, $('playerSearchMessage'));
    }
  }

  function renderPlayerSearchResults() {
    const host = $('playerSearchResults');
    host.textContent = '';
    if (!state.playerSearchRows.length) {
      host.append(make('p', 'result-empty', 'ยังไม่มีผลลัพธ์'));
      return;
    }

    state.playerSearchRows.forEach((row) => {
      const card = make('div', 'result-card');
      const head = make('div', 'result-card-head');
      const title = make('div');
      title.append(make('strong', '', row.name));
      title.append(make('div', 'result-label', String(row.user_id).slice(0, 8)));
      head.append(title);
      head.append(pillEl(row.is_banned ? 'ถูกแบน' : 'ปกติ', row.is_banned ? 'danger' : 'ok'));

      const grid = make('div', 'result-grid');
      grid.append(detailItem('คะแนน', fmtNumber(row.score)));
      grid.append(detailItem('ตอบถูก', fmtNumber(row.right_count)));
      grid.append(detailItem('คอมโบสูงสุด', fmtNumber(row.max_combo)));
      grid.append(detailItem('อัปเดตล่าสุด', fmtDate(row.updated_at)));

      const actions = make('div', 'result-actions');
      const pick = make('button', 'button primary small', 'เลือก');
      pick.type = 'button';
      pick.dataset.pickUser = row.user_id;
      actions.append(pick);

      card.append(head, grid, actions);
      host.append(card);
    });
  }

  async function handlePlayerPicked(row) {
    if (!row) return;
    const mode = state.playerPickMode;
    closeDialog($('playerSearchDialog'));

    if (mode === 'player.detail') return openPlayerDetail(row.user_id);
    if (mode === 'player.rename') return openRenameDialog(row.user_id, row.name);
    if (mode === 'player.ban') return openBanDialog(row.user_id, row.name);
    if (mode === 'player.unban') return unbanPlayer(row);
    if (mode === 'score.set') return openScoreSetDialog(row);
    if (mode === 'score.reset') return resetScore(row);
    if (mode === 'score.delete') return deleteScore(row);
    if (mode === 'runs.player') {
      return loadRuns({ status: 'all', player: row.user_id, page: 0, title: `รอบของ ${row.name}` });
    }
    return undefined;
  }

  async function openPlayerDetail(userId) {
    try {
      const data = await rpc('admin_player_detail', { p_token: state.token, p_user_id: userId });
      renderPlayerDetail(data);
      openDialog($('playerDetailDialog'));
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  function renderPlayerDetail(data) {
    $('playerDetailTitle').textContent = data.name || 'โปรไฟล์ผู้เล่น';
    const body = $('playerDetailBody');
    body.textContent = '';

    const card = make('div', 'result-card');
    const grid = make('div', 'result-grid');
    grid.append(detailItem('ชื่อ', data.name));
    grid.append(detailItem('UUID', data.user_id));
    grid.append(detailItem('คะแนน', fmtNumber(data.score)));
    grid.append(detailItem('อันดับ', `#${fmtNumber(data.rank)}`));
    grid.append(detailItem('ตอบถูก', fmtNumber(data.right_count)));
    grid.append(detailItem('คอมโบสูงสุด', fmtNumber(data.max_combo)));
    grid.append(detailItem('สถานะ', data.is_banned ? 'ถูกแบน' : 'ปกติ'));
    grid.append(detailItem('เหตุผลที่แบน', data.ban_reason));
    grid.append(detailItem('รอบทั้งหมด', fmtNumber(data.run_count)));
    grid.append(detailItem('รอบที่ถูก flag', fmtNumber(data.flagged_count)));
    grid.append(detailItem('เล่นล่าสุด', fmtDate(data.last_played_at)));
    grid.append(detailItem('อัปเดตคะแนน', fmtDate(data.updated_at)));

    const actions = make('div', 'result-actions');
    const add = (label, className, handler) => {
      const button = make('button', `button ${className || 'secondary'} small`, label);
      button.type = 'button';
      button.addEventListener('click', handler);
      actions.append(button);
    };

    add('ดูรอบเกม', 'secondary', () => {
      closeDialog($('playerDetailDialog'));
      loadRuns({ status: 'all', player: data.user_id, page: 0, title: `รอบของ ${data.name}` });
    });
    if (can(['owner', 'editor'])) {
      add('เปลี่ยนชื่อ', 'secondary', () => {
        closeDialog($('playerDetailDialog'));
        openRenameDialog(data.user_id, data.name);
      });
      if (data.is_banned) {
        add('ปลดแบน', 'secondary', () => unbanPlayer(data));
      } else {
        add('แบน', 'danger', () => {
          closeDialog($('playerDetailDialog'));
          openBanDialog(data.user_id, data.name);
        });
      }
      add('รีเซ็ตคะแนน', 'secondary', () => resetScore(data));
      add('ลบคะแนน', 'danger', () => deleteScore(data));
    }
    if (can(['owner'])) {
      add('ตั้งคะแนนใหม่', 'primary', () => openScoreSetDialog(data));
    }

    card.append(grid, actions);
    body.append(card);

    if (Array.isArray(data.recent_runs) && data.recent_runs.length) {
      body.append(make('h3', '', 'รอบล่าสุด'));
      const list = make('ul', 'mini-list');
      data.recent_runs.forEach((run) => {
        const item = make('li');
        item.append(make('strong', '', `${fmtNumber(run.score)} คะแนน`));
        item.append(document.createTextNode(
          ` — ${runStatusLabel(run.status)} — ตอบ ${fmtNumber(run.answered)} ข้อ — ${fmtDate(run.finished_at || run.started_at)}`
        ));
        if (run.suspicious) item.append(pillEl('flagged', 'warn'));
        list.append(item);
      });
      body.append(list);
    }
  }

  function openScoreSetDialog(row) {
    state.scoreTarget = row;
    $('scoreSetForm').reset();
    $('scoreValue').value = String(Number(row.score || 0));
    $('scoreTargetText').textContent = `ผู้เล่น: ${row.name} — คะแนนปัจจุบัน ${fmtNumber(row.score)}`;
    setMessage($('scoreSetMessage'), '');
    openDialog($('scoreSetDialog'));
    $('scoreValue').focus();
    $('scoreValue').select();
  }

  async function onScoreSet(event) {
    event.preventDefault();
    const target = state.scoreTarget;
    if (!target) return;
    const score = Number($('scoreValue').value);
    const reason = $('scoreReason').value.trim();
    if (!Number.isInteger(score) || score < 0 || score > 1000000) {
      setMessage($('scoreSetMessage'), MESSAGES.invalid_score, 'error');
      return;
    }
    if (reason.length < 3 || reason.length > 200) {
      setMessage($('scoreSetMessage'), MESSAGES.invalid_reason, 'error');
      return;
    }
    const button = $('scoreSetForm').querySelector('button[type="submit"]');
    button.disabled = true;
    closeDialog($('scoreSetDialog'));
    try {
      const done = await requestPassword(
        {
          title: 'ตั้งคะแนนใหม่',
          text: `ตั้งคะแนนของ ${playerLabel(target)} เป็น ${fmtNumber(score)}`,
          okLabel: 'บันทึกคะแนน'
        },
        (password) => rpc('admin_set_score', {
          p_token: state.token,
          p_user_id: target.user_id,
          p_score: score,
          p_password: password,
          p_reason: reason
        })
      );
      state.scoreTarget = null;
      if (!done) return;
      toast('ตั้งคะแนนใหม่แล้ว');
      await refreshPlayerTables();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    } finally {
      button.disabled = false;
    }
  }

  function promptReason({ title, text, okLabel = 'ยืนยัน', danger = true }) {
    return new Promise((resolve) => {
      state.reasonResolve = resolve;
      $('reasonTitle').textContent = title;
      $('reasonText').textContent = text;
      $('reasonSubmit').textContent = okLabel;
      $('reasonSubmit').className = `button ${danger ? 'danger' : 'primary'}`;
      $('reasonForm').reset();
      setMessage($('reasonMessage'), '');
      openDialog($('reasonDialog'));
      $('reasonInput').focus();
    });
  }

  function settleReason(value) {
    const resolve = state.reasonResolve;
    state.reasonResolve = null;
    closeDialog($('reasonDialog'));
    if (resolve) resolve(value);
  }

  function onReasonSubmit(event) {
    event.preventDefault();
    const reason = $('reasonInput').value.trim();
    if (reason.length < 3 || reason.length > 200) {
      setMessage($('reasonMessage'), MESSAGES.invalid_reason, 'error');
      return;
    }
    settleReason(reason);
  }

  async function resetScore(row) {
    const reason = await promptReason({
      title: 'รีเซ็ตคะแนน',
      text: `ตั้งคะแนนและสถิติของ ${playerLabel(row)} เป็น 0`,
      okLabel: 'รีเซ็ต'
    });
    if (!reason) return;
    try {
      const done = await requestPassword(
        {
          title: 'รีเซ็ตคะแนน',
          text: `ตั้งคะแนนและสถิติของ ${playerLabel(row)} เป็น 0`,
          okLabel: 'รีเซ็ต'
        },
        (password) => rpc('admin_reset_score', {
          p_token: state.token,
          p_user_id: row.user_id,
          p_password: password,
          p_reason: reason
        })
      );
      if (!done) return;
      toast('รีเซ็ตคะแนนแล้ว');
      await refreshPlayerTables();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  async function deleteScore(row) {
    const reason = await promptReason({
      title: 'ลบคะแนน',
      text: `ลบ ${playerLabel(row)} ออกจากอันดับถาวร`,
      okLabel: 'ลบ'
    });
    if (!reason) return;
    try {
      const done = await requestPassword(
        {
          title: 'ลบคะแนน',
          text: `ลบ ${playerLabel(row)} ออกจากอันดับถาวร`,
          okLabel: 'ลบ'
        },
        (password) => rpc('admin_delete_score', {
          p_token: state.token,
          p_user_id: row.user_id,
          p_password: password,
          p_reason: reason
        })
      );
      if (!done) return;
      toast('ลบคะแนนแล้ว');
      await refreshPlayerTables();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  async function unbanPlayer(row) {
    try {
      const done = await requestPassword(
        {
          title: 'ปลดแบนผู้เล่น',
          text: `ปลดแบน ${playerLabel(row)}`,
          okLabel: 'ปลดแบน'
        },
        (password) => rpc('admin_unban_player', {
          p_token: state.token,
          p_user_id: row.user_id,
          p_password: password
        })
      );
      if (!done) return;
      toast('ปลดแบนแล้ว');
      await refreshPlayerTables();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  function showCommandResult(title) {
    $('commandResultTitle').textContent = title || 'ผลลัพธ์';
    $('commandResultBody').textContent = '';
    $('commandResult').hidden = false;
    $('commandResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeCommandResult() {
    $('commandResult').hidden = true;
    $('commandResultBody').textContent = '';
    state.runListTotal = 0;
  }

  async function loadRuns({ status = 'all', player = null, page = 0, title = 'รายการรอบเกม' } = {}) {
    state.runListStatus = status;
    state.runListPlayer = player;
    state.runListPage = page;
    state.runListTitle = title;
    showCommandResult(title);
    const body = $('commandResultBody');
    body.append(make('p', 'result-empty', 'กำลังโหลดข้อมูล…'));

    try {
      const data = await rpc('admin_runs_list', {
        p_token: state.token,
        p_status: status,
        p_player: player,
        p_limit: 20,
        p_offset: page * 20
      });
      state.runListTotal = Number((data && data.total) || 0);
      body.textContent = '';
      renderRuns(Array.isArray(data && data.rows) ? data.rows : []);
    } catch (err) {
      body.textContent = '';
      body.append(make('p', 'result-empty', errorMessage(err)));
      fail(err, $('dashboardMessage'));
    }
  }

  function addRunAction(container, action, label, runId, modifier = '') {
    const button = make('button', `button ${modifier || 'secondary'} small`, label);
    button.type = 'button';
    button.dataset.runAction = action;
    button.dataset.runId = runId;
    container.append(button);
  }

  function runActionButtons(run, inDialog) {
    const wrap = make('div', 'result-actions');

    if (!inDialog) {
      const detail = make('button', 'button secondary small', 'รายละเอียด');
      detail.type = 'button';
      detail.dataset.runOpen = run.id;
      wrap.append(detail);
    }

    if (can(['owner', 'editor'])) {
      if (run.status === 'active') {
        addRunAction(wrap, 'terminate', 'ยกเลิกรอบ', run.id, 'danger');
      } else if (run.suspicious) {
        addRunAction(wrap, 'approve', 'อนุมัติ (ไม่บันทึก)', run.id);
        if (can(['owner'])) addRunAction(wrap, 'approve-save', 'อนุมัติ + บันทึกคะแนน', run.id, 'primary');
        addRunAction(wrap, 'reject', 'ยืนยันว่าเป็นบอท', run.id, 'danger');
      } else if (run.status === 'finished') {
        addRunAction(wrap, 'flag', 'ตั้ง flag', run.id);
      }
    }

    return wrap;
  }

  function renderRuns(rows) {
    const body = $('commandResultBody');
    if (!rows.length) {
      body.append(make('p', 'result-empty', 'ไม่พบรอบเกมที่ตรงเงื่อนไข'));
      return;
    }

    rows.forEach((run) => {
      const card = make('div', 'result-card');
      const head = make('div', 'result-card-head');
      const title = make('div');
      title.append(make('strong', '', run.player_name));
      title.append(make('div', 'result-label', String(run.id).slice(0, 8)));
      head.append(title);

      const badges = make('div', 'result-actions');
      badges.append(pillEl(runStatusLabel(run.status), run.status === 'active' ? 'info' : ''));
      if (run.suspicious) badges.append(pillEl('flagged', 'warn'));
      head.append(badges);

      const grid = make('div', 'result-grid');
      grid.append(detailItem('คะแนน', fmtNumber(run.score)));
      grid.append(detailItem('ตอบ', fmtNumber(run.answered)));
      grid.append(detailItem('ตอบถูก', fmtNumber(run.right_count)));
      grid.append(detailItem('คอมโบสูงสุด', fmtNumber(run.max_combo)));
      grid.append(detailItem('เฉลี่ยต่อข้อ', run.mean_delta_ms === null ? '—' : `${fmtNumber(run.mean_delta_ms)} ms`));
      grid.append(detailItem('ส่วนเบี่ยงเบน', run.sd_delta_ms === null ? '—' : `${fmtNumber(run.sd_delta_ms)} ms`));
      grid.append(detailItem('เริ่ม', fmtDate(run.started_at)));
      grid.append(detailItem('จบ', fmtDate(run.finished_at)));
      if (run.suspicious && run.flag_reason) grid.append(detailItem('เหตุผล flag', run.flag_reason));

      card.append(head, grid, runActionButtons(run, false));
      body.append(card);
    });

    const pages = Math.max(1, Math.ceil(state.runListTotal / 20));
    const pager = make('div', 'result-pager');
    pager.append(make('span', '', `แสดง ${fmtNumber(rows.length)} จาก ${fmtNumber(state.runListTotal)} รอบ — หน้า ${state.runListPage + 1} / ${pages}`));
    const nav = make('div', 'result-actions');
    const prev = make('button', 'button secondary small', 'ก่อนหน้า');
    prev.type = 'button';
    prev.dataset.runPage = String(state.runListPage - 1);
    prev.disabled = state.runListPage <= 0;
    const next = make('button', 'button secondary small', 'ถัดไป');
    next.type = 'button';
    next.dataset.runPage = String(state.runListPage + 1);
    next.disabled = state.runListPage >= pages - 1;
    nav.append(prev, next);
    pager.append(nav);
    body.append(pager);
  }

  async function openRunDetail(runId) {
    try {
      const data = await rpc('admin_run_detail', { p_token: state.token, p_run_id: runId });
      state.runTarget = data;
      $('runDetailTitle').textContent = `รอบของ ${data.player_name}`;
      const body = $('runDetailBody');
      body.textContent = '';
      const card = make('div', 'result-card');
      const grid = make('div', 'result-grid');
      grid.append(detailItem('สถานะ', runStatusLabel(data.status)));
      grid.append(detailItem('ถูก flag', data.suspicious ? 'ใช่' : 'ไม่'));
      grid.append(detailItem('เหตุผล flag', data.flag_reason));
      grid.append(detailItem('คะแนน', fmtNumber(data.score)));
      grid.append(detailItem('ตอบ', fmtNumber(data.answered)));
      grid.append(detailItem('ตอบถูก', fmtNumber(data.right_count)));
      grid.append(detailItem('คอมโบสูงสุด', fmtNumber(data.max_combo)));
      grid.append(detailItem('เฉลี่ยต่อข้อ', data.mean_delta_ms === null ? '—' : `${fmtNumber(data.mean_delta_ms)} ms`));
      grid.append(detailItem('ส่วนเบี่ยงเบน', data.sd_delta_ms === null ? '—' : `${fmtNumber(data.sd_delta_ms)} ms`));
      grid.append(detailItem('เวลาตอบเร็วสุด', data.min_delta === null ? '—' : `${fmtNumber(data.min_delta)} ms`));
      grid.append(detailItem('เวลาตอบช้าสุด', data.max_delta === null ? '—' : `${fmtNumber(data.max_delta)} ms`));
      grid.append(detailItem('จำนวนข้อ', fmtNumber(data.items_count)));
      grid.append(detailItem('เริ่ม', fmtDate(data.started_at)));
      grid.append(detailItem('จบ', fmtDate(data.finished_at)));
      card.append(grid);
      body.append(card);
      $('runDetailActions').replaceChildren(runActionButtons(data, true));
      openDialog($('runDetailDialog'));
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  async function handleRunAction(action, runId) {
    const configs = {
      approve: { title: 'อนุมัติรอบเกม', text: 'ล้าง flag ของรอบนี้โดยไม่บันทึกคะแนน', okLabel: 'อนุมัติ', review: 'approve', save: false, danger: false, success: 'อนุมัติรอบแล้ว' },
      'approve-save': { title: 'อนุมัติและบันทึกคะแนน', text: 'ล้าง flag และบันทึกคะแนนจากรอบนี้เข้าอันดับ', okLabel: 'อนุมัติ + บันทึก', review: 'approve', save: true, danger: false, success: 'อนุมัติและบันทึกคะแนนแล้ว' },
      reject: { title: 'ยืนยันว่าเป็นบอท', text: 'คงสถานะ flag และไม่บันทึกคะแนนจากรอบนี้', okLabel: 'ยืนยันว่าเป็นบอท', review: 'reject', save: false, danger: true, success: 'ยืนยันว่าเป็นบอทแล้ว' },
      flag: { title: 'ตั้ง flag ด้วยมือ', text: 'ทำเครื่องหมายรอบนี้ว่าสงสัยและไม่บันทึกคะแนน', okLabel: 'ตั้ง flag', review: 'flag', save: false, danger: true, success: 'ตั้ง flag แล้ว' },
      terminate: { title: 'ยกเลิกรอบเกม', text: 'ปิดรอบที่กำลังเล่นทันทีและไม่บันทึกคะแนน', okLabel: 'ยกเลิกรอบ', review: 'terminate', save: false, danger: true, success: 'ยกเลิกรอบแล้ว' }
    };
    const config = configs[action];
    if (!config) return;

    const reason = await promptReason({
      title: config.title,
      text: config.text,
      okLabel: config.okLabel,
      danger: config.danger
    });
    if (!reason) return;

    try {
      await rpc('admin_run_review', {
        p_token: state.token,
        p_run_id: runId,
        p_action: config.review,
        p_note: reason,
        p_save_score: config.save
      });
      closeDialog($('runDetailDialog'));
      toast(config.success);
      await loadRuns({
        status: state.runListStatus,
        player: state.runListPlayer,
        page: state.runListPage,
        title: state.runListTitle
      });
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  async function loadSessions() {
    showCommandResult('เซสชันที่ใช้งาน');
    const body = $('commandResultBody');
    body.append(make('p', 'result-empty', 'กำลังโหลดข้อมูล…'));
    try {
      const rows = await rpc('admin_sessions_list', { p_token: state.token });
      state.sessions = Array.isArray(rows) ? rows : [];
      body.textContent = '';
      renderSessions();
    } catch (err) {
      body.textContent = '';
      body.append(make('p', 'result-empty', errorMessage(err)));
      fail(err, $('dashboardMessage'));
    }
  }

  function renderSessions() {
    const body = $('commandResultBody');
    if (!state.sessions.length) {
      body.append(make('p', 'result-empty', 'ไม่มีเซสชันที่ใช้งานอยู่'));
      return;
    }

    state.sessions.forEach((session) => {
      const card = make('div', 'result-card');
      const head = make('div', 'result-card-head');
      const title = make('div');
      title.append(make('strong', '', session.username));
      title.append(make('div', 'result-label', `${session.role} — ${String(session.token_hash).slice(0, 12)}…`));
      head.append(title);
      if (session.is_current) head.append(pillEl('เซสชันนี้', 'ok'));

      const grid = make('div', 'result-grid');
      grid.append(detailItem('เข้าสู่ระบบ', fmtDate(session.created_at)));
      grid.append(detailItem('ใช้งานล่าสุด', fmtDate(session.last_seen_at)));
      grid.append(detailItem('หมดอายุ', fmtDate(session.expires_at)));
      card.append(head, grid);

      if (!session.is_current) {
        const actions = make('div', 'result-actions');
        const revoke = make('button', 'button danger small', 'ตัดเซสชัน');
        revoke.type = 'button';
        revoke.dataset.sessionRevoke = session.token_hash;
        revoke.dataset.sessionName = session.username;
        actions.append(revoke);
        card.append(actions);
      }

      body.append(card);
    });
  }

  async function revokeSession(hash, username) {
    const ok = await confirmAction('ตัดเซสชัน', `ตัดเซสชันของ ${username} ใช่หรือไม่?`, 'ตัดเซสชัน');
    if (!ok) return;
    try {
      await rpc('admin_revoke_session', { p_token: state.token, p_session_hash: hash });
      toast(`ตัดเซสชันของ ${username} แล้ว`);
      await loadSessions();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  async function loadSystemStats() {
    showCommandResult('สถิติระบบ');
    const body = $('commandResultBody');
    body.append(make('p', 'result-empty', 'กำลังโหลดข้อมูล…'));
    try {
      const data = await rpc('admin_stats', { p_token: state.token });
      body.textContent = '';
      const card = make('div', 'result-card');
      const grid = make('div', 'result-grid');
      grid.append(detailItem('ผู้เล่นทั้งหมด', fmtNumber(data.player_count)));
      grid.append(detailItem('คะแนนเฉลี่ย', fmtNumber(data.average_score)));
      grid.append(detailItem('คะแนนสูงสุด', fmtNumber(data.highest_score)));
      grid.append(detailItem('ผู้เล่นที่ถูกแบน', fmtNumber(data.banned_count)));
      grid.append(detailItem('สถานะเซิร์ฟเวอร์', data.maintenance ? 'ปิดรับผู้เล่น' : 'เปิดใช้งานปกติ'));
      grid.append(detailItem('ผู้ดูแลที่ใช้งาน', fmtNumber(data.admin_count)));
      grid.append(detailItem('รอบทั้งหมด', fmtNumber(data.total_runs)));
      grid.append(detailItem('รอบวันนี้', fmtNumber(data.runs_today)));
      grid.append(detailItem('รอบที่กำลังเล่น', fmtNumber(data.active_runs)));
      grid.append(detailItem('รอบที่จบแล้ว', fmtNumber(data.finished_runs)));
      grid.append(detailItem('รอบที่ถูก flag', fmtNumber(data.flagged_runs)));
      grid.append(detailItem('flag วันนี้', fmtNumber(data.flagged_today)));
      grid.append(detailItem('เวลาเล่นเฉลี่ย', `${fmtNumber(data.avg_run_seconds)} วินาที`));
      card.append(grid);
      body.append(card);
    } catch (err) {
      body.textContent = '';
      body.append(make('p', 'result-empty', errorMessage(err)));
      fail(err, $('dashboardMessage'));
    }
  }

  function openMaintenanceDialog() {
    const on = !!(state.maintenance && state.maintenance.maintenance);
    $('maintenanceForm').reset();
    resetPasswordToggles();
    setMessage($('maintenanceMessage'), '');
    $('maintenanceDialogStatus').textContent = on
      ? 'สถานะปัจจุบัน: ปิดรับผู้เล่นอยู่ — กรอกรหัสยืนยันเพื่อเปิดใช้งานเซิร์ฟเวอร์'
      : 'สถานะปัจจุบัน: เปิดใช้งานปกติ — กรอกรหัสยืนยันเพื่อปิดรับผู้เล่นชั่วคราว';
    const submit = $('maintenanceSubmit');
    submit.textContent = on ? 'เปิดใช้งานเซิร์ฟเวอร์' : 'ปิดใช้งานเซิร์ฟเวอร์';
    submit.className = on ? 'button primary' : 'button danger';
    openDialog($('maintenanceDialog'));
    $('maintenancePassword').focus();
  }

  async function onMaintenanceSubmit(event) {
    event.preventDefault();
    if (state.maintenanceBusy) return;
    const password = $('maintenancePassword').value;
    if (!password) {
      setMessage($('maintenanceMessage'), 'กรุณากรอกรหัสยืนยัน', 'error');
      $('maintenancePassword').focus();
      return;
    }

    const currentlyOn = !!(state.maintenance && state.maintenance.maintenance);
    const target = !currentlyOn;
    const button = $('maintenanceSubmit');
    state.maintenanceBusy = true;
    button.disabled = true;
    setMessage($('maintenanceMessage'), 'กำลังบันทึก…', 'info');
    try {
      const data = await rpc('admin_set_maintenance', {
        p_token: state.token,
        p_enabled: target,
        p_password: password
      });
      applyMaintenance({ ...(data || {}), maintenance: target });
      $('maintenanceForm').reset();
      closeDialog($('maintenanceDialog'));
      toast(target
        ? 'ปิดใช้งานเซิร์ฟเวอร์แล้ว ผู้เล่นจะเห็นหน้าปิดปรับปรุงชั่วคราว'
        : 'เปิดใช้งานเซิร์ฟเวอร์แล้ว ผู้เล่นกลับมาเล่นได้ตามปกติ');
    } catch (err) {
      fail(err, $('maintenanceMessage'));
    } finally {
      state.maintenanceBusy = false;
      button.disabled = false;
    }
  }

  function handleCommandResultClick(event) {
    const open = event.target.closest('button[data-run-open]');
    if (open) {
      openRunDetail(open.dataset.runOpen);
      return;
    }

    const action = event.target.closest('button[data-run-action]');
    if (action) {
      handleRunAction(action.dataset.runAction, action.dataset.runId);
      return;
    }

    const page = event.target.closest('button[data-run-page]');
    if (page && !page.disabled) {
      loadRuns({
        status: state.runListStatus,
        player: state.runListPlayer,
        page: Math.max(0, Number(page.dataset.runPage) || 0),
        title: state.runListTitle
      });
      return;
    }

    const revoke = event.target.closest('button[data-session-revoke]');
    if (revoke) {
      revokeSession(revoke.dataset.sessionRevoke, revoke.dataset.sessionName);
    }
  }

  /* ------------------------------------------------------------------ */
  /* scores                                                              */
  /* ------------------------------------------------------------------ */

  async function loadScores() {
    setMessage($('dashboardMessage'), 'กำลังโหลดข้อมูล…', 'info');
    $('scoresBody').replaceChildren(loadingRow(8));
    try {
      const data = await rpc('admin_dashboard', {
        p_token: state.token,
        p_search: state.search,
        p_limit: state.limit,
        p_offset: state.page * state.limit,
        p_sort: state.sort,
        p_dir: state.dir,
        p_banned: null
      });
      applyAdmin(data && data.admin);
      applyStats(data && data.stats);
      state.rows = Array.isArray(data && data.rows) ? data.rows : [];
      state.total = Number((data && data.total) || 0);
      renderScores();
      setMessage($('dashboardMessage'), '');
    } catch (err) {
      $('scoresBody').replaceChildren(emptyRow(8, 'โหลดข้อมูลไม่สำเร็จ'));
      fail(err, $('dashboardMessage'));
    }
  }

  function renderScores() {
    const body = $('scoresBody');
    body.textContent = '';

    if (!state.rows.length) {
      body.append(emptyRow(8, state.search ? 'ไม่พบชื่อผู้เล่นนี้' : 'ยังไม่มีข้อมูลคะแนน'));
    } else {
      state.rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (row.is_banned) tr.classList.add('row-banned');
        tr.append(cell(String(state.page * state.limit + index + 1), 'rank'));
        tr.append(cell(row.name));
        tr.append(cell(fmtNumber(row.score), 'numeric'));
        tr.append(cell(fmtNumber(row.right_count), 'numeric'));
        tr.append(cell(fmtNumber(row.max_combo), 'numeric'));
        tr.append(cell(fmtDate(row.updated_at)));
        tr.append(cellNode(badge(row.is_banned ? 'ถูกแบน' : 'ปกติ', row.is_banned ? 'banned' : 'active')));
        tr.append(actionsCell(row));
        body.append(tr);
      });
    }

    const pages = Math.max(1, Math.ceil(state.total / state.limit));
    $('resultCount').textContent = `แสดง ${fmtNumber(state.rows.length)} จาก ${fmtNumber(state.total)} รายการ`;
    $('pageInfo').textContent = `หน้า ${state.page + 1} / ${pages}`;
    $('prevPage').disabled = state.page <= 0;
    $('nextPage').disabled = state.page >= pages - 1;
    updateSortHeaders();
  }

  function updateSortHeaders() {
    document.querySelectorAll('th .sort').forEach((btn) => {
      const th = btn.closest('th');
      if (btn.dataset.sort === state.sort) {
        th.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
  }

  function actionsCell(row) {
    const td = document.createElement('td');
    td.className = 'actions';
    if (!state.admin || state.admin.role === 'viewer') {
      td.textContent = '—';
      return td;
    }
    const wrap = document.createElement('div');
    wrap.className = 'row-actions';
    wrap.append(actionButton('rename', 'เปลี่ยนชื่อ', row));
    wrap.append(actionButton('reset', 'รีเซ็ต', row));
    wrap.append(row.is_banned ? actionButton('unban', 'ปลดแบน', row) : actionButton('ban', 'แบน', row));
    wrap.append(actionButton('delete', 'ลบ', row, 'danger'));
    td.append(wrap);
    return td;
  }

  function actionButton(action, label, row, extra = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `button secondary small ${extra}`.trim();
    btn.dataset.action = action;
    btn.dataset.userId = row.user_id;
    btn.dataset.name = row.name || '';
    btn.textContent = label;
    return btn;
  }

  async function handleRowAction(action, userId, name) {
    if (!userId) return;
    if (action === 'rename') return openRenameDialog(userId, name);
    if (action === 'ban') return openBanDialog(userId, name);

    if (action === 'unban') {
      try {
        const done = await requestPassword(
          {
            title: 'ปลดแบนผู้เล่น',
            text: `ปลดแบน ${name || 'ผู้เล่นนี้'}`,
            okLabel: 'ปลดแบน'
          },
          (password) => rpc('admin_unban_player', {
            p_token: state.token,
            p_user_id: userId,
            p_password: password
          })
        );
        if (!done) return;
        toast('ปลดแบนแล้ว');
        await (state.tab === 'banned' ? loadBanned() : loadScores());
      } catch (err) {
        fail(err, $('dashboardMessage'));
      }
      return;
    }

    if (action === 'reset') {
      return resetScore({ user_id: userId, name });
    }

    if (action === 'delete') {
      return deleteScore({ user_id: userId, name });
    }
  }

  async function runAction(action, successText, reload) {
    try {
      await action();
      toast(successText);
      await reload();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  /* ------------------------------------------------------------------ */
  /* banned                                                              */
  /* ------------------------------------------------------------------ */

  async function loadBanned() {
    $('bannedBody').replaceChildren(loadingRow(5));
    try {
      const data = await rpc('admin_dashboard', {
        p_token: state.token,
        p_search: state.bannedSearch,
        p_limit: 200,
        p_offset: 0,
        p_sort: 'updated_at',
        p_dir: 'desc',
        p_banned: true
      });
      applyStats(data && data.stats);
      state.bannedRows = Array.isArray(data && data.rows) ? data.rows : [];
      renderBanned();
    } catch (err) {
      $('bannedBody').replaceChildren(emptyRow(5, 'โหลดข้อมูลไม่สำเร็จ'));
      fail(err, $('dashboardMessage'));
    }
  }

  function renderBanned() {
    const body = $('bannedBody');
    body.textContent = '';
    if (!state.bannedRows.length) {
      body.append(emptyRow(5, state.bannedSearch ? 'ไม่พบผู้เล่นที่ตรงกับคำค้น' : 'ยังไม่มีผู้เล่นที่ถูกแบน'));
      return;
    }
    state.bannedRows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.classList.add('row-banned');
      tr.append(cell(row.name));
      tr.append(cell(fmtNumber(row.score), 'numeric'));
      tr.append(cell(row.ban_reason || '—'));
      tr.append(cell(fmtDate(row.banned_at)));
      const td = document.createElement('td');
      td.className = 'actions';
      if (state.admin && state.admin.role !== 'viewer') {
        td.append(actionButton('unban', 'ปลดแบน', row));
      } else {
        td.textContent = '—';
      }
      tr.append(td);
      body.append(tr);
    });
  }

  /* ------------------------------------------------------------------ */
  /* audit                                                               */
  /* ------------------------------------------------------------------ */

  // เก็บบรรทัดในบันทึกกิจกรรมไว้ไม่เกิน AUDIT_MAX_ROWS
  // ถ้าเกิน ให้ลบแถวล่างสุด (รายการเก่าสุด) ทิ้ง
  function trimAuditRows() {
    const body = $('auditBody');
    while (body.rows.length > AUDIT_MAX_ROWS) body.deleteRow(-1);
  }

  async function loadAudit() {
    $('auditBody').replaceChildren(loadingRow(4));
    try {
      const rows = await rpc('admin_audit_list', { p_token: state.token, p_limit: 100 });
      const body = $('auditBody');
      body.textContent = '';
      if (!Array.isArray(rows) || !rows.length) {
        body.append(emptyRow(4, 'ยังไม่มีกิจกรรม'));
        return;
      }
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.append(cell(fmtDate(row.created_at)));
        tr.append(cell(row.admin_username || 'system'));
        tr.append(cell(ACTION_LABELS[row.action] || row.action));
        const details = row.details || {};
        const summary = details.name || details.username ||
          (row.target_user_id ? String(row.target_user_id).slice(0, 8) : '—');
        tr.append(cell(summary));
        body.append(tr);
      });
      trimAuditRows();
    } catch (err) {
      $('auditBody').replaceChildren(emptyRow(4, 'โหลดข้อมูลไม่สำเร็จ'));
      fail(err, $('dashboardMessage'));
    }
  }

  /* ------------------------------------------------------------------ */
  /* admins                                                              */
  /* ------------------------------------------------------------------ */

  async function loadAdmins() {
    $('adminsBody').replaceChildren(loadingRow(5));
    try {
      const rows = await rpc('admin_list_admins', { p_token: state.token });
      state.adminRows = Array.isArray(rows) ? rows : [];
      renderAdmins();
    } catch (err) {
      $('adminsBody').replaceChildren(emptyRow(5, 'โหลดข้อมูลไม่สำเร็จ'));
      fail(err, $('dashboardMessage'));
    }
  }

  function renderAdmins() {
    const body = $('adminsBody');
    body.textContent = '';
    if (!state.adminRows.length) {
      body.append(emptyRow(5, 'ยังไม่มีผู้ดูแล'));
      return;
    }
    const myId = state.admin && state.admin.user_id;
    state.adminRows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.append(cell(row.username));
      tr.append(cellNode(badge(row.role, row.role)));
      tr.append(cellNode(badge(row.is_active ? 'ใช้งาน' : 'ปิดใช้งาน', row.is_active ? 'active' : 'banned')));
      tr.append(cell(fmtDate(row.last_login_at)));

      const td = document.createElement('td');
      td.className = 'actions';
      const wrap = document.createElement('div');
      wrap.className = 'row-actions';

      const pwd = document.createElement('button');
      pwd.type = 'button';
      pwd.className = 'button secondary small';
      pwd.textContent = 'รีเซ็ตรหัสผ่าน';
      pwd.addEventListener('click', () => openResetAdminDialog(row));

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = `button secondary small ${row.is_active ? 'danger' : ''}`.trim();
      toggle.textContent = row.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
      toggle.disabled = row.user_id === myId;
      toggle.addEventListener('click', () => toggleAdminActive(row));

      wrap.append(pwd, toggle);
      td.append(wrap);
      tr.append(td);
      body.append(tr);
    });
  }

  async function toggleAdminActive(row) {
    const next = !row.is_active;
    const ok = await confirmAction(
      next ? 'เปิดใช้งานผู้ดูแล' : 'ปิดใช้งานผู้ดูแล',
      `${next ? 'เปิด' : 'ปิด'}ใช้งานบัญชี ${row.username} ใช่หรือไม่?`,
      next ? 'เปิดใช้งาน' : 'ปิดใช้งาน'
    );
    if (!ok) return;
    try {
      await rpc('admin_set_admin_active', { p_token: state.token, p_user_id: row.user_id, p_active: next });
      toast(next ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
      await loadAdmins();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    }
  }

  function openResetAdminDialog(row) {
    state.resetAdminTarget = row;
    $('resetAdminTargetText').textContent = `ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${row.username}`;
    setMessage($('resetAdminMessage'), '');
    $('resetAdminPassword').value = '';
    resetPasswordToggles();
    openDialog($('resetAdminDialog'));
    $('resetAdminPassword').focus();
  }

  /* ------------------------------------------------------------------ */
  /* dialogs                                                             */
  /* ------------------------------------------------------------------ */

  function confirmAction(title, text, okLabel) {
    return new Promise((resolve) => {
      state.confirmResolve = resolve;
      $('confirmTitle').textContent = title;
      $('confirmText').textContent = text;
      $('confirmOk').textContent = okLabel || 'ยืนยัน';
      openDialog($('confirmDialog'));
      $('confirmOk').focus();
    });
  }

  function settleConfirm(value) {
    const resolve = state.confirmResolve;
    state.confirmResolve = null;
    closeDialog($('confirmDialog'));
    if (resolve) resolve(value);
  }

  /* ---- password confirmation for destructive actions ---- */

  function isInvalidPassword(err) {
    return String((err && (err.message || err.error_description)) || '').includes('invalid_password');
  }

  function requestPassword({ title, text, okLabel = 'ยืนยัน', danger = true }, action) {
    return new Promise((resolve, reject) => {
      state.passwordRequest = { resolve, reject, action };
      $('actionPasswordTitle').textContent = title;
      $('actionPasswordText').textContent = text;
      $('actionPasswordSubmit').textContent = okLabel;
      $('actionPasswordSubmit').className = `button ${danger ? 'danger' : 'primary'}`;
      $('actionPasswordForm').reset();
      resetPasswordToggles();
      setMessage($('actionPasswordMessage'), '');
      openDialog($('actionPasswordDialog'));
      $('actionPasswordInput').focus();
    });
  }

  function cancelPasswordRequest() {
    const request = state.passwordRequest;
    state.passwordRequest = null;
    closeDialog($('actionPasswordDialog'));
    if (request) request.resolve(null);
  }

  async function onActionPasswordSubmit(event) {
    event.preventDefault();
    const request = state.passwordRequest;
    if (!request) return;
    const input = $('actionPasswordInput');
    const password = input.value;
    if (!password) {
      setMessage($('actionPasswordMessage'), 'กรุณากรอกรหัสผ่าน', 'error');
      input.focus();
      return;
    }
    const button = $('actionPasswordSubmit');
    const cancel = $('actionPasswordCancel');
    button.disabled = true;
    cancel.disabled = true;
    try {
      const result = await request.action(password);
      state.passwordRequest = null;
      closeDialog($('actionPasswordDialog'));
      request.resolve(result);
    } catch (err) {
      if (isInvalidPassword(err)) {
        setMessage($('actionPasswordMessage'), 'รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง', 'error');
        input.value = '';
        input.focus();
        return;
      }
      state.passwordRequest = null;
      closeDialog($('actionPasswordDialog'));
      request.reject(err);
    } finally {
      button.disabled = false;
      cancel.disabled = false;
    }
  }

  function openPasswordDialog() {
    const form = $('passwordForm');
    form.reset();
    resetPasswordToggles();
    setMessage($('passwordMessage'), '');
    setPasswordDialogMode();
    openDialog($('passwordDialog'));
    $('currentPassword').focus();
  }

  function openSpecialPasswordDialog() {
    $('specialPasswordForm').reset();
    resetPasswordToggles();
    setMessage($('specialPasswordMessage'), '');
    openDialog($('specialPasswordDialog'));
    $('specialCurrentPassword').focus();
  }

  function openRenameDialog(userId, name) {
    state.renameTarget = userId;
    setMessage($('renameMessage'), '');
    $('renameInput').value = name || '';
    openDialog($('renameDialog'));
    $('renameInput').focus();
    $('renameInput').select();
  }

  function openBanDialog(userId, name) {
    state.banTarget = userId;
    setMessage($('banMessage'), '');
    $('banReason').value = '';
    $('banTargetText').textContent = `ผู้เล่น: ${name || 'ไม่ระบุชื่อ'}`;
    openDialog($('banDialog'));
    $('banReason').focus();
  }

  /* ------------------------------------------------------------------ */
  /* events                                                              */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    $('loginForm').addEventListener('submit', onLogin);
    $('logoutButton').addEventListener('click', onLogout);
    $('refreshButton').addEventListener('click', () => switchTab(state.tab));
    $('passwordButton').addEventListener('click', openPasswordDialog);
    $('maintenanceButton').addEventListener('click', openMaintenanceDialog);
    $('passwordWarningBtn').addEventListener('click', openPasswordDialog);
    $('maintenanceWarningBtn').addEventListener('click', openMaintenanceDialog);
    $('maintenanceForm').addEventListener('submit', onMaintenanceSubmit);
    $('maintenanceCancel').addEventListener('click', () => closeDialog($('maintenanceDialog')));

    // Settings menu (top-right): close after choosing an item,
    // on outside click, or with Escape.
    const settingsMenu = $('settingsMenu');
    if (settingsMenu) {
      settingsMenu.addEventListener('click', (event) => {
        if (event.target.closest('.settings-item')) settingsMenu.open = false;
      });
      document.addEventListener('click', (event) => {
        if (settingsMenu.open && !settingsMenu.contains(event.target)) settingsMenu.open = false;
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && settingsMenu.open) settingsMenu.open = false;
      });
    }

    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    let searchTimer = null;
    $('searchInput').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = $('searchInput').value.trim();
        state.page = 0;
        if (state.tab === 'scores') loadScores();
      }, 300);
    });

    let bannedTimer = null;
    $('bannedSearch').addEventListener('input', () => {
      clearTimeout(bannedTimer);
      bannedTimer = setTimeout(() => {
        state.bannedSearch = $('bannedSearch').value.trim();
        if (state.tab === 'banned') loadBanned();
      }, 300);
    });

    document.querySelectorAll('th .sort').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sort = btn.dataset.sort;
        if (state.sort === sort) {
          state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = sort;
          state.dir = sort === 'name' ? 'asc' : 'desc';
        }
        state.page = 0;
        loadScores();
      });
    });

    $('pageSize').addEventListener('change', () => {
      state.limit = Number($('pageSize').value) || 50;
      state.page = 0;
      loadScores();
    });
    $('prevPage').addEventListener('click', () => {
      if (state.page > 0) { state.page -= 1; loadScores(); }
    });
    $('nextPage').addEventListener('click', () => {
      const pages = Math.max(1, Math.ceil(state.total / state.limit));
      if (state.page < pages - 1) { state.page += 1; loadScores(); }
    });

    $('exportButton').addEventListener('click', exportCsv);
    $('auditRefresh').addEventListener('click', loadAudit);
    $('addAdminButton').addEventListener('click', () => {
      $('adminForm').reset();
        resetPasswordToggles();
        setMessage($('adminMessage'), '');
      openDialog($('adminDialog'));
      $('adminUsername').focus();
    });

    $('scoresBody').addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action]');
      if (btn) handleRowAction(btn.dataset.action, btn.dataset.userId, btn.dataset.name);
    });
    $('bannedBody').addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action]');
      if (btn) handleRowAction(btn.dataset.action, btn.dataset.userId, btn.dataset.name);
    });

    $('passwordForm').addEventListener('submit', onChangePassword);
    $('renameForm').addEventListener('submit', onRename);
    $('banForm').addEventListener('submit', onBan);
    $('adminForm').addEventListener('submit', onAddAdmin);
    $('resetAdminForm').addEventListener('submit', onResetAdminPassword);
    $('specialPasswordForm').addEventListener('submit', onSetSpecialPassword);
    $('specialPasswordButton').addEventListener('click', openSpecialPasswordDialog);

    $('passwordCancel').addEventListener('click', () => closeDialog($('passwordDialog')));
    $('specialPasswordCancel').addEventListener('click', () => closeDialog($('specialPasswordDialog')));
    $('renameCancel').addEventListener('click', () => closeDialog($('renameDialog')));
    $('banCancel').addEventListener('click', () => closeDialog($('banDialog')));
    $('adminCancel').addEventListener('click', () => closeDialog($('adminDialog')));
    $('resetAdminCancel').addEventListener('click', () => closeDialog($('resetAdminDialog')));

    $('commandGroups').addEventListener('click', (event) => {
      const card = event.target.closest('button[data-command]');
      if (card) runCommand(card.dataset.command);
    });
    $('commandResultClose').addEventListener('click', closeCommandResult);
    $('commandResult').addEventListener('click', handleCommandResultClick);

    $('playerSearchForm').addEventListener('submit', onPlayerSearch);
    $('playerSearchCancel').addEventListener('click', () => closeDialog($('playerSearchDialog')));
    $('playerSearchResults').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-pick-user]');
      if (!button) return;
      const row = state.playerSearchRows.find((item) => String(item.user_id) === button.dataset.pickUser);
      if (row) handlePlayerPicked(row);
    });
    $('playerDetailClose').addEventListener('click', () => closeDialog($('playerDetailDialog')));

    $('scoreSetForm').addEventListener('submit', onScoreSet);
    $('scoreSetCancel').addEventListener('click', () => {
      state.scoreTarget = null;
      closeDialog($('scoreSetDialog'));
    });

    $('reasonForm').addEventListener('submit', onReasonSubmit);
    $('reasonCancel').addEventListener('click', () => settleReason(null));
    $('reasonDialog').addEventListener('cancel', (event) => {
      event.preventDefault();
      settleReason(null);
    });

    $('runDetailClose').addEventListener('click', () => closeDialog($('runDetailDialog')));
    $('runDetailActions').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-run-action]');
      if (button) handleRunAction(button.dataset.runAction, button.dataset.runId);
    });

    $('passwordDialog').addEventListener('cancel', (event) => {
      if (state.admin && state.admin.must_change_password) event.preventDefault();
    });

    $('confirmOk').addEventListener('click', () => settleConfirm(true));
    $('confirmCancel').addEventListener('click', () => settleConfirm(false));
    $('confirmDialog').addEventListener('cancel', (event) => {
      event.preventDefault();
      settleConfirm(false);
    });

    $('actionPasswordForm').addEventListener('submit', onActionPasswordSubmit);
    $('actionPasswordCancel').addEventListener('click', cancelPasswordRequest);
    $('actionPasswordDialog').addEventListener('cancel', (event) => {
      event.preventDefault();
      cancelPasswordRequest();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !state.expiresAt) return;
      if (state.expiresAt <= Date.now()) expireSession();
      else updateSessionTimer();
    });
  }

  /* ------------------------------------------------------------------ */
  /* actions                                                             */
  /* ------------------------------------------------------------------ */

  async function onLogin(event) {
    event.preventDefault();
    const username = $('username').value.trim();
    const password = $('password').value;
    if (!username || !password) {
      setMessage($('loginMessage'), MESSAGES.missing_credentials, 'error');
      return;
    }
    const button = $('loginForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'กำลังตรวจสอบ…';
    setMessage($('loginMessage'), 'กำลังตรวจสอบบัญชี…', 'info');
    try {
      const result = await rpc('admin_login', { p_username: username, p_password: password });
      if (!result || result.ok !== true) {
        const key = result && result.error;
        let text = MESSAGES[key] || 'เข้าสู่ระบบไม่สำเร็จ';
        if (key === 'invalid_credentials' && typeof result.attempts_left === 'number') {
          text += ` (เหลือ ${result.attempts_left} ครั้งก่อนถูกล็อก)`;
        }
        setMessage($('loginMessage'), text, 'error');
        return;
      }
      state.token = result.token;
      state.admin = result;
      persistSession(result.token, result.expires_at);
      scheduleSession(result.expires_at);
      $('loginForm').reset();
      setMessage($('loginMessage'), '');
      applyAdmin(result);
      showDashboard();
      await loadMaintenanceStatus();
      await switchTab('scores');
      if (result.must_change_password) openPasswordDialog();
    } catch (err) {
      fail(err, $('loginMessage'));
    } finally {
      button.disabled = false;
      button.textContent = 'เข้าสู่ระบบ';
    }
  }

  async function onLogout() {
    const token = state.token;
    state.token = null;
    state.admin = null;
    state.expiresAt = null;
    clearSessionTimers();
    persistSession(null, null);
    try {
      if (token) await rpc('admin_logout', { p_token: token });
    } catch (error) { /* session may already be gone */ }
    $('loginForm').reset();
    $('passwordWarning').hidden = true;
    showLogin('ออกจากระบบแล้ว', 'success');
  }

  async function onChangePassword(event) {
    event.preventDefault();
    const current = $('currentPassword').value;
    const next = $('newPassword').value;
    const again = $('confirmPassword').value;
    const special = $('specialPassword').value.trim();
    if (next.length < 8) {
      setMessage($('passwordMessage'), MESSAGES.weak_password, 'error');
      return;
    }
    if (next !== again) {
      setMessage($('passwordMessage'), 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'error');
      return;
    }
    if (!special) {
      setMessage($('passwordMessage'), 'กรุณากรอกรหัสผ่านพิเศษ', 'error');
      $('specialPassword').focus();
      return;
    }
    const button = $('passwordForm').querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage($('passwordMessage'), 'กำลังบันทึก…', 'info');
    try {
      await rpc('admin_change_password', { p_token: state.token, p_current: current, p_new: next, p_special: special });
      $('passwordForm').reset();
      if (state.admin) state.admin.must_change_password = false;
      setPasswordDialogMode();
      closeDialog($('passwordDialog'));
      $('passwordWarning').hidden = true;
      setMessage($('dashboardMessage'), '');
      toast('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      fail(err, $('passwordMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onSetSpecialPassword(event) {
    event.preventDefault();
    const current = $('specialCurrentPassword').value;
    const currentSpecial = $('currentSpecial').value.trim();
    const next = $('newSpecial').value.trim();
    const again = $('confirmSpecial').value.trim();
    if (!current || !currentSpecial) {
      setMessage($('specialPasswordMessage'), 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านพิเศษปัจจุบัน', 'error');
      return;
    }
    if (next.length < 4) {
      setMessage($('specialPasswordMessage'), MESSAGES.weak_special_password, 'error');
      return;
    }
    if (next !== again) {
      setMessage($('specialPasswordMessage'), 'รหัสผ่านพิเศษใหม่ทั้งสองช่องไม่ตรงกัน', 'error');
      return;
    }
    const button = $('specialPasswordForm').querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage($('specialPasswordMessage'), 'กำลังบันทึก…', 'info');
    try {
      await rpc('admin_set_special_password', {
        p_token: state.token,
        p_current: current,
        p_special: currentSpecial,
        p_new_special: next
      });
      $('specialPasswordForm').reset();
      closeDialog($('specialPasswordDialog'));
      toast('ตั้งรหัสผ่านพิเศษแล้ว');
    } catch (err) {
      fail(err, $('specialPasswordMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onRename(event) {
    event.preventDefault();
    const name = $('renameInput').value.trim();
    if (!name) {
      setMessage($('renameMessage'), 'กรุณากรอกชื่อใหม่', 'error');
      return;
    }
    const button = $('renameForm').querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await rpc('admin_rename_player', {
        p_token: state.token,
        p_user_id: state.renameTarget,
        p_name: name
      });
      closeDialog($('renameDialog'));
      toast('เปลี่ยนชื่อผู้เล่นแล้ว');
      state.renameTarget = null;
      if (state.tab === 'banned') await loadBanned();
      else if (state.tab === 'scores') await loadScores();
    } catch (err) {
      fail(err, $('renameMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onBan(event) {
    event.preventDefault();
    const reason = $('banReason').value.trim();
    if (reason.length < 3 || reason.length > 200) {
      setMessage($('banMessage'), MESSAGES.invalid_reason, 'error');
      $('banReason').focus();
      return;
    }
    const button = $('banForm').querySelector('button[type="submit"]');
    button.disabled = true;
    const target = state.banTarget;
    closeDialog($('banDialog'));
    try {
      const done = await requestPassword(
        {
          title: 'แบนผู้เล่น',
          text: 'ผู้เล่นจะถูกบล็อกไม่ให้บันทึกคะแนนจนกว่าจะปลดแบน',
          okLabel: 'แบน'
        },
        (password) => rpc('admin_ban_player', {
          p_token: state.token,
          p_user_id: target,
          p_password: password,
          p_reason: reason
        })
      );
      state.banTarget = null;
      if (!done) return;
      toast('แบนผู้เล่นแล้ว');
      await refreshPlayerTables();
    } catch (err) {
      fail(err, $('dashboardMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onAddAdmin(event) {
    event.preventDefault();
    const username = $('adminUsername').value.trim();
    const password = $('adminPassword').value;
    const role = $('adminRoleSelect').value;
    if (password.length < 8) {
      setMessage($('adminMessage'), MESSAGES.weak_password, 'error');
      return;
    }
    const button = $('adminForm').querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await rpc('admin_add_admin', {
        p_token: state.token,
        p_username: username,
        p_password: password,
        p_role: role
      });
      closeDialog($('adminDialog'));
      toast('เพิ่มผู้ดูแลแล้ว');
      await loadAdmins();
    } catch (err) {
      fail(err, $('adminMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onResetAdminPassword(event) {
    event.preventDefault();
    const password = $('resetAdminPassword').value;
    if (password.length < 8) {
      setMessage($('resetAdminMessage'), MESSAGES.weak_password, 'error');
      return;
    }
    const target = state.resetAdminTarget;
    if (!target) return;
    const button = $('resetAdminForm').querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await rpc('admin_reset_admin_password', {
        p_token: state.token,
        p_user_id: target.user_id,
        p_password: password
      });
      closeDialog($('resetAdminDialog'));
      toast(`รีเซ็ตรหัสผ่านของ ${target.username} แล้ว`);
      state.resetAdminTarget = null;
      await loadAdmins();
    } catch (err) {
      fail(err, $('resetAdminMessage'));
    } finally {
      button.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* CSV export                                                          */
  /* ------------------------------------------------------------------ */

  function csvCell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    // กัน CSV formula injection — ชื่อผู้เล่นอาจขึ้นต้นด้วย = + - @
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async function exportCsv() {
    const button = $('exportButton');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'กำลังส่งออก…';
    try {
      const rows = [];
      let offset = 0;
      const pageSize = 200;
      while (true) {
        const data = await rpc('admin_dashboard', {
          p_token: state.token,
          p_search: state.search,
          p_limit: pageSize,
          p_offset: offset,
          p_sort: state.sort,
          p_dir: state.dir,
          p_banned: null
        });
        const chunk = Array.isArray(data && data.rows) ? data.rows : [];
        rows.push(...chunk);
        offset += pageSize;
        if (!chunk.length || offset >= Number((data && data.total) || 0) || rows.length >= 5000) break;
      }
      const header = ['อันดับ', 'ชื่อผู้เล่น', 'คะแนน', 'ตอบถูก', 'คอมโบสูงสุด', 'อัปเดตล่าสุด', 'สถานะ'];
      const lines = [header.join(',')];
      rows.forEach((row, index) => {
        lines.push([
          index + 1,
          row.name,
          row.score,
          row.right_count,
          row.max_combo,
          row.updated_at ? toIso(row.updated_at) : '',
          row.is_banned ? 'ถูกแบน' : 'ปกติ'
        ].map(csvCell).join(','));
      });
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scores-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`ส่งออก ${fmtNumber(rows.length)} รายการแล้ว`);
    } catch (err) {
      fail(err, $('dashboardMessage'));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  /* ------------------------------------------------------------------ */
  /* bootstrap                                                           */
  /* ------------------------------------------------------------------ */

  async function openSession() {
    const data = await rpc('admin_dashboard', {
      p_token: state.token,
      p_search: '',
      p_limit: 1,
      p_offset: 0,
      p_sort: 'score',
      p_dir: 'desc',
      p_banned: null
    });
    applyAdmin(data && data.admin);
    applyStats(data && data.stats);
    await loadMaintenanceStatus();
    if (data && data.expires_at) {
      scheduleSession(data.expires_at);
      persistSession(state.token, data.expires_at);
    }
    showDashboard();
    await switchTab('scores');
    if (state.admin && state.admin.must_change_password) openPasswordDialog();
  }

  function init() {
    bindTheme();
    bindEvents();
    bindPasswordToggles();

    if (!CONFIG.url || !CONFIG.publishableKey ||
        CONFIG.url.includes('YOUR_PROJECT_REF') || CONFIG.publishableKey.includes('YOUR_SUPABASE')) {
      setMessage($('loginMessage'), 'ยังไม่ได้ตั้งค่า Supabase ใน database-config.js', 'error');
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      setMessage($('loginMessage'), 'โหลด Supabase client ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต', 'error');
      return;
    }

    state.db = window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    let saved = null;
    let savedExpiry = null;
    try {
      saved = sessionStorage.getItem(TOKEN_KEY);
      savedExpiry = sessionStorage.getItem(EXPIRES_KEY);
    } catch (error) { /* ignore */ }
    if (!saved) return;

    if (savedExpiry) {
      const expiry = new Date(savedExpiry).getTime();
      if (Number.isFinite(expiry)) {
        if (expiry <= Date.now()) {
          persistSession(null, null);
          showLogin(MESSAGES.invalid_session, 'error');
          return;
        }
        scheduleSession(savedExpiry);
      }
    }

    state.token = saved;
    setMessage($('loginMessage'), 'กำลังตรวจสอบเซสชัน…', 'info');
    openSession().catch((err) => {
      handleLoginFailure(err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
