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
  const $ = (id) => document.getElementById(id);
  const TABS = ['scores', 'banned', 'audit', 'admins'];

  const ROLE_LABELS = { owner: 'owner', editor: 'editor', viewer: 'viewer' };

  const MESSAGES = {
    missing_credentials: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
    invalid_credentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    too_many_attempts: 'พยายามเข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่',
    invalid_session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    forbidden: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
    weak_password: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
    same_password: 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม',
    invalid_password: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
    invalid_special_password: 'รหัสผ่านพิเศษไม่ถูกต้อง',
    weak_special_password: 'รหัสผ่านพิเศษต้องยาว 4–64 ตัวอักษร',
    same_special_password: 'รหัสผ่านพิเศษใหม่ต้องต่างจากเดิม',
    special_password_not_configured: 'ยังไม่ได้ตั้งรหัสผ่านพิเศษ — กรุณารัน Database/admin_system.sql ใหม่',
    duplicate_player_name: 'ชื่อผู้เล่นนี้ถูกใช้แล้ว',
    duplicate_admin: 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
    invalid_name: 'ชื่อต้องยาว 1–16 ตัวอักษร',
    invalid_role: 'บทบาทไม่ถูกต้อง',
    player_not_found: 'ไม่พบผู้เล่นนี้ (อาจถูกลบไปแล้ว)',
    admin_not_found: 'ไม่พบผู้ใช้แอดมินนี้',
    ban_not_found: 'ผู้เล่นนี้ไม่ได้ถูกแบน',
    cannot_disable_self: 'ปิดใช้งานบัญชีของตัวเองไม่ได้',
    last_owner: 'ต้องมี owner ที่ใช้งานอยู่อย่างน้อย 1 คน',
    not_connected: 'ยังเชื่อมต่อฐานข้อมูลไม่สำเร็จ'
  };

  const ACTION_LABELS = {
    login: 'เข้าสู่ระบบ',
    delete_score: 'ลบคะแนน',
    reset_score: 'รีเซ็ตคะแนน',
    rename_player: 'เปลี่ยนชื่อผู้เล่น',
    ban_player: 'แบนผู้เล่น',
    unban_player: 'ปลดแบนผู้เล่น',
    change_password: 'เปลี่ยนรหัสผ่าน',
    set_special_password: 'ตั้งรหัสผ่านพิเศษ',
    add_admin: 'เพิ่มผู้ดูแล',
    enable_admin: 'เปิดใช้งานผู้ดูแล',
    disable_admin: 'ปิดใช้งานผู้ดูแล',
    reset_admin_password: 'รีเซ็ตรหัสผ่านผู้ดูแล'
  };

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
    if (remaining === null || remaining <= 0) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = `เซสชันเหลือ ${fmtRemaining(remaining)}`;
    el.classList.toggle('warning', remaining <= SESSION_WARN_MS);
    el.title = `หมดอายุเวลา ${new Date(state.expiresAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}`;
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

  /* ------------------------------------------------------------------ */
  /* screens                                                             */
  /* ------------------------------------------------------------------ */

  function showLogin(message = '', type = '') {
    $('loginPanel').hidden = false;
    $('dashboard').hidden = true;
    $('sessionTimer').hidden = true;
    resetPasswordToggles();
    setPasswordDialogMode();
    setMessage($('loginMessage'), message, type);
    const user = $('username');
    if (user) user.focus();
  }

  function showDashboard() {
    $('loginPanel').hidden = true;
    $('dashboard').hidden = false;
  }

  function applyAdmin(admin) {
    if (admin) state.admin = { ...(state.admin || {}), ...admin };
    const current = state.admin || {};
    $('adminName').textContent = current.username || '—';
    const roleEl = $('adminRole');
    roleEl.textContent = ROLE_LABELS[current.role] || current.role || '—';
    roleEl.className = `badge ${current.role || ''}`.trim();
    $('adminsTab').hidden = current.role !== 'owner';
    $('specialPasswordButton').hidden = current.role !== 'owner';
    $('passwordWarning').hidden = !current.must_change_password;
  }

  function applyStats(stats) {
    if (!stats) return;
    $('playerCount').textContent = fmtNumber(stats.player_count);
    $('averageScore').textContent = fmtNumber(Math.round(Number(stats.average_score || 0)));
    $('highestScore').textContent = fmtNumber(stats.highest_score);
    $('bannedCount').textContent = fmtNumber(stats.banned_count);
  }

  /* ------------------------------------------------------------------ */
  /* tabs                                                                */
  /* ------------------------------------------------------------------ */

  function switchTab(tab) {
    if (!TABS.includes(tab)) return;
    state.tab = tab;
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
    });
    TABS.forEach((name) => { $('tab-' + name).hidden = name !== tab; });
    if (tab === 'scores') return loadScores();
    if (tab === 'banned') return loadBanned();
    if (tab === 'audit') return loadAudit();
    if (tab === 'admins') return loadAdmins();
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
      const ok = await confirmAction('ปลดแบนผู้เล่น', `ปลดแบน ${name || 'ผู้เล่นนี้'} ใช่หรือไม่?`, 'ปลดแบน');
      if (!ok) return;
      return runAction(
        () => rpc('admin_unban_player', { p_token: state.token, p_user_id: userId }),
        'ปลดแบนแล้ว',
        state.tab === 'banned' ? loadBanned : loadScores
      );
    }

    if (action === 'reset') {
      const ok = await confirmAction('รีเซ็ตคะแนน', `ตั้งคะแนนของ ${name || 'ผู้เล่นนี้'} เป็น 0 และล้างสถิติ ใช่หรือไม่?`, 'รีเซ็ต');
      if (!ok) return;
      return runAction(
        () => rpc('admin_reset_score', { p_token: state.token, p_user_id: userId }),
        'รีเซ็ตคะแนนแล้ว',
        state.tab === 'banned' ? loadBanned : loadScores
      );
    }

    if (action === 'delete') {
      const ok = await confirmAction('ลบคะแนน', `ลบคะแนนของ ${name || 'ผู้เล่นนี้'} ออกจากอันดับถาวร ใช่หรือไม่?`, 'ลบ');
      if (!ok) return;
      return runAction(
        () => rpc('admin_delete_score', { p_token: state.token, p_user_id: userId }),
        'ลบคะแนนแล้ว',
        state.tab === 'banned' ? loadBanned : loadScores
      );
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
    resetPasswordToggles();
    setMessage($('resetAdminMessage'), '');
    $('resetAdminPassword').value = '';
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
    $('passwordWarningBtn').addEventListener('click', openPasswordDialog);

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

    $('passwordDialog').addEventListener('cancel', (event) => {
      if (state.admin && state.admin.must_change_password) event.preventDefault();
    });

    $('confirmOk').addEventListener('click', () => settleConfirm(true));
    $('confirmCancel').addEventListener('click', () => settleConfirm(false));
    $('confirmDialog').addEventListener('cancel', (event) => {
      event.preventDefault();
      settleConfirm(false);
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
      await (state.tab === 'banned' ? loadBanned() : loadScores());
    } catch (err) {
      fail(err, $('renameMessage'));
    } finally {
      button.disabled = false;
    }
  }

  async function onBan(event) {
    event.preventDefault();
    const button = $('banForm').querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await rpc('admin_ban_player', {
        p_token: state.token,
        p_user_id: state.banTarget,
        p_reason: $('banReason').value.trim() || null
      });
      closeDialog($('banDialog'));
      toast('แบนผู้เล่นแล้ว');
      state.banTarget = null;
      await (state.tab === 'banned' ? loadBanned() : loadScores());
    } catch (err) {
      fail(err, $('banMessage'));
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
    if (data && data.expires_at) {
      scheduleSession(data.expires_at);
      persistSession(state.token, data.expires_at);
    }
    showDashboard();
    await switchTab('scores');
    if (state.admin && state.admin.must_change_password) openPasswordDialog();
  }

  function init() {
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
