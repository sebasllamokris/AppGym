// AppGym — lógica principal. Todo se guarda en el celular (localStorage).

const STORE_KEY = 'appgym:v1';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let state = load();
let view = 'home';
let calMonth = monthStart(new Date());
let preview = null;      // rutina generada antes de empezar
let activityDraft = null; // formulario de actividad
let pickQuery = '';
let tickTimer = null;
let rest = null;          // { until: ms }

// ---------- Guardado ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.sessions)) return { settings: { rest: 90 }, active: null, ...s };
  } catch (e) { /* datos dañados o sin acceso */ }
  return { sessions: [], active: null, settings: { rest: 90 } };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('No se pudo guardar'); }
}

// ---------- Utilidades ----------
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateStr(new Date());
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exById = (id) => EXERCISES.find((e) => e.id === id);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function fmtLongDate(s) {
  return parseDate(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtShortDate(s) {
  if (s === todayStr()) return 'Hoy';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (s === dateStr(y)) return 'Ayer';
  return parseDate(s).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

// ---------- Generador de rutinas ----------
function pickFor(muscle, n, exclude) {
  const pool = EXERCISES.filter((e) => e.muscle === muscle && !exclude.has(e.id));
  const compounds = shuffle(pool.filter((e) => e.compound));
  const out = [];
  if (compounds.length) out.push(compounds[0]); // el primero de cada grupo, multiarticular
  for (const e of shuffle(pool)) {
    if (out.length >= n) break;
    if (!out.includes(e)) out.push(e);
  }
  out.forEach((e) => exclude.add(e.id));
  return out.slice(0, n);
}
function generate(routineKey) {
  const r = ROUTINES[routineKey];
  const used = new Set();
  return r.slots.flatMap(([m, n]) => pickFor(m, n, used)).map((e) => e.id);
}

function newWorkoutExercise(ex) {
  return {
    exId: ex.id, name: ex.name, muscle: ex.muscle, target: `${ex.sets}×${ex.reps}`,
    sets: Array.from({ length: ex.sets }, () => ({ w: '', r: '', done: false })),
  };
}

// Últimas series registradas para un ejercicio
function lastFor(exId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const s = state.sessions[i];
    if (s.type !== 'gym') continue;
    const e = s.exercises.find((x) => x.exId === exId);
    if (e && e.sets.length) return e.sets;
  }
  return null;
}
function fmtSets(sets) {
  const parts = sets.map((s) => (num(s.w) ? `${s.w}×${s.r}` : `${s.r}`));
  const same = parts.every((p) => p === parts[0]);
  return same ? `${sets.length} × ${num(sets[0].w) ? sets[0].w + ' kg × ' + sets[0].r : sets[0].r + ' reps'}` : parts.join(' · ') + (num(sets[0].w) ? ' kg' : '');
}

// ---------- Estadísticas ----------
function sessionsSorted() {
  return [...state.sessions].sort((a, b) => (a.date === b.date ? (b.start || 0) - (a.start || 0) : a.date < b.date ? 1 : -1));
}
function activeDays() { return new Set(state.sessions.map((s) => s.date)); }
function streak() {
  const days = activeDays();
  const d = new Date();
  if (!days.has(dateStr(d))) d.setDate(d.getDate() - 1); // la racha sigue viva si hoy todavía no entrenaste
  let n = 0;
  while (days.has(dateStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function weekCount() {
  const d = new Date();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const from = dateStr(monday);
  return [...activeDays()].filter((x) => x >= from).length;
}
function sessionSummary(s) {
  if (s.type === 'activity') {
    return [s.minutes ? `${s.minutes} min` : '', s.intensity ? `intensidad ${s.intensity}` : ''].filter(Boolean).join(' · ');
  }
  const sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  const vol = s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + num(x.w) * num(x.r), 0), 0);
  const min = s.end && s.start ? Math.round((s.end - s.start) / 60000) : 0;
  return [`${s.exercises.length} ejercicios`, `${sets} series`, vol ? `${Math.round(vol).toLocaleString('es')} kg` : '', min ? `${min} min` : ''].filter(Boolean).join(' · ');
}

// ---------- Vistas ----------
function render() {
  const app = $('#app');
  const inWk = !!state.active;
  document.body.classList.toggle('in-workout', inWk);
  $('#tabs').hidden = inWk;
  if (inWk) {
    app.innerHTML = workoutView();
    startTick();
  } else {
    stopRest();
    stopTick();
    app.innerHTML = view === 'home' ? homeView() : view === 'calendar' ? calendarView() : settingsView();
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
  }
}

function sessionRow(s) {
  const title = s.type === 'gym' ? s.title : s.sport;
  return `<button class="card sess" data-action="day" data-d="${s.date}">
    <span class="dot ${s.type === 'activity' ? 'act' : ''}"></span>
    <span class="grow"><span class="title">${esc(title)}</span> <span class="muted small">· ${esc(fmtShortDate(s.date))}</span>
    <div class="muted small">${esc(sessionSummary(s))}</div></span>
  </button>`;
}

function homeView() {
  const today = todayStr();
  const didToday = state.sessions.some((s) => s.date === today);
  const recent = sessionsSorted().slice(0, 5);
  return `
    <header>
      <div class="eyebrow">${esc(fmtLongDate(today))}</div>
      <h1>¿Qué toca hoy?</h1>
      ${didToday ? '<div class="today-badge">✓ Hoy ya te moviste</div>' : ''}
    </header>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>días de racha</span></div>
      <div class="stat"><b>${weekCount()}</b><span>días esta semana</span></div>
      <div class="stat"><b>${state.sessions.length}</b><span>sesiones</span></div>
    </div>
    <h2 class="section">Entrenar en el gym</h2>
    <div class="routine-grid">
      ${Object.entries(ROUTINES).map(([k, r]) => `
        <button class="routine" data-action="preview" data-r="${k}"><strong>${esc(r.name)}</strong><span>${esc(r.desc)}</span></button>`).join('')}
    </div>
    <div class="home-actions">
      <button class="btn sport wide" data-action="log-activity">+ Registrar deporte o actividad</button>
    </div>
    <h2 class="section">Últimas sesiones</h2>
    ${recent.length ? recent.map(sessionRow).join('') : '<div class="empty">Todavía no registraste nada. ¡Elegí una rutina y arrancá!</div>'}
  `;
}

function placeholder(last, j, f, target) {
  const s = last && (last[j] || last[last.length - 1]);
  if (s && s[f]) return s[f];
  if (f === 'r') return target.split('×')[1]?.split('-')[0] || '';
  return '';
}

function workoutView() {
  const a = state.active;
  return `
    <header class="wk-head">
      <div><div class="eyebrow">Entrenando</div><h1>${esc(a.title)}</h1></div>
      <div class="elapsed" id="elapsed">${fmtClock(Date.now() - a.start)}</div>
    </header>
    ${a.exercises.map((e, i) => {
      const last = lastFor(e.exId);
      return `<section class="card">
        <div class="ex-head">
          <div><h3>${esc(e.name)}</h3>
            <div class="muted small">${esc(MUSCLES[e.muscle] || '')} · objetivo ${esc(e.target)}</div>
            ${last ? `<div class="last">Última vez: ${esc(fmtSets(last))}</div>` : ''}</div>
          <div class="ex-menu">
            <button class="icon-btn" data-action="swap-ex" data-i="${i}" aria-label="Cambiar ejercicio">⇄</button>
            <button class="icon-btn" data-action="del-ex" data-i="${i}" aria-label="Quitar ejercicio">✕</button>
          </div>
        </div>
        <div class="set-row hdr"><span>Serie</span><span>kg</span><span>Reps</span><span></span></div>
        ${e.sets.map((s, j) => `
          <div class="set-row ${s.done ? 'done' : ''}">
            <span class="set-n">${j + 1}</span>
            <input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${esc(placeholder(last, j, 'w', e.target)) || '—'}" aria-label="Peso serie ${j + 1}">
            <input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${esc(placeholder(last, j, 'r', e.target))}" aria-label="Repeticiones serie ${j + 1}">
            <button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-label="Marcar serie">✓</button>
          </div>`).join('')}
        <div class="row-btns">
          <button class="btn small ghost" data-action="add-set" data-i="${i}">+ Serie</button>
          ${e.sets.length > 1 ? `<button class="btn small ghost" data-action="del-set" data-i="${i}">− Serie</button>` : ''}
        </div>
      </section>`;
    }).join('')}
    <button class="btn ghost wide" data-action="add-ex">+ Añadir ejercicio</button>
    <div class="wk-actions">
      <button class="btn danger" data-action="cancel-wk">Descartar</button>
      <button class="btn primary" data-action="finish-wk">Terminar entrenamiento</button>
    </div>
  `;
}

function calendarView() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // lunes primero
  const daysIn = new Date(y, m + 1, 0).getDate();
  const byDay = {};
  state.sessions.forEach((s) => (byDay[s.date] ||= []).push(s));
  const today = todayStr();
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="cal-day out"></div>';
  let activeCount = 0;
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
    const list = byDay[ds] || [];
    if (list.length) activeCount++;
    const gym = list.some((s) => s.type === 'gym'), act = list.some((s) => s.type === 'activity');
    cells += `<button class="cal-day ${list.length ? 'active' : ''} ${ds === today ? 'today' : ''}" data-action="day" data-d="${ds}">
      <span>${d}</span><span class="dots">${gym ? '<i></i>' : ''}${act ? '<i class="act"></i>' : ''}</span></button>`;
  }
  const label = first.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return `
    <header><h1>Calendario</h1></header>
    <div class="cal-nav">
      <button class="icon-btn" data-action="cal-prev" aria-label="Mes anterior">‹</button>
      <strong>${esc(label)}</strong>
      <button class="icon-btn" data-action="cal-next" aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal-grid">
      ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((w) => `<div class="cal-wd">${w}</div>`).join('')}
      ${cells}
    </div>
    <div class="legend"><span><i></i>Gym</span><span><i class="act"></i>Deporte / actividad</span></div>
    <h2 class="section">Este mes</h2>
    <div class="card"><b>${activeCount}</b> <span class="muted">días activos de ${daysIn}</span></div>
  `;
}

function settingsView() {
  const r = state.settings.rest;
  return `
    <header><h1>Ajustes</h1></header>
    <h2 class="section">Entrenamiento</h2>
    <div class="card setting-row">
      <span>Descanso entre series</span>
      <select class="input" style="width:auto" data-setting="rest">
        ${[0, 45, 60, 90, 120, 150, 180, 240].map((s) => `<option value="${s}" ${s === r ? 'selected' : ''}>${s ? fmtClock(s * 1000) : 'Sin timer'}</option>`).join('')}
      </select>
    </div>
    <h2 class="section">Tus datos</h2>
    <p class="muted small">Todo se guarda solo en este celular. Exportá una copia de vez en cuando para no perder tu historial.</p>
    <div class="card" style="display:grid;gap:10px">
      <button class="btn" data-action="export">Exportar copia de seguridad</button>
      <button class="btn" data-action="import">Importar copia de seguridad</button>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <button class="btn danger" data-action="wipe">Borrar todos los datos</button>
    </div>
    <p class="muted small" style="text-align:center;margin-top:24px">AppGym · ${state.sessions.length} sesiones guardadas</p>
  `;
}

// ---------- Hojas (modales) ----------
function openSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true;
  preview = null; activityDraft = null; pickQuery = '';
}

function previewSheet() {
  const r = ROUTINES[preview.routine];
  const list = preview.ids.map(exById);
  openSheet(`
    <h2>${esc(r.name)}</h2>
    <div class="sub">${esc(r.desc)}${list.length ? ` · ${list.length} ejercicios` : ''}</div>
    ${list.length ? `<div class="card" style="background:var(--surface-2)">
      ${list.map((e) => `<div class="plan-item"><span>${esc(e.name)}</span><span class="tgt">${e.sets}×${esc(e.reps)}</span></div>`).join('')}
    </div>` : '<p class="muted">Empezás vacío y vas agregando los ejercicios que quieras.</p>'}
    <div class="sheet-actions">
      ${list.length ? '<button class="btn" data-action="regen">🔀 Otra</button>' : '<button class="btn" data-action="close-sheet">Volver</button>'}
      <button class="btn primary" data-action="start">Empezar</button>
    </div>
  `);
}

function pickerSheet() {
  const q = pickQuery.trim().toLowerCase();
  const inWk = new Set(state.active.exercises.map((e) => e.exId));
  const groups = Object.entries(MUSCLES).map(([k, label]) => {
    const items = EXERCISES.filter((e) => e.muscle === k && !inWk.has(e.id) && (!q || e.name.toLowerCase().includes(q) || label.toLowerCase().includes(q)));
    if (!items.length) return '';
    return `<div class="pick-group"><h4>${esc(label)}</h4>${items.map((e) => `<button class="pick" data-action="pick" data-id="${e.id}">${esc(e.name)} <span class="muted small">· ${e.sets}×${esc(e.reps)}</span></button>`).join('')}</div>`;
  }).join('');
  return `<h2>Añadir ejercicio</h2>
    <input class="input" id="pick-q" placeholder="Buscar ejercicio o músculo…" value="${esc(pickQuery)}" style="margin:10px 0 4px">
    <div id="pick-list">${groups || '<div class="empty">Sin resultados</div>'}</div>`;
}

function activitySheet() {
  const a = activityDraft;
  openSheet(`
    <h2>Registrar actividad</h2>
    <div class="sub">Deportes, cardio o cualquier movimiento del día</div>
    <label class="field"><span>¿Qué hiciste?</span>
      <div class="chips">${SPORTS.map((s) => `<button class="chip ${a.sport === s ? 'on' : ''}" data-action="act-sport" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    </label>
    ${a.sport === 'Otro' ? `<label class="field"><span>Nombre</span><input class="input" id="act-other" value="${esc(a.other)}" placeholder="Ej: escalada"></label>` : ''}
    <label class="field"><span>Fecha</span><input class="input" type="date" id="act-date" value="${a.date}" max="${todayStr()}"></label>
    <label class="field"><span>Duración (minutos)</span><input class="input" id="act-min" inputmode="numeric" value="${esc(a.minutes)}" placeholder="60"></label>
    <label class="field"><span>Intensidad</span>
      <div class="seg">${['baja', 'media', 'alta'].map((v) => `<button class="chip ${a.intensity === v ? 'on' : ''}" data-action="act-int" data-v="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
    </label>
    <label class="field"><span>Notas (opcional)</span><textarea class="input" id="act-notes" placeholder="Ej: partido 5v5, 2 goles">${esc(a.notes)}</textarea></label>
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cancelar</button>
      <button class="btn sport" data-action="save-activity">Guardar</button>
    </div>
  `);
}
function readActivityInputs() {
  const a = activityDraft;
  if (!a) return;
  if ($('#act-date')) a.date = $('#act-date').value || a.date;
  if ($('#act-min')) a.minutes = $('#act-min').value;
  if ($('#act-notes')) a.notes = $('#act-notes').value;
  if ($('#act-other')) a.other = $('#act-other').value;
}

function daySheet(ds) {
  const list = state.sessions.filter((s) => s.date === ds);
  openSheet(`
    <h2 class="cap">${esc(fmtLongDate(ds))}</h2>
    <div class="sub">${list.length ? `${list.length} ${list.length === 1 ? 'registro' : 'registros'}` : 'Día sin actividad'}</div>
    ${list.map((s) => `
      <div class="card" style="background:var(--surface-2)">
        <div class="ex-head" style="margin-bottom:4px">
          <div><h3>${s.type === 'gym' ? '🏋️ ' + esc(s.title) : '⚡ ' + esc(s.sport)}</h3>
          <div class="muted small">${esc(sessionSummary(s))}</div></div>
          <button class="icon-btn" data-action="del-session" data-id="${s.id}" aria-label="Borrar">🗑</button>
        </div>
        ${s.type === 'gym' ? s.exercises.map((e) => `<div class="detail-ex"><div>${esc(e.name)}</div><div class="muted small">${esc(fmtSets(e.sets))}</div></div>`).join('') : ''}
        ${s.notes ? `<p class="small" style="margin:8px 0 0">${esc(s.notes)}</p>` : ''}
      </div>`).join('')}
    <button class="btn sport wide" data-action="log-activity" data-d="${ds}" style="margin-top:6px">+ Registrar actividad este día</button>
  `);
}

// ---------- Timers ----------
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    const el = $('#elapsed');
    if (el && state.active) el.textContent = fmtClock(Date.now() - state.active.start);
    renderRest();
  }, 1000);
}
function stopTick() { clearInterval(tickTimer); tickTimer = null; }

function startRest() {
  const secs = state.settings.rest;
  if (!secs) return;
  rest = { until: Date.now() + secs * 1000 };
  renderRest();
}
function stopRest() { rest = null; $('#rest').hidden = true; }
function renderRest() {
  const el = $('#rest');
  if (!rest) { el.hidden = true; return; }
  const left = rest.until - Date.now();
  if (left <= 0) {
    stopRest();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    toast('¡Descanso terminado!');
    return;
  }
  el.hidden = false;
  el.innerHTML = `<span>⏱</span><span class="t">${fmtClock(left)}</span>
    <button data-action="rest-add">+15s</button><button data-action="rest-skip">Saltar</button>`;
}

// ---------- Acciones ----------
const actions = {
  preview(el) {
    preview = { routine: el.dataset.r, ids: generate(el.dataset.r) };
    previewSheet();
  },
  regen() { preview.ids = generate(preview.routine); previewSheet(); },
  start() {
    const r = ROUTINES[preview.routine];
    state.active = {
      id: uid(), routine: preview.routine, title: r.name, start: Date.now(),
      exercises: preview.ids.map((id) => newWorkoutExercise(exById(id))),
    };
    save(); closeSheet(); window.scrollTo(0, 0); render();
  },
  'toggle-set'(el) {
    const e = state.active.exercises[+el.dataset.i], j = +el.dataset.j, s = e.sets[j];
    if (!s.done) {
      // si está vacío, usa lo sugerido (lo de la última vez)
      const last = lastFor(e.exId);
      if (!s.w) s.w = placeholder(last, j, 'w', e.target);
      if (!s.r) s.r = placeholder(last, j, 'r', e.target);
      s.done = true;
      startRest();
    } else s.done = false;
    save(); render();
  },
  'add-set'(el) {
    const e = state.active.exercises[+el.dataset.i];
    const prev = e.sets[e.sets.length - 1];
    e.sets.push({ w: prev ? prev.w : '', r: prev ? prev.r : '', done: false });
    save(); render();
  },
  'del-set'(el) { state.active.exercises[+el.dataset.i].sets.pop(); save(); render(); },
  'del-ex'(el) {
    const e = state.active.exercises[+el.dataset.i];
    if (e.sets.some((s) => s.done) && !confirm(`¿Quitar ${e.name}? Se pierden sus series.`)) return;
    state.active.exercises.splice(+el.dataset.i, 1); save(); render();
  },
  'swap-ex'(el) {
    const i = +el.dataset.i, cur = state.active.exercises[i];
    const used = new Set(state.active.exercises.map((e) => e.exId));
    const options = shuffle(EXERCISES.filter((e) => e.muscle === cur.muscle && !used.has(e.id)));
    if (!options.length) return toast('No hay otro ejercicio para ese músculo');
    state.active.exercises[i] = newWorkoutExercise(options[0]);
    save(); render(); toast(`Cambiado por ${options[0].name}`);
  },
  'add-ex'() { pickQuery = ''; openSheet(pickerSheet()); },
  pick(el) {
    state.active.exercises.push(newWorkoutExercise(exById(el.dataset.id)));
    save(); closeSheet(); render();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  },
  'cancel-wk'() {
    if (!confirm('¿Descartar este entrenamiento? No se guardará nada.')) return;
    state.active = null; save(); render();
  },
  'finish-wk'() {
    const a = state.active;
    const exercises = a.exercises
      .map((e) => ({ exId: e.exId, name: e.name, muscle: e.muscle, sets: e.sets.filter((s) => s.done).map(({ w, r }) => ({ w, r })) }))
      .filter((e) => e.sets.length);
    if (!exercises.length) {
      if (confirm('No marcaste ninguna serie como hecha. ¿Descartar el entrenamiento?')) { state.active = null; save(); render(); }
      return;
    }
    const pending = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    if (pending && !confirm(`Quedan ${pending} series sin marcar. Solo se guardan las marcadas. ¿Terminar?`)) return;
    const session = { id: a.id, type: 'gym', date: dateStr(new Date(a.start)), routine: a.routine, title: a.title, start: a.start, end: Date.now(), exercises };
    state.sessions.push(session);
    state.active = null; save();
    view = 'home'; render(); window.scrollTo(0, 0);
    toast('💪 Entrenamiento guardado');
  },
  'rest-add'() { if (rest) { rest.until += 15000; renderRest(); } },
  'rest-skip'() { stopRest(); },

  'log-activity'(el) {
    activityDraft = { sport: '', other: '', date: el.dataset.d || todayStr(), minutes: '', intensity: 'media', notes: '' };
    activitySheet();
  },
  'act-sport'(el) { readActivityInputs(); activityDraft.sport = el.dataset.v; activitySheet(); },
  'act-int'(el) { readActivityInputs(); activityDraft.intensity = el.dataset.v; activitySheet(); },
  'save-activity'() {
    readActivityInputs();
    const a = activityDraft;
    const sport = a.sport === 'Otro' ? (a.other.trim() || 'Otra actividad') : a.sport;
    if (!sport) return toast('Elegí qué actividad hiciste');
    state.sessions.push({ id: uid(), type: 'activity', date: a.date, start: Date.now(), sport, minutes: num(a.minutes) || '', intensity: a.intensity, notes: a.notes.trim() });
    save(); closeSheet(); render(); toast('⚡ Actividad registrada');
  },

  day(el) { daySheet(el.dataset.d); },
  'del-session'(el) {
    if (!confirm('¿Borrar este registro? No se puede deshacer.')) return;
    const s = state.sessions.find((x) => x.id === el.dataset.id);
    state.sessions = state.sessions.filter((x) => x.id !== el.dataset.id);
    save(); render();
    s && state.sessions.some((x) => x.date === s.date) ? daySheet(s.date) : closeSheet();
  },
  'cal-prev'() { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); render(); },
  'cal-next'() { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); render(); },
  'close-sheet'() { closeSheet(); },

  export() {
    const blob = new Blob([JSON.stringify({ app: 'AppGym', version: 1, exported: new Date().toISOString(), sessions: state.sessions, settings: state.settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `appgym-backup-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import() { $('#import-file').click(); },
  wipe() {
    if (!confirm('¿Borrar TODO tu historial? No se puede deshacer.')) return;
    state = { sessions: [], active: null, settings: state.settings }; save(); render(); toast('Datos borrados');
  },
};

document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('#tabs button');
  if (tab) { view = tab.dataset.view; if (view === 'calendar') calMonth = monthStart(new Date()); render(); window.scrollTo(0, 0); return; }
  const el = ev.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) { ev.preventDefault(); actions[el.dataset.action](el); }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'pick-q') {
    pickQuery = t.value;
    const tmp = document.createElement('div'); tmp.innerHTML = pickerSheet();
    $('#pick-list').innerHTML = tmp.querySelector('#pick-list').innerHTML;
    return;
  }
  if (t.dataset.f && state.active) {
    state.active.exercises[+t.dataset.i].sets[+t.dataset.j][t.dataset.f] = t.value.replace(',', '.');
    save();
  }
});

document.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.dataset.setting === 'rest') { state.settings.rest = +t.value; save(); toast('Guardado'); }
  if (t.id === 'import-file' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!Array.isArray(data.sessions)) throw new Error();
      const ids = new Set(state.sessions.map((s) => s.id));
      const nuevos = data.sessions.filter((s) => s && s.id && s.date && !ids.has(s.id));
      state.sessions.push(...nuevos);
      save(); render(); toast(`Importadas ${nuevos.length} sesiones`);
    } catch (e) { toast('Archivo no válido'); }
    t.value = '';
  }
});

// Al volver a la app después de bloquear el celular, actualizar timers
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderRest(); });

render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
