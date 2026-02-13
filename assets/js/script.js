/* script.js */
const STORAGE_KEY = 'evadionrv_tabs_v1';
const BOOKMARKS_KEY = 'evadionrv_bookmarks_v1';
const HISTORY_KEY = 'evadionrv_history_v1';
const UV_READY_KEY = 'evadionrv_uv_ready_v1';

let uvReady = false;

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('clock');
  if (el) el.textContent = time;
}
setInterval(updateClock, 1000);
updateClock();

function isLocalPath(input) {
  const v = (input || '').trim();
  if (!v) return false;
  if (v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) return true;
  if (/^[^\s]+\.(html?|php)$/i.test(v)) return true;
  return false;
}

function looksLikeUrl(input) {
  const v = (input || '').trim();
  if (!v) return false;
  if (v.includes(' ')) return false;
  if (isLocalPath(v)) return false;
  if (v.startsWith('http://') || v.startsWith('https://')) return true;
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
}

function normalize(input) {
  const v = (input || '').trim();
  if (!v) return 'https://www.google.com';
  if (isLocalPath(v)) return v;
  if (looksLikeUrl(v)) {
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return 'https://' + v;
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(v);
}

function getUvConfig() {
  return (typeof self !== 'undefined' && self.__uv$config) || (typeof window !== 'undefined' && window.__uv$config) || null;
}

function uvEncodeUrl(url) {
  const cfg = getUvConfig();
  if (!cfg || !cfg.prefix || typeof cfg.encodeUrl !== 'function') return null;
  try {
    return cfg.prefix + cfg.encodeUrl(url);
  } catch {
    return null;
  }
}

function uvDecodeUrl(url) {
  const cfg = getUvConfig();
  if (!cfg || !cfg.prefix || typeof cfg.decodeUrl !== 'function') return null;

  try {
    const parsed = new URL(url, window.location.origin);
    const prefixPath = new URL(cfg.prefix, window.location.origin).pathname;
    if (!parsed.pathname.startsWith(prefixPath)) return null;
    const encoded = parsed.pathname.slice(prefixPath.length) + parsed.search;
    return cfg.decodeUrl(encoded);
  } catch {
    return null;
  }
}

function toFrameUrl(url) {
  if (!url || isLocalPath(url) || !uvReady) return url;
  return uvEncodeUrl(url) || url;
}

async function ensureUvServiceWorker() {
  if (uvReady) return true;
  if (!('serviceWorker' in navigator)) return false;

  const cfg = getUvConfig();
  if (!cfg?.prefix) return false;

  try {
    const scope = new URL(cfg.prefix, window.location.origin).pathname;
    const reg = await navigator.serviceWorker.register('/sw.js', { scope });
    await navigator.serviceWorker.ready;
    uvReady = !!reg;
    try { localStorage.setItem(UV_READY_KEY, uvReady ? '1' : '0'); } catch {}
    return uvReady;
  } catch {
    uvReady = false;
    try { localStorage.setItem(UV_READY_KEY, '0'); } catch {}
    return false;
  }
}

function safeHost(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return 'New Tab'; }
}

function getHostname(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
}

function baseDomain(host) {
  const h = (host || '').toLowerCase().replace(/^www\./, '');
  const parts = h.split('.').filter(Boolean);
  if (parts.length < 2) return h;
  return parts.slice(-2).join('.');
}

function faClassExists(className) {
  try {
    const probe = document.createElement('i');
    probe.className = className;
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    probe.style.opacity = '0';
    document.body.appendChild(probe);
    const content = getComputedStyle(probe, '::before').getPropertyValue('content');
    probe.remove();
    return !!content && content !== 'none' && content !== 'normal' && content !== '""' && content !== "''";
  } catch {
    return false;
  }
}

const FA_DOMAIN_ALIASES = {
  'youtu.be': 'youtube',
  'x.com': 'x-twitter',
  'twitter.com': 'x-twitter',
};

function resolveFaIconForUrl(url) {
  const host = getHostname(url);
  if (!host) return '';

  const base = baseDomain(host);
  const label = (FA_DOMAIN_ALIASES[host] || FA_DOMAIN_ALIASES[base] || base.split('.')[0] || '').toLowerCase();
  if (!label) return '';

  const candidates = [
    `fa-brands fa-${label}`,
    `fa-brands fa-${label.replace(/[^a-z0-9-]/g, '')}`,
    `fa-brands fa-${label.replace(/-/g, '')}`,
  ];

  for (const c of candidates) {
    if (faClassExists(c)) return c;
  }
  return '';
}

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const state = { tabs: [], activeId: null, draggingId: null };

const el = {
  homeView: document.getElementById('homeView'),
  browserView: document.getElementById('browserView'),
  tabBar: document.getElementById('tabBar'),
  frame: document.getElementById('browserFrame'),
  frameHint: document.getElementById('frameHint'),
  urlInput: document.getElementById('urlInput'),
  omni: document.getElementById('omniInput'),
  newTabBtn: document.getElementById('newTabBtn'),
  backBtn: document.getElementById('backBtn'),
  forwardBtn: document.getElementById('forwardBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  historyBtn: document.getElementById('historyBtn'),
  goBtn: document.getElementById('goBtn'),
  homeBtn: document.getElementById('homeBtn'),
  quickLinks: document.getElementById('quickLinks'),

  bmManageBtn: document.getElementById('bmManageBtn'),
  bmExportBtn: document.getElementById('bmExportBtn'),
  bmImportInput: document.getElementById('bmImportInput'),
  bookmarkGrid: document.getElementById('bookmarkGrid'),
  bmModal: document.getElementById('bmModal'),
  bmCloseBtn: document.getElementById('bmCloseBtn'),
  bmName: document.getElementById('bmName'),
  bmUrl: document.getElementById('bmUrl'),
  bmIcon: document.getElementById('bmIcon'),
  bmSaveBtn: document.getElementById('bmSaveBtn'),
  bmClearBtn: document.getElementById('bmClearBtn'),
  bmList: document.getElementById('bmList'),

  historyModal: document.getElementById('historyModal'),
  historyCloseBtn: document.getElementById('historyCloseBtn'),
  historySearch: document.getElementById('historySearch'),
  historyClearSearch: document.getElementById('historyClearSearch'),
  historyList: document.getElementById('historyList'),
  historyMsg: document.getElementById('historyMsg'),
  historyExportBtn: document.getElementById('historyExportBtn'),
  historyImportInput: document.getElementById('historyImportInput'),
  historyClearBtn: document.getElementById('historyClearBtn'),

  adminBtn: document.getElementById('adminBtn'),
  adminModal: document.getElementById('adminModal'),
  adminCloseBtn: document.getElementById('adminCloseBtn'),
  adminLoginView: document.getElementById('adminLoginView'),
  adminPanelView: document.getElementById('adminPanelView'),
  adminPassword: document.getElementById('adminPassword'),
  adminLoginBtn: document.getElementById('adminLoginBtn'),
  adminMsg: document.getElementById('adminMsg'),
  adminTabLogs: document.getElementById('adminTabLogs'),
  adminTabConsole: document.getElementById('adminTabConsole'),
  adminExportBtn: document.getElementById('adminExportBtn'),
  adminClearBtn: document.getElementById('adminClearBtn'),
  adminLogoutBtn: document.getElementById('adminLogoutBtn'),
  adminLogsPane: document.getElementById('adminLogsPane'),
  adminConsolePane: document.getElementById('adminConsolePane'),
  adminLogList: document.getElementById('adminLogList'),
  adminConsoleInput: document.getElementById('adminConsoleInput'),
  adminRunBtn: document.getElementById('adminRunBtn'),
  adminConsoleOut: document.getElementById('adminConsoleOut'),
};

function saveTabs() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: state.tabs, activeId: state.activeId })); } catch {}
}

function loadTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tabs)) state.tabs = parsed.tabs;
    if (parsed.activeId) state.activeId = parsed.activeId;
  } catch {}
}

/* History (global) */
let historyItems = [];
const HISTORY_MAX = 400;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) { historyItems = []; return; }
    const parsed = JSON.parse(raw);
    historyItems = Array.isArray(parsed) ? parsed : (parsed?.history || []);
    if (!Array.isArray(historyItems)) historyItems = [];
  } catch {
    historyItems = [];
  }
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyItems, null, 2)); } catch {}
}

function addHistory(url, title) {
  const u = (url || '').trim();
  if (!u || u === 'about:blank') return;

  const t = (title || '').trim();
  const now = Date.now();
  const last = historyItems[historyItems.length - 1];

  if (last && last.url === u && (now - (last.t || 0)) < 2500) {
    if (t && !last.title) last.title = t;
    last.t = now;
    saveHistory();
    return;
  }

  historyItems.push({ t: now, url: u, title: t || safeHost(u) });
  if (historyItems.length > HISTORY_MAX) historyItems.splice(0, historyItems.length - HISTORY_MAX);
  saveHistory();

  if (el.historyModal?.classList.contains('show')) renderHistoryList();
}

function openHistoryModal() {
  if (!el.historyModal) return;
  el.historyModal.classList.add('show');
  el.historyModal.setAttribute('aria-hidden', 'false');
  if (el.historyMsg) el.historyMsg.textContent = '';
  renderHistoryList();
  setTimeout(() => el.historySearch && el.historySearch.focus(), 60);
}

function closeHistoryModal() {
  if (!el.historyModal) return;
  el.historyModal.classList.remove('show');
  el.historyModal.setAttribute('aria-hidden', 'true');
  if (el.historyMsg) el.historyMsg.textContent = '';
}

function renderHistoryList() {
  if (!el.historyList) return;
  el.historyList.innerHTML = '';

  const q = (el.historySearch?.value || '').trim().toLowerCase();
  const items = historyItems.slice().reverse().filter(it => {
    if (!q) return true;
    return String(it.title || '').toLowerCase().includes(q) || String(it.url || '').toLowerCase().includes(q);
  });

  if (!items.length) {
    const d = document.createElement('div');
    d.style.opacity = '0.7';
    d.style.padding = '10px 2px';
    d.textContent = q ? 'No matches.' : 'No history yet.';
    el.historyList.appendChild(d);
    return;
  }

  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'bmItem';
    row.style.cursor = 'pointer';

    const left = document.createElement('div');
    left.className = 'bmLeft';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'tabIcon';
    iconWrap.style.width = '22px';
    iconWrap.style.height = '22px';
    iconWrap.style.borderRadius = '8px';

    const fa = (!isLocalPath(it.url)) ? resolveFaIconForUrl(it.url) : '';
    if (it.url.includes('games.html')) iconWrap.innerHTML = '<i class="fa-solid fa-gamepad" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>';
    else if (it.url.includes('movies.html')) iconWrap.innerHTML = '<i class="fa-solid fa-film" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>';
    else if (fa) iconWrap.innerHTML = `<i class="${fa}" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>`;
    else iconWrap.innerHTML = '<i class="fa-solid fa-globe" style="font-size:12px; color: rgba(180,190,255,0.9);"></i>';

    const text = document.createElement('div');
    text.className = 'bmText';

    const name = document.createElement('div');
    name.className = 'bmName';
    name.textContent = it.title || safeHost(it.url);

    const url = document.createElement('div');
    url.className = 'bmUrl';
    url.textContent = it.url;

    text.appendChild(name);
    text.appendChild(url);

    left.appendChild(iconWrap);
    left.appendChild(text);

    const right = document.createElement('div');
    right.className = 'bmBtns';

    const openBtn = document.createElement('button');
    openBtn.className = 'bmTiny';
    openBtn.title = 'Open in new tab';
    openBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';

    const delBtn = document.createElement('button');
    delBtn.className = 'bmTiny';
    delBtn.title = 'Remove from history';
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

    right.appendChild(openBtn);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);

    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      createTab(normalize(it.url));
      closeHistoryModal();
    });

    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      createTab(normalize(it.url));
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      historyItems = historyItems.filter(x => x !== it);
      saveHistory();
      renderHistoryList();
    });

    el.historyList.appendChild(row);
  }
}

function exportHistoryJson() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), history: historyItems };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evadionrv-history.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importHistoryJson(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : (parsed?.history || []);
    if (!Array.isArray(list)) return;

    const cleaned = list
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        t: Number(x.t || Date.now()),
        url: String(x.url || '').trim(),
        title: String(x.title || '').trim(),
      }))
      .filter(x => x.url);

    historyItems = cleaned.slice(-HISTORY_MAX);
    saveHistory();
    renderHistoryList();
    if (el.historyMsg) el.historyMsg.textContent = 'Imported history.';
  } catch {
    if (el.historyMsg) el.historyMsg.textContent = 'Import failed.';
  }
}

/* Bookmarks */
let bookmarks = [];
let editingBookmarkId = null;

function defaultBookmarks() { return []; }

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) { bookmarks = defaultBookmarks(); return; }
    const parsed = JSON.parse(raw);
    bookmarks = Array.isArray(parsed) ? parsed : defaultBookmarks();
  } catch {
    bookmarks = defaultBookmarks();
  }
}

function saveBookmarks() {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks, null, 2)); } catch {}
}

function normalizeIconClass(icon) {
  const v = (icon || '').trim();
  if (!v) return 'fa-solid fa-star';
  return v.includes('fa-') ? v : ('fa-solid ' + v);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function displayShortUrl(u) {
  const v = (u || '').trim();
  if (isLocalPath(v)) return v;
  try {
    const url = new URL(v.startsWith('http') ? v : ('https://' + v));
    return url.hostname.replace(/^www\./, '');
  } catch {
    return v.length > 28 ? v.slice(0, 28) + '…' : v;
  }
}

function renderBookmarks() {
  if (!el.bookmarkGrid) return;
  el.bookmarkGrid.innerHTML = '';

  if (!bookmarks.length) {
    const empty = document.createElement('div');
    empty.className = 'bookmark-btn';
    empty.style.opacity = '0.7';
    empty.style.cursor = 'default';
    empty.innerHTML = '<i class="fa-solid fa-plus"></i><div>Add a bookmark</div><div class="bookmark-sub">Manage → Save</div>';
    empty.addEventListener('click', () => openBookmarkModal());
    el.bookmarkGrid.appendChild(empty);
    return;
  }

  bookmarks.forEach(bm => {
    const btn = document.createElement('div');
    btn.className = 'bookmark-btn';
    const safeName = (bm.name || 'Bookmark');
    const safeUrl = (bm.url || 'https://www.google.com');
    const icon = normalizeIconClass(bm.icon);

    btn.innerHTML = `
      <i class="${icon}"></i>
      <div>${escapeHtml(safeName)}</div>
      <div class="bookmark-sub">${escapeHtml(displayShortUrl(safeUrl))}</div>
    `;

    btn.addEventListener('click', () => openTab(safeUrl));
    el.bookmarkGrid.appendChild(btn);
  });
}

function openBookmarkModal() {
  if (!el.bmModal) return;
  el.bmModal.classList.add('show');
  el.bmModal.setAttribute('aria-hidden', 'false');
  renderBookmarkList();
  setTimeout(() => el.bmName && el.bmName.focus(), 80);
}

function closeBookmarkModal() {
  if (!el.bmModal) return;
  el.bmModal.classList.remove('show');
  el.bmModal.setAttribute('aria-hidden', 'true');
  clearBookmarkForm();
}

function clearBookmarkForm() {
  editingBookmarkId = null;
  if (el.bmName) el.bmName.value = '';
  if (el.bmUrl) el.bmUrl.value = '';
  if (el.bmIcon) el.bmIcon.value = '';
  if (el.bmSaveBtn) el.bmSaveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>Save';
}

function renderBookmarkList() {
  if (!el.bmList) return;
  el.bmList.innerHTML = '';

  if (!bookmarks.length) {
    const p = document.createElement('div');
    p.style.opacity = '0.7';
    p.style.padding = '10px 2px';
    p.textContent = 'No bookmarks yet — add one above.';
    el.bmList.appendChild(p);
    return;
  }

  bookmarks.forEach(bm => {
    const row = document.createElement('div');
    row.className = 'bmItem';
    const icon = normalizeIconClass(bm.icon);
    const name = bm.name || 'Bookmark';
    const url = bm.url || '';

    row.innerHTML = `
      <div class="bmLeft">
        <i class="${icon}"></i>
        <div class="bmText">
          <div class="bmName">${escapeHtml(name)}</div>
          <div class="bmUrl">${escapeHtml(url)}</div>
        </div>
      </div>
      <div class="bmBtns">
        <button class="bmTiny" title="Edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="bmTiny" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    const [editBtn, delBtn] = row.querySelectorAll('button');

    editBtn.addEventListener('click', () => {
      editingBookmarkId = bm.id;
      el.bmName.value = bm.name || '';
      el.bmUrl.value = bm.url || '';
      el.bmIcon.value = bm.icon || '';
      el.bmSaveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>Update';
      el.bmName.focus();
    });

    delBtn.addEventListener('click', () => {
      bookmarks = bookmarks.filter(x => x.id !== bm.id);
      saveBookmarks();
      renderBookmarkList();
      renderBookmarks();
      if (editingBookmarkId === bm.id) clearBookmarkForm();
    });

    el.bmList.appendChild(row);
  });
}

function addOrUpdateBookmark() {
  const name = (el.bmName?.value || '').trim();
  const url = (el.bmUrl?.value || '').trim();
  const icon = (el.bmIcon?.value || '').trim();
  if (!name || !url) return;

  if (editingBookmarkId) {
    const idx = bookmarks.findIndex(x => x.id === editingBookmarkId);
    if (idx !== -1) bookmarks[idx] = { ...bookmarks[idx], name, url, icon };
  } else {
    bookmarks.push({ id: makeId(), name, url, icon });
  }

  saveBookmarks();
  renderBookmarkList();
  renderBookmarks();
  clearBookmarkForm();
}

function exportBookmarksJson() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), bookmarks };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evadionrv-bookmarks.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importBookmarksJson(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : (parsed?.bookmarks || []);
    if (!Array.isArray(list)) return;

    const cleaned = list
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: x.id || makeId(),
        name: String(x.name || '').trim(),
        url: String(x.url || '').trim(),
        icon: String(x.icon || '').trim(),
      }))
      .filter(x => x.name && x.url);

    bookmarks = cleaned;
    saveBookmarks();
    renderBookmarks();
    renderBookmarkList();
  } catch {}
}

/* Browser core */
function enterBrowser() {
  el.homeView.style.display = 'none';
  el.browserView.style.display = 'block';
  el.browserView.setAttribute('aria-hidden', 'false');
}

function enterHome() {
  el.browserView.style.display = 'none';
  el.browserView.setAttribute('aria-hidden', 'true');
  el.homeView.style.display = 'block';
}

function showHint() {
  el.frameHint.classList.add('show');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => el.frameHint.classList.remove('show'), 5200);
}

function renderTabs() {
  el.tabBar.innerHTML = '';

  state.tabs.forEach((t) => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab' + (t.id === state.activeId ? ' active' : '');
    tabEl.setAttribute('role', 'tab');
    tabEl.setAttribute('aria-selected', t.id === state.activeId ? 'true' : 'false');
    tabEl.setAttribute('draggable', 'true');
    tabEl.dataset.id = t.id;

    const icon = document.createElement('div');
    icon.className = 'tabIcon';

    if (t.url && t.url.includes('games.html')) {
      icon.innerHTML = '<i class="fa-solid fa-gamepad" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>';
    } else if (t.url && t.url.includes('movies.html')) {
      icon.innerHTML = '<i class="fa-solid fa-film" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>';
    } else if (t.favicon) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = t.favicon;
      icon.appendChild(img);
    } else {
      const fa = t.faIcon || resolveFaIconForUrl(t.url);
      if (fa) icon.innerHTML = `<i class="${fa}" style="font-size:12px; color: rgba(180,190,255,0.95);"></i>`;
      else icon.innerHTML = '<i class="fa-solid fa-globe" style="font-size:12px; color: rgba(180,190,255,0.9);"></i>';
    }

    const title = document.createElement('div');
    title.className = 'tabTitle';
    title.textContent = t.title || safeHost(t.url);

    const close = document.createElement('button');
    close.className = 'tabClose';
    close.setAttribute('aria-label', 'Close tab');
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    close.addEventListener('click', (e) => {
      e.stopPropagation();
      tabEl.classList.add('closing');
      setTimeout(() => closeTab(t.id), 200);
    });

    tabEl.addEventListener('click', () => setActive(t.id));

    tabEl.addEventListener('dragstart', (e) => {
      state.draggingId = t.id;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', t.id); } catch {}
    });

    tabEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });

    tabEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const dragId = state.draggingId;
      if (dragId) moveTab(dragId, t.id);
      state.draggingId = null;
    });

    tabEl.addEventListener('dragend', () => { state.draggingId = null; });

    tabEl.appendChild(icon);
    tabEl.appendChild(title);
    tabEl.appendChild(close);
    el.tabBar.appendChild(tabEl);
  });

  const active = state.tabs.find(x => x.id === state.activeId);
  if (active) el.omni.value = active.url;
}

function navigateActive(url, silentOmni) {
  const active = state.tabs.find(x => x.id === state.activeId);
  if (!active) return;

  active.url = url;
  if (!silentOmni) el.omni.value = url;

  if (url && url.includes('games.html')) {
    active.title = 'Games';
    active.faIcon = '';
  } else if (url && url.includes('movies.html')) {
    active.title = 'Movies';
    active.faIcon = '';
  } else {
    active.title = safeHost(url);
    active.faIcon = (!isLocalPath(url)) ? (resolveFaIconForUrl(url) || '') : '';
  }

  active.favicon = null;

  saveTabs();
  renderTabs();
  el.frame.src = toFrameUrl(url);

  addHistory(active.url, active.title);
}

function createTab(url) {
  let title = safeHost(url);
  if (url && url.includes('games.html')) title = 'Games';
  if (url && url.includes('movies.html')) title = 'Movies';

  const tab = {
    id: makeId(),
    url,
    title,
    favicon: null,
    faIcon: (url && !isLocalPath(url)) ? (resolveFaIconForUrl(url) || '') : '',
  };

  state.tabs.push(tab);
  state.activeId = tab.id;
  saveTabs();
  renderTabs();
  navigateActive(url);
  enterBrowser();
}

function closeTab(tabId) {
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  const wasActive = state.activeId === tabId;
  state.tabs.splice(idx, 1);

  if (!state.tabs.length) {
    state.activeId = null;
    saveTabs();
    renderTabs();
    el.frame.src = 'about:blank';
    enterHome();
    return;
  }

  if (wasActive) {
    const next = state.tabs[Math.min(idx, state.tabs.length - 1)];
    state.activeId = next.id;
    saveTabs();
    renderTabs();
    navigateActive(next.url, true);
  } else {
    saveTabs();
    renderTabs();
  }
}

function setActive(tabId) {
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return;
  state.activeId = tabId;
  saveTabs();
  renderTabs();
  navigateActive(tab.url, true);
}

function moveTab(fromId, toId) {
  const from = state.tabs.findIndex(t => t.id === fromId);
  const to = state.tabs.findIndex(t => t.id === toId);
  if (from === -1 || to === -1 || from === to) return;
  const item = state.tabs.splice(from, 1)[0];
  state.tabs.splice(to, 0, item);
  saveTabs();
  renderTabs();
}

async function goFromOmni() {
  const active = state.tabs.find(x => x.id === state.activeId);
  if (!active) return;
  await ensureUvServiceWorker();
  navigateActive(normalize(el.omni.value));
}

/* Admin */
const ADMIN_PASS = 'EclipseAdministrator';
const ADMIN_KEY = 'evadionrv_admin_ok';
const LOG_MAX = 250;

const logs = [];
const consoleOut = [];

function stringifyAny(v) {
  try {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || v.message || String(v);
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
  } catch {
    return String(v);
  }
}

function pushLog(type, payload) {
  const entry = { t: Date.now(), type, payload };
  logs.push(entry);
  if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
  if (el.adminModal?.classList.contains('show')) renderAdminLogs();
}

(function hookConsole() {
  const original = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  function wrap(fnName) {
    return function (...args) {
      try { pushLog('console.' + fnName, args.map(a => stringifyAny(a))); } catch {}
      try { original[fnName].apply(console, args); } catch {}
    };
  }
  console.log = wrap('log');
  console.warn = wrap('warn');
  console.error = wrap('error');
  console.info = wrap('info');
})();

window.addEventListener('error', (e) => {
  try {
    pushLog('error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  } catch {}
});

window.addEventListener('unhandledrejection', (e) => {
  try { pushLog('unhandledrejection', stringifyAny(e.reason)); } catch {}
});

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isAdmin() {
  try { return sessionStorage.getItem(ADMIN_KEY) === '1'; } catch { return false; }
}

function setAdmin(v) {
  try { sessionStorage.setItem(ADMIN_KEY, v ? '1' : '0'); } catch {}
}

function openAdmin() {
  if (!el.adminModal) return;
  el.adminModal.classList.add('show');
  el.adminModal.setAttribute('aria-hidden', 'false');
  syncAdminViews();
}

function closeAdmin() {
  if (!el.adminModal) return;
  el.adminModal.classList.remove('show');
  el.adminModal.setAttribute('aria-hidden', 'true');
  if (el.adminMsg) el.adminMsg.textContent = '';
  if (el.adminPassword) el.adminPassword.value = '';
}

function setAdminPane(which) {
  if (!el.adminLogsPane || !el.adminConsolePane) return;
  const logsOn = which === 'logs';
  el.adminLogsPane.style.display = logsOn ? 'block' : 'none';
  el.adminConsolePane.style.display = logsOn ? 'none' : 'block';
  if (el.adminTabLogs) el.adminTabLogs.style.opacity = logsOn ? '1' : '0.75';
  if (el.adminTabConsole) el.adminTabConsole.style.opacity = logsOn ? '0.75' : '1';
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAdminLogs() {
  if (!el.adminLogList) return;
  el.adminLogList.innerHTML = '';

  if (!logs.length) {
    const d = document.createElement('div');
    d.style.opacity = '0.7';
    d.style.padding = '10px 2px';
    d.textContent = 'No logs yet.';
    el.adminLogList.appendChild(d);
    return;
  }

  const items = logs.slice().reverse();
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'adminLog';
    const icon = it.type.includes('error') ? 'fa-triangle-exclamation' : it.type.includes('warn') ? 'fa-circle-exclamation' : it.type.includes('info') ? 'fa-circle-info' : 'fa-terminal';

    const left = document.createElement('div');
    left.className = 'adminTag';
    left.innerHTML = `<i class="fa-solid ${icon}"></i>${fmtTime(it.t)}<span style="opacity:.65;">${escapeHtml(it.type)}</span>`;

    const right = document.createElement('div');
    right.className = 'adminText';
    const text = (typeof it.payload === 'string') ? it.payload : stringifyAny(it.payload);
    right.textContent = text;

    row.appendChild(left);
    row.appendChild(right);
    el.adminLogList.appendChild(row);
  }
}

function writeConsoleOut(line) {
  consoleOut.push({ t: Date.now(), line });
  if (consoleOut.length > 200) consoleOut.splice(0, consoleOut.length - 200);
  renderAdminConsoleOut();
}

function renderAdminConsoleOut() {
  if (!el.adminConsoleOut) return;
  el.adminConsoleOut.textContent = consoleOut.map(x => `[${fmtTime(x.t)}] ${x.line}`).join('\n');
  el.adminConsoleOut.scrollTop = el.adminConsoleOut.scrollHeight;
}

function runAdminConsole() {
  if (!isAdmin()) return;
  const code = (el.adminConsoleInput?.value || '').trim();
  if (!code) return;
  el.adminConsoleInput.value = '';
  writeConsoleOut('> ' + code);
  try {
    const result = (0, eval)(code);
    if (result !== undefined) writeConsoleOut(String(result));
  } catch (e) {
    writeConsoleOut('Error: ' + (e?.message || String(e)));
    try { pushLog('admin.console', e?.stack || e?.message || String(e)); } catch {}
  }
}

function exportAdminJson() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), logs, consoleOut };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evadionrv-admin.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearAdminData() {
  logs.splice(0, logs.length);
  consoleOut.splice(0, consoleOut.length);
  renderAdminLogs();
  renderAdminConsoleOut();
}

function syncAdminViews() {
  const ok = isAdmin();
  if (el.adminLoginView) el.adminLoginView.style.display = ok ? 'none' : 'block';
  if (el.adminPanelView) el.adminPanelView.style.display = ok ? 'block' : 'none';
  if (ok) {
    setAdminPane('logs');
    renderAdminLogs();
    renderAdminConsoleOut();
  }
}

/* Wiring */
async function openTab(url) {
  await ensureUvServiceWorker();
  if (isLocalPath(url)) createTab(url);
  else createTab(normalize(url));
}

(function wire() {
  if (el.quickLinks) {
    el.quickLinks.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (!btn) return;
      openTab(btn.getAttribute('data-open') || '');
    });
  }

  if (el.bmManageBtn) el.bmManageBtn.addEventListener('click', openBookmarkModal);
  if (el.bmCloseBtn) el.bmCloseBtn.addEventListener('click', closeBookmarkModal);
  if (el.bmModal) el.bmModal.addEventListener('click', (e) => { if (e.target === el.bmModal) closeBookmarkModal(); });

  if (el.bmClearBtn) el.bmClearBtn.addEventListener('click', clearBookmarkForm);
  if (el.bmSaveBtn) el.bmSaveBtn.addEventListener('click', addOrUpdateBookmark);
  if (el.bmExportBtn) el.bmExportBtn.addEventListener('click', exportBookmarksJson);

  if (el.bmImportInput) {
    el.bmImportInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) await importBookmarksJson(file);
      e.target.value = '';
    });
  }

  if (el.historyBtn) el.historyBtn.addEventListener('click', openHistoryModal);
  if (el.historyCloseBtn) el.historyCloseBtn.addEventListener('click', closeHistoryModal);
  if (el.historyModal) el.historyModal.addEventListener('click', (e) => { if (e.target === el.historyModal) closeHistoryModal(); });
  if (el.historySearch) el.historySearch.addEventListener('input', renderHistoryList);
  if (el.historyClearSearch) el.historyClearSearch.addEventListener('click', () => { el.historySearch.value = ''; renderHistoryList(); el.historySearch.focus(); });
  if (el.historyExportBtn) el.historyExportBtn.addEventListener('click', exportHistoryJson);
  if (el.historyClearBtn) el.historyClearBtn.addEventListener('click', () => {
    historyItems = [];
    saveHistory();
    renderHistoryList();
    if (el.historyMsg) el.historyMsg.textContent = 'History cleared.';
  });
  if (el.historyImportInput) {
    el.historyImportInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) await importHistoryJson(file);
      e.target.value = '';
    });
  }

  if (el.adminBtn) el.adminBtn.addEventListener('click', openAdmin);
  if (el.adminCloseBtn) el.adminCloseBtn.addEventListener('click', closeAdmin);
  if (el.adminModal) el.adminModal.addEventListener('click', (e) => { if (e.target === el.adminModal) closeAdmin(); });

  if (el.adminLoginBtn) el.adminLoginBtn.addEventListener('click', () => {
    const pass = (el.adminPassword?.value || '');
    if (pass === ADMIN_PASS) {
      setAdmin(true);
      if (el.adminMsg) el.adminMsg.textContent = '';
      syncAdminViews();
    } else {
      if (el.adminMsg) el.adminMsg.textContent = 'Invalid password.';
    }
  });
  if (el.adminPassword) el.adminPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.adminLoginBtn?.click(); });

  if (el.adminTabLogs) el.adminTabLogs.addEventListener('click', () => { setAdminPane('logs'); renderAdminLogs(); });
  if (el.adminTabConsole) el.adminTabConsole.addEventListener('click', () => { setAdminPane('console'); renderAdminConsoleOut(); el.adminConsoleInput?.focus(); });

  if (el.adminRunBtn) el.adminRunBtn.addEventListener('click', runAdminConsole);
  if (el.adminConsoleInput) el.adminConsoleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runAdminConsole(); });

  if (el.adminExportBtn) el.adminExportBtn.addEventListener('click', exportAdminJson);
  if (el.adminClearBtn) el.adminClearBtn.addEventListener('click', clearAdminData);
  if (el.adminLogoutBtn) el.adminLogoutBtn.addEventListener('click', () => { setAdmin(false); closeAdmin(); });

  if (el.backBtn) el.backBtn.addEventListener('click', () => { try { el.frame.contentWindow.history.back(); } catch {} });
  if (el.forwardBtn) el.forwardBtn.addEventListener('click', () => { try { el.frame.contentWindow.history.forward(); } catch {} });

  if (el.reloadBtn) el.reloadBtn.addEventListener('click', () => {
    try { el.frame.contentWindow.location.reload(); }
    catch { el.frame.src = el.frame.src; }
  });

  if (el.goBtn) el.goBtn.addEventListener('click', goFromOmni);
  if (el.omni) el.omni.addEventListener('keydown', (e) => { if (e.key === 'Enter') goFromOmni(); });

  if (el.newTabBtn) el.newTabBtn.addEventListener('click', async () => {
    await ensureUvServiceWorker();
    createTab('https://www.google.com');
    el.omni.focus();
    el.omni.select();
  });

  function closeAllTabsToHome() {
    const tabs = Array.from(el.tabBar.querySelectorAll('.tab'));
    tabs.forEach(t => t.classList.add('closing'));

    setTimeout(() => {
      state.tabs = [];
      state.activeId = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      renderTabs();
      el.frame.src = 'about:blank';
      enterHome();
    }, 220);
  }

  if (el.homeBtn) el.homeBtn.addEventListener('click', closeAllTabsToHome);

  if (el.urlInput) el.urlInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      await ensureUvServiceWorker();
      createTab(normalize(el.urlInput.value));
    }
  });

  if (el.frame) {
    el.frame.addEventListener('load', () => {
      const active = state.tabs.find(x => x.id === state.activeId);
      if (!active) return;

      let updated = false;

      try {
        const href = el.frame.contentWindow.location.href;
        const decodedHref = uvDecodeUrl(href);
        const normalizedHref = decodedHref || href;
        if (normalizedHref && normalizedHref !== active.url) {
          active.url = normalizedHref;
          if (normalizedHref.includes('games.html')) {
            active.title = 'Games';
            active.faIcon = '';
          } else if (normalizedHref.includes('movies.html')) {
            active.title = 'Movies';
            active.faIcon = '';
          } else {
            active.title = safeHost(normalizedHref);
            active.faIcon = (!isLocalPath(normalizedHref)) ? (resolveFaIconForUrl(normalizedHref) || active.faIcon || '') : '';
          }
          active.favicon = null;
          updated = true;
        }
      } catch {}

      try {
        const doc = el.frame.contentDocument;
        if (doc) {
          const t = (doc.title || '').trim();
          if (t) { active.title = t; updated = true; }
          const link = doc.querySelector('link[rel~=icon], link[rel="shortcut icon"]');
          if (link && link.href) { active.favicon = link.href; updated = true; }
        }
      } catch {
        if (active.url && active.url.includes('games.html')) {
          active.title = 'Games';
          active.faIcon = '';
        } else if (active.url && active.url.includes('movies.html')) {
          active.title = 'Movies';
          active.faIcon = '';
        } else {
          active.title = safeHost(active.url);
          active.faIcon = (!isLocalPath(active.url)) ? (resolveFaIconForUrl(active.url) || active.faIcon || '') : '';
        }
      }

      if (updated) {
        saveTabs();
        renderTabs();
      } else {
        showHint();
      }

      addHistory(active.url, active.title);
    });
  }
})();

/* Self-tests + boot */
function runSelfTests() {
  try {
    console.assert(isLocalPath('games.html') === true, 'local: games.html');
    console.assert(isLocalPath('movies.html') === true, 'local: movies.html');
    console.assert(normalize('games.html') === 'games.html', 'normalize: keeps local');
    console.assert(normalize('example.com').startsWith('https://'), 'normalize: adds https');
    console.assert(typeof resolveFaIconForUrl('https://spotify.com') === 'string', 'fa: returns string');
    console.assert(typeof resolveFaIconForUrl('https://x.com') === 'string', 'fa: alias returns string');

    loadHistory();
    const before = historyItems.length;
    addHistory('https://example.com', 'Example');
    addHistory('https://example.com', 'Example');
    console.assert(historyItems.length >= before + 1, 'history: added');
  } catch {}
}

(async function boot() {
  runSelfTests();
  try { uvReady = localStorage.getItem(UV_READY_KEY) === '1'; } catch {}
  await ensureUvServiceWorker();
  loadHistory();
  loadBookmarks();
  renderBookmarks();
  loadTabs();

  if (state.tabs.length) {
    if (!state.tabs.some(t => t.id === state.activeId)) state.activeId = state.tabs[0].id;
    renderTabs();
    const active = state.tabs.find(t => t.id === state.activeId);
    if (active) {
      enterBrowser();
      navigateActive(active.url, true);
    }
  }
})();
