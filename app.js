// AppGym — lógica principal. Todo se guarda en el celular (localStorage).

const STORE_KEY = 'appgym:v1';
// Servidor que manda los recordatorios (carpeta worker/)
const PUSH_API = 'https://appgym-push.seballamo.workers.dev';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// Suplementos sugeridos la primera vez (se pueden editar o borrar)
const DEFAULT_SUPPS = [
  { id: 'creatina', name: 'Creatina', dose: '5 g', time: '09:00' },
  { id: 'vitaminas', name: 'Vitaminas', dose: '', time: '09:00' },
];

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
  const base = { sessions: [], active: null, settings: { rest: 90 }, supplements: DEFAULT_SUPPS, intake: {}, push: { enabled: false }, membership: null, profile: null };
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.sessions)) {
      migrate(s.sessions);
      // quien ya tenía plan antes de existir "Tu deporte" seguía Soccer con estos torneos
      if (s.profile && !('sport' in s.profile)) Object.assign(s.profile, { sport: 'Soccer', categories: ['Cente', 'Exa', 'Cyt', 'Casual'] });
      return { ...base, ...s };
    }
  } catch (e) { /* datos dañados o sin acceso */ }
  return base;
}
// Ajustes de datos viejos:
// - los partidos de "Fútbol" ahora se llaman "Soccer"
// - goals/assists/tournament sueltos pasan al formato genérico { stats, category }
function migrate(sessions) {
  for (const s of sessions) {
    if (!s) continue;
    if (s.sport === 'Fútbol') s.sport = 'Soccer';
    if (s.tournament !== undefined && !s.stats) {
      s.stats = { goals: s.goals || 0, assists: s.assists || 0 };
      s.category = s.tournament;
      delete s.goals; delete s.assists; delete s.tournament;
    }
  }
  return sessions;
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

let toastTimer, toastAction = null;
// action opcional: { label, fn } → muestra un botón (ej. "Deshacer")
function toast(msg, action) {
  const t = $('#toast');
  toastAction = action || null;
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-action="toast-act">${esc(action.label)}</button>` : ''}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; toastAction = null; }, action ? 4500 : 2200);
}

// ---------- Generador de rutinas ----------
// ---------- Tu plan de entrenamiento ----------
const DEFAULT_PROFILE = { goal: 'muscle', level: 'intermediate', split: 'ppl', days: 4, custom: ['push', 'pull', 'legs'], extras: ['full', 'cali', 'plyo'], sport: null, categories: [] };
const profile = () => ({ ...DEFAULT_PROFILE, ...(state.profile || {}) });
// Deporte que se sigue con estadísticas (Ajustes → Tu plan → Tu deporte)
const trackedSport = () => (SPORT_TRACKERS[profile().sport] ? profile().sport : null);
const tracker = () => SPORT_TRACKERS[trackedSport()] || null;
const sportCategories = () => (profile().categories?.length ? profile().categories : tracker()?.categories || []);
// Rutinas que hay que completar en la semana según el estilo y los días
function weekRequired() {
  const p = profile(), s = SPLITS[p.split] || SPLITS.ppl;
  const list = s.week ? s.week(p.days) : p.custom;
  return list.length ? list : ['full'];
}
// Principiantes: no se arman ejercicios avanzados automáticamente
const levelOk = (e) => profile().level !== 'beginner' || !ADVANCED.has(e.id);

// Compuestos del pool; en rutinas de gym (sin tag) prefiere los que llevan carga antes que los de calistenia
function compoundsOf(pool, tag) {
  const comp = pool.filter((e) => e.compound);
  const gym = comp.filter((e) => !e.tags?.includes('cali'));
  return shuffle(!tag && gym.length ? gym : comp);
}
function pickFor(muscle, n, exclude, tag) {
  const pool = EXERCISES.filter((e) => e.muscle === muscle && !exclude.has(e.id) && (!tag || e.tags?.includes(tag)) && levelOk(e));
  const compounds = compoundsOf(pool, tag);
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
  return r.slots.flatMap(([m, n, tag]) => pickFor(m, n, used, tag)).map((e) => e.id);
}

// Tipos que se pueden combinar (todos menos Libre y la propia Combinación)
const COMBINABLE = Object.keys(ROUTINES).filter((k) => !ROUTINES[k].combo && k !== 'free');
const isPlyo = (e) => e.muscle.startsWith('plyo');
// Orden de la sesión: pliometría (fresco) → compuestos → aislamiento → core
const orderRank = (e) => (isPlyo(e) ? 0 : e.muscle === 'core' ? 3 : e.compound ? 1 : 2);

// Combinación: reparte un presupuesto de ejercicios entre los tipos elegidos
function generateCombo(types) {
  const k = types.length;
  const total = COMBO.exercises[k];
  // cuota por tipo: al menos 2; el resto va a los tipos con rutinas más grandes
  const size = (t) => ROUTINES[t].slots.reduce((n, s) => n + s[1], 0);
  const quota = Object.fromEntries(types.map((t) => [t, 2]));
  let left = total - 2 * k;
  const bySize = [...types].sort((a, b) => size(b) - size(a));
  for (let i = 0; left > 0; i++, left--) quota[bySize[i % k]]++;

  // de cada tipo, los músculos en ronda (pecho, hombro, tríceps, pecho…) para cubrir variedad primero
  const used = new Set(), muscleUses = {}, picked = [];
  for (const t of types) {
    const queue = [];
    const slots = ROUTINES[t].slots.map(([m, n, tag]) => ({ m, n, tag }));
    for (let round = 0; slots.some((s) => s.n > round); round++) {
      slots.filter((s) => s.n > round).forEach((s) => queue.push(s));
    }
    // primero los músculos que otro tipo todavía no cubrió
    const fresh = queue.filter((s) => !muscleUses[s.m]);
    const ordered = [...fresh, ...queue.filter((s) => !fresh.includes(s))];
    let got = 0;
    for (const s of ordered) {
      if (got >= quota[t]) break;
      const first = !muscleUses[s.m];
      const pool = EXERCISES.filter((e) => e.muscle === s.m && !used.has(e.id) && (!s.tag || e.tags?.includes(s.tag)) && levelOk(e));
      const comp = compoundsOf(pool, s.tag);
      const ex = first && comp.length ? comp[0] : shuffle(pool)[0];
      if (!ex) continue;
      used.add(ex.id); muscleUses[s.m] = (muscleUses[s.m] || 0) + 1;
      picked.push(ex); got++;
    }
  }

  // ordenar y recortar series hasta el presupuesto (primero los ejercicios de aislamiento)
  picked.sort((a, b) => orderRank(a) - orderRank(b));
  const sets = Object.fromEntries(picked.map((e) => [e.id, e.sets]));
  const sum = () => Object.values(sets).reduce((a, b) => a + b, 0);
  const trimOrder = [...picked].sort((a, b) => orderRank(b) - orderRank(a));
  for (const min of [3, 2]) {
    for (const e of trimOrder) {
      while (sum() > COMBO.sets[k] && sets[e.id] > min) sets[e.id]--;
    }
  }
  return { ids: picked.map((e) => e.id), sets };
}

// Duración estimada (min): trabajo + descanso por serie, más el calentamiento
function estimateMinutes(ids, setsMap = {}) {
  const restMin = (state.settings.rest || 90) / 60;
  const work = ids.reduce((m, id) => {
    const e = exById(id);
    const n = setsMap[id] ?? e.sets;
    const perSet = isPlyo(e) ? 0.5 + restMin * 0.8 : (e.compound ? 0.9 : 0.7) + restMin;
    return m + n * perSet;
  }, 0);
  return Math.round((work + 10) / 5) * 5; // ~10 min de calentamiento, redondeado a 5
}

// ---------- Calentamiento ----------
const round25 = (w) => Math.max(2.5, Math.round(w / 2.5) * 2.5);
function buildWarmup(types, exercises) {
  // movilidad/activación: ronda entre los planes de cada tipo, sin repetir
  const plans = types.map((t) => WARMUP_PLANS[t] || []);
  const ids = [];
  for (let i = 0; ids.length < WARMUP_MAX_STEPS && plans.some((p) => p[i]); i++) {
    for (const p of plans) if (p[i] && !ids.includes(p[i]) && ids.length < WARMUP_MAX_STEPS) ids.push(p[i]);
  }
  const steps = ['cardio', ...ids].map((id) => ({ id, ...WARMUP_STEPS[id], done: false }));

  // series de aproximación para el primer ejercicio pesado con carga externa
  const heavy = exercises.map((e) => exById(e.exId)).find((e) => e && e.compound && !isPlyo(e) && !e.tags?.includes('cali'));
  if (heavy) {
    const last = lastFor(heavy.id);
    const top = last ? Math.max(...last.map((s) => num(s.w))) : 0;
    steps.push({
      id: 'ramp', ramp: heavy.id, done: false,
      name: `Series de aproximación · ${heavy.name}`,
      reps: top
        ? `${round25(top * 0.5)} kg × 8 · ${round25(top * 0.7)} kg × 5 · ${round25(top * 0.85)} kg × 3`
        : 'Barra o peso liviano × 10 · peso moderado × 5 · casi el de trabajo × 3',
      tip: top ? `Basado en tus ${top} kg de la última vez. Descansá ~1 min entre cada una` : 'Descansá ~1 min entre cada una. No llegues al fallo',
    });
  }
  return { steps, timer: null };
}

function newWorkoutExercise(ex, setsCount = ex.sets) {
  return {
    exId: ex.id, name: ex.name, muscle: ex.muscle, target: `${setsCount}×${ex.reps}`,
    sets: Array.from({ length: setsCount }, () => ({ w: '', r: '', done: false })),
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
function monthCount() {
  const prefix = todayStr().slice(0, 7);
  return [...activeDays()].filter((x) => x.startsWith(prefix)).length;
}

// ---------- Week Streak ----------
const weekGoal = () => state.profile?.days || state.settings.weekGoal || 4;
function mondayOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); }
function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => dateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}
// Semanas seguidas cumpliendo el objetivo. La semana actual suma si ya lo cumpliste, pero no corta la racha mientras está en curso.
function weekStreak() {
  const days = activeDays(), goal = weekGoal();
  const met = (mon) => weekDates(mon).filter((d) => days.has(d)).length >= goal;
  const mon = mondayOf(new Date());
  let n = met(mon) ? 1 : 0;
  for (let w = new Date(mon); ; ) {
    w.setDate(w.getDate() - 7);
    if (!met(w)) break;
    n++;
  }
  return n;
}
function weekStreakBlock() {
  const today = todayStr(), days = activeDays(), goal = weekGoal();
  const dates = weekDates(mondayOf(new Date()));
  const done = dates.filter((d) => days.has(d)).length;
  const ds = streak();
  return `<section class="week">
    <div class="week-head">
      <h1>Day Streak</h1>
      <span class="streak-pill" title="Días seguidos entrenando">🔥 ${ds} ${ds === 1 ? 'día' : 'días'}</span>
    </div>
    <div class="muted small">${done} de ${goal} días esta semana${done >= goal ? ' · ¡objetivo cumplido!' : ''}</div>
    <div class="week-days">
      ${dates.map((d, i) => {
        const on = days.has(d), isToday = d === today, future = d > today;
        return `<button class="wd ${on ? 'on' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}" data-action="day" data-d="${d}" aria-label="${esc(fmtLongDate(d))}${on ? ', entrenaste' : ''}">
          <span class="wd-l">${'LMXJVSD'[i]}</span>
          <span class="wd-c">${on ? '✓' : Number(d.slice(8))}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="set-bar week-bar"><span style="width:${Math.min(100, Math.round((done / goal) * 100))}%"></span></div>
  </section>`;
}

// ---------- Sugerencia del día ----------
// Cada semana (lunes a domingo) hay que completar las rutinas de tu plan (Ajustes → Tu plan).
// Cuando están todas, se sugiere uno de tus extras.
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}
const routinesOf = (s) => (s.routine === 'combo' ? s.types || [] : [s.routine]);
function weekPlan() {
  const from = dateStr(mondayOf(new Date()));
  const gym = sessionsSorted().filter((s) => s.type === 'gym' && s.routine && s.routine !== 'free'); // de más nueva a más vieja
  const thisWeek = gym.filter((s) => s.date >= from);
  const required = weekRequired();
  const needs = new Set(required);

  // qué cuenta cada sesión de la semana: Torso vale Push + Pull en un plan PPL; Push o Pull valen Torso en un plan Torso/Piernas
  const credit = {};
  const add = (k) => { credit[k] = (credit[k] || 0) + 1; };
  for (const s of thisWeek) for (const k of routinesOf(s)) {
    if (k === 'upper' && !needs.has('upper') && (needs.has('push') || needs.has('pull'))) { add('push'); add('pull'); }
    else if ((k === 'push' || k === 'pull') && !needs.has(k) && needs.has('upper')) add('upper');
    else add(k);
  }
  const left = { ...credit }, missing = [];
  for (const k of required) { if (left[k] > 0) left[k]--; else missing.push(k); }

  const last = gym[0];
  const lastKeys = last ? routinesOf(last) : [];
  let next, reason;
  if (missing.length) {
    // de lo que falta, seguir el orden del plan a partir de la última rutina hecha
    const lastIdx = required.indexOf(lastKeys.find((k) => needs.has(k)));
    const order = required.map((_, i) => required[(lastIdx + 1 + i) % required.length]);
    next = order.find((k) => missing.includes(k));
    reason = missing.length === 1 ? 'Es lo último que falta esta semana'
      : !thisWeek.length ? 'Arrancá la semana'
      : `Faltan ${missing.length} para completar la semana`;
  } else {
    // semana completa: el extra que no hiciste esta semana y que hace más tiempo que no hacés
    let extras = profile().extras.filter((k) => ROUTINES[k] && !needs.has(k));
    if (!extras.length) extras = ['full', 'cali', 'plyo'].filter((k) => !needs.has(k));
    const lastDone = (k) => gym.find((s) => routinesOf(s).includes(k))?.date || '0000';
    const notThisWeek = extras.filter((k) => !thisWeek.some((s) => routinesOf(s).includes(k)));
    next = [...(notThisWeek.length ? notThisWeek : extras)].sort((a, b) => lastDone(a).localeCompare(lastDone(b)))[0];
    reason = '¡Semana completa! Sumá un extra';
  }
  return { next, reason, required, missing, last };
}
function suggestionCard() {
  const today = todayStr();
  const { next, reason, last } = weekPlan();
  const r = ROUTINES[next];
  const mins = estimateMinutes(generate(next));
  const doneToday = last && last.date === today;
  const ago = last ? daysBetween(last.date, today) : null;
  const lastTxt = !last ? '' : ago === 0 ? `Hoy hiciste ${last.title} ✓` : ago === 1 ? `Último: ${last.title} ayer` : `Último: ${last.title} hace ${ago} días`;
  return `<div class="card suggest">
    <div class="muted small">Sugerencia${doneToday ? ' para la próxima' : ''}</div>
    <div class="suggest-name">${esc(r.name)}</div>
    <div class="muted small">${esc(reason)}${lastTxt ? ' · ' + esc(lastTxt) : ''} · ~${mins} min</div>
    <div class="suggest-actions">
      <button class="btn primary" data-action="preview" data-r="${next}">Empezar</button>
      <button class="btn ghost-line" data-action="goto-routines">Elegir otra</button>
    </div>
  </div>`;
}
// ---------- Suplementos ----------
const takenOn = (date) => state.intake[date] || [];
const isTaken = (id, date) => takenOn(date).includes(id);
function allTaken(date) {
  return state.supplements.length > 0 && state.supplements.every((s) => isTaken(s.id, date));
}
function toggleTaken(id, date) {
  const list = takenOn(date).filter((x) => x !== id);
  if (!isTaken(id, date)) list.push(id);
  if (list.length) state.intake[date] = list; else delete state.intake[date];
  save();
  return list.includes(id);
}
function suppStreak() {
  const d = new Date();
  if (!allTaken(dateStr(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (allTaken(dateStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function suppButtons(date) {
  return state.supplements.map((s) => `
    <button class="supp ${isTaken(s.id, date) ? 'on' : ''}" data-action="take" data-id="${esc(s.id)}" data-d="${date}">
      <span class="sc">✓</span>
      <span class="grow"><b>${esc(s.name)}</b>${s.dose ? ` <span class="muted small">${esc(s.dose)}</span>` : ''}</span>
      ${s.time ? `<span class="muted small">${esc(s.time)}</span>` : ''}
    </button>`).join('');
}

// ---------- Recordatorios (notificaciones push) ----------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let pushBusy = false;

async function pushPost(path, body) {
  const res = await fetch(PUSH_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
function pushPayload() {
  const date = todayStr();
  const m = state.membership;
  return {
    id: state.push.deviceId,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    supplements: state.supplements,
    date, taken: takenOn(date),
    membership: m ? { due: membershipDue(m), hour: m.hour || '09:00' } : null,
  };
}
function syncPush() {
  if (!state.push.enabled) return;
  pushPost('/sync', pushPayload()).catch((e) => {
    if (/no registrado/.test(e.message)) { state.push.enabled = false; save(); }
  });
}
function b64ToBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
async function enablePush() {
  if (pushBusy) return;
  pushBusy = true;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Sin permiso para notificaciones'); return; }
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await (await fetch(PUSH_API + '/vapid')).json();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    // identificador aleatorio e imposible de adivinar (solo lo conoce este celular)
    state.push.deviceId ||= crypto.randomUUID ? crypto.randomUUID() : uid() + uid();
    await pushPost('/subscribe', { ...pushPayload(), subscription: sub.toJSON() });
    state.push.enabled = true; save();
    toast('🔔 Recordatorios activados');
  } catch (e) {
    toast('No se pudo activar: ' + e.message);
  } finally {
    pushBusy = false; render();
  }
}
async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (state.push.deviceId) await pushPost('/unsubscribe', { id: state.push.deviceId });
  } catch (e) { /* si falla igual lo desactivamos aquí */ }
  state.push.enabled = false; save(); render();
  toast('Recordatorios desactivados');
}
function pushSection() {
  let body;
  if (!pushSupported() || (isIOS && !isStandalone())) {
    body = isIOS
      ? `<p class="small" style="margin:0">Para recibir recordatorios en iPhone, primero instalá la app: en Safari tocá <b>Compartir</b> → <b>Agregar a inicio</b>, y abrila desde ese ícono.</p>`
      : `<p class="small" style="margin:0">Este navegador no permite notificaciones. Probá con Chrome.</p>`;
  } else if (state.push.enabled) {
    body = `<div class="setting-row"><span>🔔 Activados en este celular</span></div>
      <div style="display:grid;gap:8px;margin-top:12px">
        <button class="btn" data-action="push-test">Enviar notificación de prueba</button>
        <button class="btn danger" data-action="push-off">Desactivar</button>
      </div>`;
  } else {
    body = `<p class="small muted" style="margin:0 0 12px">Te avisamos a la hora de cada suplemento si todavía no lo marcaste, y una vez más 2 horas después.</p>
      <button class="btn primary wide" data-action="push-on">Activar recordatorios</button>`;
  }
  return `<h2 class="section">Recordatorios de suplementos</h2><div class="card">${body}</div>`;
}

// ---------- Membresía del gym ----------
// state.membership = { lastPaid: 'YYYY-MM-DD', hour: 'HH:MM', history: ['YYYY-MM-DD', …] }
// Vence un mes después del último pago (31 ene → 28/29 feb).
function addOneMonth(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const last = new Date(y, m + 1, 0).getDate(); // último día del mes siguiente
  return dateStr(new Date(y, m, Math.min(d, last)));
}
const membershipDue = (m) => addOneMonth(m.lastPaid);
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
function membershipStatus() {
  const m = state.membership;
  if (!m) return null;
  const due = membershipDue(m);
  const left = daysBetween(todayStr(), due); // días que faltan (negativo = vencida)
  const total = daysBetween(m.lastPaid, due);
  return { due, left, isDue: left <= 0, progress: Math.min(1, Math.max(0, 1 - left / total)) };
}
const fmtDay = (ds) => parseDate(ds).toLocaleDateString('es', { day: 'numeric', month: 'long' });

function membershipCard() {
  const st = membershipStatus();
  if (!st) return `<button class="btn ghost wide" data-action="edit-membership">+ Registrar pago de la membresía</button>`;
  const label = st.left > 1 ? `Faltan ${st.left} días`
    : st.left === 1 ? 'Vence mañana'
    : st.left === 0 ? 'Vence hoy'
    : `Vencida hace ${-st.left} ${st.left === -1 ? 'día' : 'días'}`;
  const tone = st.isDue ? 'due' : st.left <= 3 ? 'soon' : 'ok';
  return `<div class="card membership ${tone}" id="membership">
    <div class="mem-head">
      <div><div class="muted small">Próximo pago</div><b class="mem-date">${esc(fmtDay(st.due))}</b></div>
      <span class="mem-pill">${label}</span>
    </div>
    <div class="set-bar mem-bar"><span style="width:${Math.round(st.progress * 100)}%"></span></div>
    <div class="muted small" style="margin:8px 0 12px">Último pago: ${esc(fmtDay(state.membership.lastPaid))}</div>
    ${st.isDue
      ? '<button class="btn primary wide" data-action="mem-paid">✓ Pagado</button>'
      : `<button class="btn wide" disabled>✓ Pagado · se activa el ${esc(fmtDay(st.due))}</button>`}
    ${!state.push.enabled ? '<p class="muted small" style="margin:10px 0 0">🔔 Activá los recordatorios en Ajustes para recibir el aviso de vencimiento.</p>' : ''}
  </div>`;
}

function membershipSheet() {
  const m = state.membership || { lastPaid: todayStr(), hour: '09:00', history: [] };
  const hist = [...(m.history || [])].reverse().slice(0, 12);
  openSheet(`
    <h2>Membresía del gym</h2>
    <div class="sub">Cargá la fecha de tu último pago. Vence un mes después y te avisamos ese día.</div>
    <label class="field"><span>Fecha del último pago</span>
      <input class="input" type="date" id="mem-date" value="${esc(m.lastPaid)}" max="${todayStr()}"></label>
    <label class="field"><span>Hora del aviso</span>
      <input class="input" type="time" id="mem-hour" value="${esc(m.hour || '09:00')}"></label>
    ${hist.length ? `<h2 class="section">Pagos registrados</h2>
      <div class="card" style="background:var(--surface-2)">${hist.map((d) => `<div class="plan-item"><span>${esc(fmtLongDate(d))}</span><span class="tgt">✓</span></div>`).join('')}</div>` : ''}
    ${state.membership ? '<button class="btn danger wide" data-action="mem-remove" style="margin-top:8px">Quitar membresía</button>' : ''}
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cancelar</button>
      <button class="btn primary" data-action="mem-save">Guardar</button>
    </div>
  `);
}

// ---------- Elegir otra rutina ----------
function routinePickerSheet() {
  const suggested = weekPlan().next;
  openSheet(`
    <h2>Elegir rutina</h2>
    <div class="sub">Tocá una para ver los ejercicios antes de empezar</div>
    <div class="routine-grid">
      ${Object.entries(ROUTINES).map(([k, r]) => `
        <button class="routine ${r.combo ? 'combo' : ''} ${k === suggested ? 'suggested' : ''}" data-action="preview" data-r="${k}">
          ${k === suggested ? '<em class="sug-badge">Sugerida</em>' : ''}
          <strong>${r.combo ? '🔀 ' : ''}${esc(r.name)}</strong><span>${esc(r.desc)}</span>
        </button>`).join('')}
    </div>
  `);
}

// ---------- Deporte con estadísticas (el que elegiste en Tu plan → Tu deporte) ----------
let sportFilter = 'Todos';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtNum = (n, dec = 2) => (Number.isFinite(n) ? n.toFixed(dec).replace(/\.?0+$/, '') : '0');
const avg = (n, d) => (d ? fmtNum(n / d) : '0');
const RESULTS = { W: 'Ganado', D: 'Empate', L: 'Perdido' };
const fmtPace = (p) => (p ? `${Math.floor(p)}:${pad(Math.round((p % 1) * 60) % 60)}` : '—');

// Sesiones del deporte seguido que tienen estadísticas cargadas
function sportSessions(cat = 'Todos') {
  const sp = trackedSport();
  if (!sp) return [];
  return sessionsSorted().filter((s) => s.type === 'activity' && s.sport === sp && s.stats && (cat === 'Todos' || s.category === cat));
}
function sportTotals(list) {
  const t = tracker(), sum = {};
  for (const f of t.fields) sum[f.k] = list.reduce((n, s) => n + (num(s.stats[f.k]) || 0), 0);
  const combo = t.combo ? t.combo.keys.reduce((n, k) => n + sum[k], 0) : null;
  const res = { W: 0, D: 0, L: 0 };
  list.forEach((s) => { if (s.result in res) res[s.result]++; });
  const decided = res.W + res.D + res.L;
  // ritmo y velocidad: solo sesiones con distancia en km y duración
  const timed = list.filter((s) => num(s.minutes) > 0 && num(s.stats.km) > 0);
  const km = timed.reduce((n, s) => n + num(s.stats.km), 0), min = timed.reduce((n, s) => n + num(s.minutes), 0);
  const totalMin = list.reduce((n, s) => n + (num(s.minutes) || 0), 0);
  return { n: list.length, sum, combo, res, decided, totalMin, pace: km ? min / km : null, speed: min ? km / (min / 60) : null };
}
// Texto corto con las estadísticas de una sesión (historial, calendario)
function sessionStatsText(s, withCategory = true) {
  const t = SPORT_TRACKERS[s.sport];
  if (!t || !s.stats) return '';
  const parts = t.fields.map((f) => (f.type === 'number' ? `${fmtNum(num(s.stats[f.k]))} ${f.unit}` : `${f.icon} ${s.stats[f.k] || 0} ${f.short}`));
  if (RESULTS[s.result]) parts.push(RESULTS[s.result]);
  if (withCategory && s.category) parts.push(s.category);
  return parts.join(' · ');
}

function sportCard() {
  const t = tracker(), sp = trackedSport();
  if (!t) return '';
  const tot = sportTotals(sportSessions());
  if (!tot.n) return `<button class="btn ghost wide fut-empty" data-action="log-activity" data-sport="${esc(sp)}">${t.icon} Registrá tu primer ${t.unit} para ver tus stats</button>`;
  const big = t.fields.slice(0, 2).map((f) => (f.type === 'number' ? [fmtNum(tot.sum[f.k], 1), `${f.unit} en total`] : [tot.sum[f.k], f.label.toLowerCase()]));
  const p = t.fields[0];
  if (t.combo) big.push([avg(tot.combo, tot.n), `${t.combo.label} por ${t.unit}`]);
  else if (t.pace) big.push([fmtPace(tot.pace), 'ritmo (min/km)']);
  else if (t.speed) big.push([tot.speed ? fmtNum(tot.speed, 1) : '—', 'km/h promedio']);
  else if (p.type === 'count') big.push([avg(tot.sum[p.k], tot.n), `${p.short} por ${t.unit}`]);
  if (big.length < 3) big.unshift(tot.totalMin ? [fmtNum(tot.totalMin / 60, 1), 'horas en total'] : [tot.n, t.units]);
  return `<div class="card fut-card">
    <div class="fut-head"><b>${t.icon} Mis stats</b><span class="muted small">${tot.n} ${tot.n === 1 ? t.unit : t.units}</span></div>
    <div class="fut-nums">${big.slice(0, 3).map(([v, l]) => `<div><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <div class="suggest-actions">
      <button class="btn" data-action="sport-stats">Ver stats</button>
      <button class="btn sport" data-action="log-activity" data-sport="${esc(sp)}">+ ${cap(t.unit)}</button>
    </div>
  </div>`;
}

function sportStatsSheet() {
  const t = tracker(), sp = trackedSport();
  if (!t) return;
  const list = sportSessions(sportFilter), tot = sportTotals(list);
  const p = t.fields[0];
  const cats = sportCategories();
  const tiles = [[tot.n, t.units]];
  for (const f of t.fields) tiles.push(f.type === 'number' ? [fmtNum(tot.sum[f.k], 1), `${f.unit} en total`] : [tot.sum[f.k], f.label.toLowerCase()]);
  if (t.combo) tiles.push([tot.combo, t.combo.label]);
  for (const f of t.fields) tiles.push([f.type === 'number' ? fmtNum(tot.sum[f.k] / (tot.n || 1), 1) : avg(tot.sum[f.k], tot.n), `${f.type === 'number' ? f.unit : f.label.toLowerCase()} por ${t.unit}`]);
  if (t.combo) tiles.push([avg(tot.combo, tot.n), `${t.combo.label} por ${t.unit}`]);
  if (t.pace) tiles.push([fmtPace(tot.pace), 'ritmo (min/km)']);
  if (t.speed) tiles.push([tot.speed ? fmtNum(tot.speed, 1) : '—', 'km/h promedio']);
  if (t.result && tot.decided) {
    tiles.push([`${Math.round((tot.res.W / tot.decided) * 100)}%`, 'victorias']);
    tiles.push([t.draw ? `${tot.res.W}-${tot.res.D}-${tot.res.L}` : `${tot.res.W}-${tot.res.L}`, t.draw ? 'G - E - P' : 'G - P']);
  }
  if (p.type === 'count') {
    let streak = 0; for (const s of list) { if (num(s.stats[p.k]) > 0) streak++; else break; }
    const withIt = list.filter((s) => num(s.stats[p.k]) > 0).length;
    tiles.push([`${tot.n ? Math.round((withIt / tot.n) * 100) : 0}%`, `${t.units} con ${p.label.toLowerCase()}`]);
    tiles.push([streak, `racha con ${p.label.toLowerCase()}`]);
  }
  const score = (s) => (t.combo ? t.combo.keys.reduce((n, k) => n + num(s.stats[k]), 0) : num(s.stats[p.k]));
  const best = [...list].sort((a, b) => score(b) - score(a))[0];
  const byCat = cats.map((c) => ({ c, ...sportTotals(sportSessions(c)) })).filter((r) => r.n);
  const lastCol = t.combo ? `${t.combo.label}/${t.unit[0].toUpperCase()}` : t.result ? '% G' : `${p.short}/${t.unit[0].toUpperCase()}`;
  const lastVal = (r) => (t.combo ? avg(r.combo, r.n) : t.result ? (r.decided ? Math.round((r.res.W / r.decided) * 100) + '%' : '—') : avg(r.sum[p.k], r.n));
  const shownFields = t.fields.slice(0, 2);
  openSheet(`
    <h2>${t.icon} Mis stats de ${esc(sp.toLowerCase())}</h2>
    ${cats.length ? `<div class="chips fut-filter">${['Todos', ...cats].map((k) => `<button class="chip ${sportFilter === k ? 'on' : ''}" data-action="sport-filter" data-v="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}
    ${!tot.n ? `<div class="empty">Todavía no hay ${t.units}${sportFilter === 'Todos' ? '' : ' en ' + esc(sportFilter)}.</div>` : `
    <div class="fut-grid">${tiles.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>
    ${best && score(best) > 0 ? `<h2 class="section">🏆 Mejor ${t.unit}</h2>
      <div class="card fut-best"><b>${esc(sessionStatsText(best, false))}</b>
        <div class="muted small">${esc(best.category || '')}${best.category ? ' · ' : ''}${esc(fmtLongDate(best.date))}</div></div>` : ''}
    ${sportFilter === 'Todos' && byCat.length > 1 ? `<h2 class="section">Por ${esc(t.category.toLowerCase())}</h2>
      <div class="card fut-table">
        <div class="fut-tr hdr"><span>${esc(t.category)}</span><span>PJ</span>${shownFields.map((f) => `<span>${esc(f.short)}</span>`).join('')}${shownFields.length < 2 ? '<span></span>' : ''}<span>${esc(lastCol)}</span></div>
        ${byCat.map((r) => `<div class="fut-tr"><span>${esc(r.c)}</span><span>${r.n}</span>${shownFields.map((f) => `<span>${f.type === 'number' ? fmtNum(r.sum[f.k], 1) : r.sum[f.k]}</span>`).join('')}${shownFields.length < 2 ? '<span></span>' : ''}<span>${lastVal(r)}</span></div>`).join('')}
      </div>` : ''}
    <h2 class="section">Últimos ${t.units}</h2>
    <div class="card fut-table">
      ${list.slice(0, 8).map((s) => `<button class="fut-match" data-action="day" data-d="${s.date}">
        <span><b>${esc(s.category || cap(t.unit))}</b><span class="muted small"> · ${esc(fmtShortDate(s.date))}</span></span>
        <span class="fut-ga">${esc(sessionStatsText(s, false))}</span></button>`).join('')}
    </div>`}
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cerrar</button>
      <button class="btn sport" data-action="log-activity" data-sport="${esc(sp)}">+ ${cap(t.unit)}</button>
    </div>
  `);
}

// ---------- Cuestionario: tu plan de entrenamiento ----------
let planDraft = null, planStep = 0, planFirstRun = false;
const PLAN_STEPS = ['Objetivo', 'Nivel', 'Estilo de rutina', 'Tu semana', 'Tu deporte'];

function planSummary(p = profile()) {
  const req = (SPLITS[p.split]?.week ? SPLITS[p.split].week(p.days) : p.custom).map((k) => ROUTINES[k]?.name).filter(Boolean);
  return { split: SPLITS[p.split]?.name, week: req.join(' · '), goal: GOALS[p.goal]?.name, level: LEVELS[p.level]?.name };
}
function planOption(field, key, name, desc) {
  const on = planDraft[field] === key;
  return `<button class="plan-opt ${on ? 'on' : ''}" data-action="plan-pick" data-f="${field}" data-v="${key}">
    <span class="po-check">${on ? '✓' : ''}</span>
    <span class="grow"><b>${esc(name)}</b><span class="muted small">${esc(desc)}</span></span>
  </button>`;
}
function planChips(field, keys) {
  return `<div class="chips">${keys.map((k) => `<button class="chip ${planDraft[field].includes(k) ? 'on' : ''}" data-action="plan-toggle" data-f="${field}" data-v="${k}">${esc(ROUTINES[k].name)}</button>`).join('')}</div>`;
}
function planSheet() {
  const d = planDraft, step = planStep;
  let body = '';
  if (step === 0) {
    body = `<p class="sub">¿Qué querés lograr con tu entrenamiento?</p>
      ${Object.entries(GOALS).map(([k, g]) => planOption('goal', k, g.name, g.desc)).join('')}`;
  } else if (step === 1) {
    body = `<p class="sub">¿Cuánta experiencia tenés entrenando?</p>
      ${Object.entries(LEVELS).map(([k, l]) => planOption('level', k, l.name, l.desc)).join('')}
      <p class="muted small">Si sos principiante, no te armamos ejercicios avanzados (muscle-up, pistol, saltos en profundidad…). Igual podés agregarlos a mano.</p>`;
  } else if (step === 2) {
    body = `<p class="sub">¿Cómo organizás tu semana?</p>
      ${Object.entries(SPLITS).map(([k, s]) => planOption('split', k, s.name, s.desc)).join('')}
      ${d.split === 'custom' ? `<h2 class="section">Rutinas de tu semana</h2>${planChips('custom', COMBINABLE)}` : ''}`;
  } else if (step === 4) {
    const t = SPORT_TRACKERS[d.sport];
    body = `<p class="sub">¿Practicás un deporte del que quieras llevar estadísticas?</p>
      ${Object.entries(SPORT_TRACKERS).map(([name, tr]) => planOption('sport', name, `${tr.icon} ${name}`, tr.fields.map((f) => f.label).join(', ') + (tr.result ? ', resultado' : '') + (tr.pace ? ', ritmo' : '') + (tr.speed ? ', velocidad' : ''))).join('')}
      ${planOption('sport', '', 'Ninguno', 'Solo registro actividades sin estadísticas')}
      ${t ? `<h2 class="section">Tus ${esc(t.category.toLowerCase())}s</h2>
        <p class="muted small" style="margin:-4px 0 10px">${t.category === 'Torneo' ? 'Agregá los torneos o ligas en los que jugás' : `Agregá tus ${esc(t.category.toLowerCase())}s`}, así podés ver tus stats por cada uno.</p>
        <div class="chips cat-chips">${d.categories.map((c, i) => `<span class="chip cat-chip">${esc(c)}<button data-action="plan-cat-del" data-i="${i}" aria-label="Quitar ${esc(c)}">×</button></span>`).join('') || '<span class="muted small">Todavía no agregaste ninguno</span>'}</div>
        <div class="cat-add"><input class="input" id="plan-cat" maxlength="24" placeholder="${t.category === 'Torneo' ? 'Ej: Liga del barrio' : 'Nombre'}"><button class="btn" data-action="plan-cat-add">Agregar</button></div>` : ''}`;
  } else {
    const req = SPLITS[d.split].week ? SPLITS[d.split].week(d.days) : d.custom;
    const extraKeys = EXTRA_OPTIONS.filter((k) => !req.includes(k));
    body = `<p class="sub">¿Cuántos días por semana entrenás?</p>
      <div class="seg days-seg">${[2, 3, 4, 5, 6, 7].map((n) => `<button class="chip ${d.days === n ? 'on' : ''}" data-action="plan-pick" data-f="days" data-v="${n}">${n}</button>`).join('')}</div>
      <div class="card plan-week">
        <div class="muted small">Cada semana vas a completar</div>
        <b>${esc(req.map((k) => ROUTINES[k]?.name).join(' · ') || '—')}</b>
        ${req.length > d.days ? `<div class="small" style="color:#ffbe46;margin-top:6px">Tu estilo tiene ${req.length} rutinas y elegiste ${d.days} días: vas a necesitar más días o combinar rutinas.</div>` : ''}
      </div>
      <h2 class="section">Extras cuando completás la semana</h2>
      ${planChips('extras', extraKeys)}`;
  }
  const last = step === PLAN_STEPS.length - 1;
  openSheet(`
    <div class="plan-steps">${PLAN_STEPS.map((s, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
    <div class="muted small">Paso ${step + 1} de ${PLAN_STEPS.length}</div>
    <h2>${planFirstRun && step === 0 ? 'Armemos tu plan' : esc(PLAN_STEPS[step])}</h2>
    ${body}
    <div class="sheet-actions">
      ${step > 0 ? '<button class="btn" data-action="plan-step" data-dir="-1">Atrás</button>'
        : `<button class="btn" data-action="${planFirstRun ? 'plan-skip' : 'close-sheet'}">${planFirstRun ? 'Ahora no' : 'Cancelar'}</button>`}
      <button class="btn primary" data-action="${last ? 'plan-save' : 'plan-step'}" data-dir="1">${last ? 'Guardar plan' : 'Siguiente'}</button>
    </div>
  `);
}
function openPlan(firstRun = false) {
  planDraft = JSON.parse(JSON.stringify(profile()));
  if (planDraft.sport === null) planDraft.sport = '';
  if (planDraft.sport && !planDraft.categories.length) planDraft.categories = [...(SPORT_TRACKERS[planDraft.sport]?.categories || [])];
  planStep = 0; planFirstRun = firstRun;
  planSheet();
}

// Al tocar una notificación se abre la app con ?take=ids (suplementos) o ?membership=1
function handleTakeLink() {
  const params = new URLSearchParams(location.search);
  if (params.get('membership')) {
    history.replaceState(null, '', location.pathname);
    view = 'home';
    setTimeout(() => { $('#membership')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('💳 Tu membresía del gym venció'); }, 400);
    return;
  }
  const ids = params.get('take');
  if (!ids) return;
  const today = todayStr();
  const valid = ids.split(',').filter((id) => state.supplements.some((s) => s.id === id));
  valid.forEach((id) => { if (!isTaken(id, today)) toggleTaken(id, today); });
  history.replaceState(null, '', location.pathname);
  if (valid.length) setTimeout(() => toast('✅ Marcado como tomado'), 300);
}

function sessionSummary(s) {
  if (s.type === 'activity') {
    const st = sessionStatsText(s);
    return [st, s.minutes ? `${s.minutes} min` : '', !st && s.intensity ? `intensidad ${s.intensity}` : ''].filter(Boolean).join(' · ');
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
  const recent = sessionsSorted().slice(0, 5);
  return `
    <header class="home-head">
      <div class="eyebrow">${esc(fmtLongDate(today))} · ${greeting()}</div>
    </header>
    ${weekStreakBlock()}
    ${suggestionCard()}
    <div class="stats">
      <div class="stat"><b>${weekStreak()}</b><span>semanas con objetivo</span></div>
      <div class="stat"><b>${monthCount()}</b><span>días este mes</span></div>
      <div class="stat"><b>${state.sessions.length}</b><span>sesiones</span></div>
    </div>
    <h2 class="section section-row"><span>Suplementos de hoy</span><button class="link" data-action="edit-supps">Editar</button></h2>
    ${state.supplements.length ? `<div class="card supps">
      ${suppButtons(today)}
      ${suppStreak() ? `<div class="muted small supp-streak">🔥 ${suppStreak()} ${suppStreak() === 1 ? 'día' : 'días'} seguidos tomando todo</div>` : ''}
    </div>` : '<button class="btn ghost wide" data-action="edit-supps">+ Agregar suplementos</button>'}
    <h2 class="section section-row"><span>Membresía del gym</span>${state.membership ? '<button class="link" data-action="edit-membership">Editar</button>' : ''}</h2>
    ${membershipCard()}
    <h2 class="section">Deportes y actividad</h2>
    <div class="home-actions">
      <button class="btn sport wide" data-action="log-activity">+ Registrar deporte o actividad</button>
    </div>
    ${trackedSport() ? `<h2 class="section">${esc(trackedSport())}</h2>${sportCard()}` : ''}
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

function warmupView() {
  const a = state.active, w = a.warmup;
  const done = w.steps.filter((s) => s.done).length;
  const mins = Math.round(w.steps.reduce((m, s) => m + (s.dur ? s.dur / 60 : s.ramp ? 3 : 0.75), 0));
  return `
    <header class="wk-head">
      <div><div class="eyebrow">Calentamiento · ~${mins} min</div><h1>${esc(a.title)}</h1></div>
      <div class="elapsed" id="elapsed">${fmtClock(Date.now() - a.start)}</div>
    </header>
    <p class="muted small" style="margin:-6px 0 14px">Subí la temperatura, mové las articulaciones que vas a usar y activá los músculos. Marcá cada paso al terminarlo.</p>
    <div class="card wu-list">
      ${w.steps.map((s, i) => {
        const running = w.timer && w.timer.i === i;
        return `<div class="wu-step ${s.done ? 'on' : ''} ${s.ramp ? 'ramp' : ''}">
          <button class="wu-check" data-action="wu-toggle" data-i="${i}" aria-label="Marcar paso"><span class="sc">✓</span></button>
          <div class="grow">
            <div class="wu-name">${s.ramp ? howtoBtn(s.ramp, s.name) : esc(s.name)}</div>
            <div class="muted small">${esc(s.reps || '')}${s.tip ? `${s.reps ? ' · ' : ''}${esc(s.tip)}` : ''}</div>
          </div>
          ${s.dur && !s.done ? `<button class="wu-timer ${running ? 'run' : ''}" data-action="wu-timer" data-i="${i}" id="wu-t-${i}">
            ${running ? fmtClock(w.timer.until - Date.now()) : '▶ ' + fmtClock(s.dur * 1000)}</button>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="wu-progress"><span style="width:${Math.round((done / w.steps.length) * 100)}%"></span></div>
    <div class="wk-actions">
      <button class="btn" data-action="wu-skip">Saltar</button>
      <button class="btn primary" data-action="wu-finish">${done === w.steps.length ? '¡Listo! Empezar rutina' : 'Empezar rutina →'}</button>
    </div>
    <div style="margin-top:12px"><button class="btn danger wide" data-action="cancel-wk">Descartar entrenamiento</button></div>
  `;
}

function workoutView() {
  const a = state.active;
  if (a.warmup) return warmupView();
  return `
    <header class="wk-head">
      <div><div class="eyebrow">Entrenando</div><h1>${esc(a.title)}</h1></div>
      <div class="elapsed" id="elapsed">${fmtClock(Date.now() - a.start)}</div>
    </header>
    ${a.exercises.map((e, i) => {
      const last = lastFor(e.exId);
      const total = e.sets.length, done = e.sets.filter((s) => s.done).length;
      const complete = total > 0 && done === total;
      const collapsed = complete && !e.expanded;
      const progress = `
        <div class="set-progress">
          <span class="set-count ${complete ? 'full' : ''}">${complete ? '✓ Completado' : `${done}/${total} series`}</span>
          <div class="set-bar"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></div>
        </div>`;
      if (collapsed) {
        return `<section class="card ex-card complete">
          <div class="ex-head" style="margin-bottom:6px">
            <div><h3>${exById(e.exId) ? howtoBtn(e.exId, e.name) : esc(e.name)}</h3>
              <div class="muted small">${esc(fmtSets(e.sets))}</div></div>
          </div>
          ${progress}
          <div class="row-btns">
            <button class="btn small ghost" data-action="ex-expand" data-i="${i}">Ver series</button>
            <button class="btn small ghost" data-action="undo-set" data-i="${i}">↶ Deshacer última serie</button>
          </div>
        </section>`;
      }
      return `<section class="card ex-card ${complete ? 'complete' : ''}">
        <div class="ex-head">
          <div><h3>${exById(e.exId) ? howtoBtn(e.exId, e.name) : esc(e.name)}</h3>
            <div class="muted small">${esc(MUSCLES[e.muscle] || '')} · objetivo ${esc(e.target)}</div>
            ${last ? `<div class="last">Última vez: ${esc(fmtSets(last))}</div>` : ''}</div>
          <div class="ex-menu">
            <button class="icon-btn" data-action="swap-ex" data-i="${i}" aria-label="Cambiar ejercicio">⇄</button>
            <button class="icon-btn" data-action="del-ex" data-i="${i}" aria-label="Quitar ejercicio">✕</button>
          </div>
        </div>
        ${progress}
        <div class="set-row hdr"><span>Serie</span><span>kg</span><span>Reps</span><span></span></div>
        ${e.sets.map((s, j) => `
          <div class="set-row ${s.done ? 'done' : ''}">
            <span class="set-n">${j + 1}</span>
            <input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${esc(placeholder(last, j, 'w', e.target)) || '—'}" aria-label="Peso serie ${j + 1}">
            <input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${esc(placeholder(last, j, 'r', e.target))}" aria-label="Repeticiones serie ${j + 1}">
            <button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-label="${s.done ? 'Desmarcar' : 'Marcar'} serie ${j + 1}">✓</button>
          </div>`).join('')}
        <div class="row-btns">
          ${!complete ? `<button class="btn small next-set" data-action="next-set" data-i="${i}">✓ Serie ${done + 1} hecha</button>` : ''}
          <button class="btn small ghost" data-action="add-set" data-i="${i}">+ Serie</button>
          ${e.sets.length > 1 ? `<button class="btn small ghost" data-action="del-set" data-i="${i}">− Serie</button>` : ''}
          ${complete ? `<button class="btn small ghost" data-action="ex-collapse" data-i="${i}">Ocultar</button>` : ''}
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
    const gym = list.some((s) => s.type === 'gym'), act = list.some((s) => s.type === 'activity'), sup = allTaken(ds);
    cells += `<button class="cal-day ${list.length ? 'active' : ''} ${ds === today ? 'today' : ''}" data-action="day" data-d="${ds}">
      <span>${d}</span><span class="dots">${gym ? '<i></i>' : ''}${act ? '<i class="act"></i>' : ''}${sup ? '<i class="sup"></i>' : ''}</span></button>`;
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
    <div class="legend"><span><i></i>Gym</span><span><i class="act"></i>Deporte</span><span><i class="sup"></i>Suplementos</span></div>
    <h2 class="section">Este mes</h2>
    <div class="card"><b>${activeCount}</b> <span class="muted">días activos de ${daysIn}</span></div>
  `;
}

function settingsView() {
  const r = state.settings.rest;
  return `
    <header><h1>Ajustes</h1></header>
    <h2 class="section section-row"><span>Tu plan de entrenamiento</span><button class="link" data-action="plan-open">${state.profile ? 'Editar' : 'Armar'}</button></h2>
    ${(() => {
      if (!state.profile) return `<button class="btn ghost wide" data-action="plan-open">+ Armar tu plan (objetivo, nivel, estilo y días)</button>`;
      const s = planSummary();
      return `<button class="card plan-card" data-action="plan-open">
        <div class="plan-row"><span class="muted small">Estilo</span><b>${esc(s.split)}</b></div>
        <div class="plan-row"><span class="muted small">Tu semana</span><b>${esc(s.week)}</b></div>
        <div class="plan-row"><span class="muted small">Días</span><b>${state.profile.days} por semana</b></div>
        <div class="plan-row"><span class="muted small">Objetivo</span><b>${esc(s.goal)}</b></div>
        <div class="plan-row"><span class="muted small">Nivel</span><b>${esc(s.level)}</b></div>
        <div class="plan-row"><span class="muted small">Deporte</span><b>${trackedSport() ? `${tracker().icon} ${esc(trackedSport())}${sportCategories().length ? ' · ' + esc(sportCategories().join(', ')) : ''}` : 'Ninguno'}</b></div>
      </button>`;
    })()}
    <h2 class="section">Entrenamiento</h2>
    <div class="card setting-row">
      <span>Descanso entre series</span>
      <select class="input" style="width:auto" data-setting="rest">
        ${[0, 45, 60, 90, 120, 150, 180, 240].map((s) => `<option value="${s}" ${s === r ? 'selected' : ''}>${s ? fmtClock(s * 1000) : 'Sin timer'}</option>`).join('')}
      </select>
    </div>
    ${pushSection()}
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

// ---------- Ayuda visual (globito al tocar un ejercicio) ----------
const howtoBtn = (id, name) =>
  `<button class="ex-name" data-action="howto" data-id="${esc(id)}">${esc(name)} <span class="info" aria-hidden="true">ⓘ</span></button>`;
let howtoOpen = null;

function hideHowTo() {
  $('#howto').hidden = true;
  howtoOpen = null;
}
function showHowTo(id, anchor) {
  const e = exById(id);
  if (!e) return;
  const box = $('#howto');
  const img = e.img ? `img/ex/${encodeURIComponent(e.img)}/` : '';
  box.innerHTML = `
    <div class="howto-head">
      <div><b>${esc(e.name)}</b><div class="muted small">${esc(MUSCLES[e.muscle] || '')} · ${e.sets}×${esc(e.reps)}</div></div>
      <button class="icon-btn" data-action="howto-close" aria-label="Cerrar">✕</button>
    </div>
    ${img ? `<div class="howto-img"><img src="${img}0.jpg" alt="Posición inicial"><img class="b" src="${img}1.jpg" alt="Posición final"></div>` : ''}
    <ul class="howto-tips">${(e.tips || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  box.hidden = false;
  howtoOpen = id;

  // ubicarlo debajo del nombre (o arriba si no entra)
  const r = anchor.getBoundingClientRect();
  const w = Math.min(340, window.innerWidth - 32);
  box.style.width = w + 'px';
  box.style.left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + 'px';
  const h = box.offsetHeight;
  const below = r.bottom + 8, above = r.top - h - 8;
  box.style.top = (below + h <= window.innerHeight - 8 || above < 8 ? Math.max(8, Math.min(below, window.innerHeight - h - 8)) : above) + 'px';
}

// ---------- Hojas (modales) ----------
function openSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true;
  preview = null; activityDraft = null; pickQuery = ''; openDay = null;
  if (planFirstRun) { state.profileSkipped = true; planFirstRun = false; save(); } // cerró el cuestionario inicial tocando afuera
  planDraft = null;
}

const comboTitle = (types) => types.map((t) => ROUTINES[t].name).join(' + ');

function previewSheet() {
  const r = ROUTINES[preview.routine];
  const isCombo = !!r.combo;
  const ready = !isCombo || preview.types.length >= 2;
  const list = preview.ids.map(exById);
  const sets = preview.sets || {};
  const totalSets = list.reduce((n, e) => n + (sets[e.id] ?? e.sets), 0);
  const meta = list.length ? ` · ${list.length} ejercicios · ${totalSets} series · ~${estimateMinutes(preview.ids, sets)} min` : '';

  openSheet(`
    <h2>${esc(isCombo && ready ? comboTitle(preview.types) : r.name)}</h2>
    <div class="sub">${esc(isCombo && ready ? 'Combinación' : r.desc)}${meta}</div>
    ${isCombo ? `
      <div class="chips combo-chips">
        ${COMBINABLE.map((k) => `<button class="chip ${preview.types.includes(k) ? 'on' : ''}" data-action="combo-toggle" data-r="${k}">${esc(ROUTINES[k].name)}</button>`).join('')}
      </div>
      <p class="muted small">Elegí 2 o 3 tipos. Se arma una sola sesión equilibrada, no la suma de las rutinas completas.</p>` : ''}
    ${list.length ? `<div class="card" style="background:var(--surface-2)">
      ${list.map((e) => `<div class="plan-item">${howtoBtn(e.id, e.name)}<span class="tgt">${sets[e.id] ?? e.sets}×${esc(e.reps)}</span></div>`).join('')}
    </div>
    <p class="muted small" style="margin:8px 2px 0">🔥 Antes de empezar vas a tener un calentamiento para esta rutina.</p>`
      : !isCombo ? '<p class="muted">Empezás vacío y vas agregando los ejercicios que quieras.</p>' : ''}
    <div class="sheet-actions">
      ${list.length ? '<button class="btn" data-action="regen">🔀 Otra</button>' : '<button class="btn" data-action="close-sheet">Volver</button>'}
      <button class="btn primary" data-action="start" ${ready ? '' : 'disabled'}>Empezar</button>
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
  const sp = trackedSport(), t = tracker();
  const match = !!sp && a.sport === sp; // desde la sección del deporte: formulario con estadísticas
  const cats = sportCategories();
  openSheet(`
    <h2>${match ? `${t.icon} Registrar ${t.unit}` : 'Registrar actividad'}</h2>
    <div class="sub">${match ? `Cargá tus estadísticas de ${esc(sp.toLowerCase())}` : 'Deportes, cardio o cualquier movimiento del día'}</div>
    ${match ? '' : `<label class="field"><span>¿Qué hiciste?</span>
      <div class="chips">${SPORTS.filter((s) => s !== sp).map((s) => `<button class="chip ${a.sport === s ? 'on' : ''}" data-action="act-sport" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    </label>`}
    ${a.sport === 'Otro' ? `<label class="field"><span>Nombre</span><input class="input" id="act-other" value="${esc(a.other)}" placeholder="Ej: escalada"></label>` : ''}
    ${match ? `<div class="card fut-form">
      ${cats.length ? `<label class="field"><span>${esc(t.category)}</span>
        <div class="chips">${cats.map((c) => `<button class="chip ${a.category === c ? 'on' : ''}" data-action="act-cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      </label>` : ''}
      ${t.result ? `<label class="field"><span>Resultado (opcional)</span>
        <div class="seg">${Object.entries(RESULTS).filter(([k]) => t.draw || k !== 'D').map(([k, l]) => `<button class="chip ${a.result === k ? 'on' : ''}" data-action="act-res" data-v="${k}">${l}</button>`).join('')}</div>
      </label>` : ''}
      <div class="fut-steppers">
        ${t.fields.map((f) => f.type === 'count' ? `
          <div class="stepper"><span class="muted small">${f.icon} ${esc(f.label)}</span>
            <div class="stepper-row">
              <button class="step-btn" data-action="act-step" data-f="${f.k}" data-d="-1" aria-label="Restar">−</button>
              <b class="step-val">${a.stats[f.k] || 0}</b>
              <button class="step-btn" data-action="act-step" data-f="${f.k}" data-d="1" aria-label="Sumar">+</button>
            </div></div>` : `
          <label class="stepper"><span class="muted small">${f.icon} ${esc(f.label)} (${f.unit})</span>
            <input class="input" id="act-f-${f.k}" inputmode="decimal" value="${esc(a.stats[f.k] ?? '')}" placeholder="0"></label>`).join('')}
      </div>
    </div>` : ''}
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
  for (const f of SPORT_TRACKERS[a.sport]?.fields || []) {
    const el = $(`#act-f-${f.k}`);
    if (el) a.stats[f.k] = el.value.replace(',', '.');
  }
}

let openDay = null; // día abierto en la hoja, para refrescarla
function daySheet(ds) {
  const list = state.sessions.filter((s) => s.date === ds);
  openDay = ds;
  openSheet(`
    <h2 class="cap">${esc(fmtLongDate(ds))}</h2>
    <div class="sub">${list.length ? `${list.length} ${list.length === 1 ? 'registro' : 'registros'}` : 'Día sin actividad'}</div>
    ${list.map((s) => `
      <div class="card" style="background:var(--surface-2)">
        <div class="ex-head" style="margin-bottom:4px">
          <div><h3>${s.type === 'gym' ? '🏋️ ' + esc(s.title) : (SPORT_TRACKERS[s.sport]?.icon || '⚡') + ' ' + esc(s.sport)}</h3>
          <div class="muted small">${esc(sessionSummary(s))}</div></div>
          <button class="icon-btn" data-action="del-session" data-id="${s.id}" aria-label="Borrar">🗑</button>
        </div>
        ${s.type === 'gym' ? s.exercises.map((e) => `<div class="detail-ex"><div>${esc(e.name)}</div><div class="muted small">${esc(fmtSets(e.sets))}</div></div>`).join('') : ''}
        ${s.notes ? `<p class="small" style="margin:8px 0 0">${esc(s.notes)}</p>` : ''}
      </div>`).join('')}
    <button class="btn sport wide" data-action="log-activity" data-d="${ds}" style="margin-top:6px">+ Registrar actividad este día</button>
    ${state.supplements.length && ds <= todayStr() ? `<h2 class="section">Suplementos</h2><div class="card supps" style="background:var(--surface-2)">${suppButtons(ds)}</div>` : ''}
  `);
}

function suppEditorSheet() {
  openSheet(`
    <h2>Suplementos</h2>
    <div class="sub">Lo que tomás cada día y a qué hora querés el recordatorio</div>
    ${state.supplements.map((s, i) => `
      <div class="card supp-edit" style="background:var(--surface-2)">
        <div class="supp-edit-row">
          <input class="input" data-si="${i}" data-sf="name" value="${esc(s.name)}" placeholder="Nombre" aria-label="Nombre">
          <button class="icon-btn" data-action="del-supp" data-i="${i}" aria-label="Borrar suplemento">🗑</button>
        </div>
        <div class="supp-edit-row">
          <input class="input" data-si="${i}" data-sf="dose" value="${esc(s.dose)}" placeholder="Dosis (ej: 5 g)" aria-label="Dosis">
          <input class="input" type="time" data-si="${i}" data-sf="time" value="${esc(s.time)}" aria-label="Hora">
        </div>
      </div>`).join('')}
    <button class="btn ghost wide" data-action="add-supp">+ Agregar suplemento</button>
    <div class="sheet-actions" style="grid-template-columns:1fr">
      <button class="btn primary" data-action="done-supps">Listo</button>
    </div>
  `);
}

// ---------- Timers ----------
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    const el = $('#elapsed');
    if (el && state.active) el.textContent = fmtClock(Date.now() - state.active.start);
    renderRest();
    tickWarmup();
  }, 1000);
}
function stopTick() { clearInterval(tickTimer); tickTimer = null; }

// Cronómetro de un paso del calentamiento: al terminar, vibra y lo marca hecho
function tickWarmup() {
  const w = state.active?.warmup;
  if (!w || !w.timer) return;
  const left = w.timer.until - Date.now();
  if (left <= 0) {
    w.steps[w.timer.i].done = true;
    w.timer = null;
    save();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    toast('⏱ ¡Tiempo!');
    render();
    return;
  }
  const b = $(`#wu-t-${w.timer.i}`);
  if (b) b.textContent = fmtClock(left);
}

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

// ---------- Series ----------
function toggleSet(i, j) {
  const e = state.active.exercises[i], s = e.sets[j];
  if (!s.done) {
    // si está vacío, usa lo sugerido (lo de la última vez)
    const last = lastFor(e.exId);
    if (!s.w) s.w = placeholder(last, j, 'w', e.target);
    if (!s.r) s.r = placeholder(last, j, 'r', e.target);
    s.done = true;
    if (e.sets.every((x) => x.done)) {
      e.expanded = false;
      toast(`✓ ${e.name} completado`, { label: 'Deshacer', fn: () => undoLastSet(i) });
    }
    startRest();
  } else {
    s.done = false;
  }
  save(); render();
}
function undoLastSet(i) {
  const e = state.active?.exercises[i];
  if (!e) return;
  const j = e.sets.map((s) => s.done).lastIndexOf(true);
  if (j < 0) return;
  e.sets[j].done = false;
  e.expanded = true;
  stopRest();
  save(); render();
  toast(`Serie ${j + 1} desmarcada`);
}

// ---------- Acciones ----------
const actions = {
  preview(el) {
    const k = el.dataset.r;
    preview = ROUTINES[k].combo ? { routine: k, types: [], ids: [] } : { routine: k, ids: generate(k) };
    previewSheet();
  },
  'combo-toggle'(el) {
    const t = el.dataset.r, types = preview.types;
    if (types.includes(t)) types.splice(types.indexOf(t), 1);
    else if (types.length >= COMBO.maxTypes) return toast(`Máximo ${COMBO.maxTypes} tipos`);
    else types.push(t);
    Object.assign(preview, types.length >= 2 ? generateCombo(types) : { ids: [], sets: {} });
    previewSheet();
  },
  regen() {
    if (preview.types) Object.assign(preview, generateCombo(preview.types));
    else preview.ids = generate(preview.routine);
    previewSheet();
  },
  start() {
    const r = ROUTINES[preview.routine];
    const types = preview.types || [preview.routine];
    const exercises = preview.ids.map((id) => newWorkoutExercise(exById(id), preview.sets?.[id]));
    state.active = {
      id: uid(), routine: preview.routine, types,
      title: r.combo ? comboTitle(types) : r.name, start: Date.now(),
      exercises,
      warmup: buildWarmup(types, exercises),
    };
    save(); closeSheet(); window.scrollTo(0, 0); render();
  },
  'wu-toggle'(el) {
    const w = state.active.warmup, i = +el.dataset.i;
    w.steps[i].done = !w.steps[i].done;
    if (w.timer && w.timer.i === i) w.timer = null;
    save(); render();
  },
  'wu-timer'(el) {
    const w = state.active.warmup, i = +el.dataset.i;
    if (w.timer && w.timer.i === i) w.timer = null; // tocar de nuevo lo pausa/cancela
    else w.timer = { i, until: Date.now() + w.steps[i].dur * 1000 };
    save(); render();
  },
  'wu-skip'() {
    if (!confirm('¿Saltar el calentamiento? Entrar en frío aumenta el riesgo de lesión.')) return;
    actions['wu-finish']();
  },
  'wu-finish'() {
    state.active.warmup = null;
    save(); window.scrollTo(0, 0); render();
    toast('💪 ¡A entrenar!');
  },
  'toggle-set'(el) { toggleSet(+el.dataset.i, +el.dataset.j); },
  'next-set'(el) {
    const i = +el.dataset.i, j = state.active.exercises[i].sets.findIndex((s) => !s.done);
    if (j >= 0) toggleSet(i, j);
  },
  'undo-set'(el) { undoLastSet(+el.dataset.i); },
  'ex-expand'(el) { state.active.exercises[+el.dataset.i].expanded = true; save(); render(); },
  'ex-collapse'(el) { state.active.exercises[+el.dataset.i].expanded = false; save(); render(); },
  'toast-act'() {
    const fn = toastAction?.fn;
    $('#toast').hidden = true; toastAction = null;
    if (fn) fn();
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
    const options = shuffle(EXERCISES.filter((e) => e.muscle === cur.muscle && !used.has(e.id) && levelOk(e)));
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
    const session = { id: a.id, type: 'gym', date: dateStr(new Date(a.start)), routine: a.routine, types: a.types, title: a.title, start: a.start, end: Date.now(), exercises };
    state.sessions.push(session);
    state.active = null; save();
    view = 'home'; render(); window.scrollTo(0, 0);
    toast('💪 Entrenamiento guardado');
  },
  'rest-add'() { if (rest) { rest.until += 15000; renderRest(); } },
  'rest-skip'() { stopRest(); },

  'log-activity'(el) {
    const sport = el.dataset.sport || '';
    const t = sport && sport === trackedSport() ? tracker() : null;
    activityDraft = {
      sport, other: '', date: el.dataset.d || todayStr(), minutes: '', intensity: 'media', notes: '',
      stats: Object.fromEntries((t?.fields || []).map((f) => [f.k, f.type === 'count' ? 0 : ''])),
      category: t ? sportCategories()[0] || '' : '', result: '',
    };
    activitySheet();
  },
  'act-sport'(el) { readActivityInputs(); activityDraft.sport = el.dataset.v; activitySheet(); },
  'act-int'(el) { readActivityInputs(); activityDraft.intensity = el.dataset.v; activitySheet(); },
  'save-activity'() {
    readActivityInputs();
    const a = activityDraft;
    const sport = a.sport === 'Otro' ? (a.other.trim() || 'Otra actividad') : a.sport;
    if (!sport) return toast('Elegí qué actividad hiciste');
    const entry = { id: uid(), type: 'activity', date: a.date, start: Date.now(), sport, minutes: num(a.minutes) || '', intensity: a.intensity, notes: a.notes.trim() };
    const t = sport === trackedSport() ? tracker() : null;
    if (t) {
      entry.stats = Object.fromEntries(t.fields.map((f) => [f.k, num(a.stats[f.k]) || 0]));
      if (a.category) entry.category = a.category;
      if (a.result) entry.result = a.result;
    }
    state.sessions.push(entry);
    save(); closeSheet(); render();
    toast(t ? `${t.icon} Guardado · ${sessionStatsText(entry, false)}` : '⚡ Actividad registrada');
  },
  'sport-stats'() { sportFilter = 'Todos'; sportStatsSheet(); },
  'sport-filter'(el) { sportFilter = el.dataset.v; sportStatsSheet(); },
  'act-cat'(el) { readActivityInputs(); activityDraft.category = el.dataset.v; activitySheet(); },
  'act-res'(el) { readActivityInputs(); activityDraft.result = activityDraft.result === el.dataset.v ? '' : el.dataset.v; activitySheet(); },
  'act-step'(el) {
    readActivityInputs();
    const f = el.dataset.f;
    activityDraft.stats[f] = Math.max(0, Math.min(200, (activityDraft.stats[f] || 0) + +el.dataset.d));
    activitySheet();
  },

  take(el) {
    const date = el.dataset.d || todayStr();
    const nowTaken = toggleTaken(el.dataset.id, date);
    render();
    if (openDay) daySheet(openDay);
    if (nowTaken && date === todayStr() && allTaken(date)) toast('✅ Todo tomado hoy');
    if (date === todayStr()) syncPush();
  },
  'push-on'() { enablePush(); },
  'push-off'() { disablePush(); },
  async 'push-test'() {
    try { await pushPost('/test', { id: state.push.deviceId }); toast('Enviada, debería llegar en segundos'); }
    catch (e) { toast('No se pudo enviar: ' + e.message); }
  },
  'plan-open'() { openPlan(false); },
  'plan-pick'(el) {
    const f = el.dataset.f;
    const prevSport = planDraft.sport;
    planDraft[f] = f === 'days' ? +el.dataset.v : el.dataset.v;
    // al cambiar de deporte, arrancar con sus categorías de ejemplo
    if (f === 'sport' && planDraft.sport !== prevSport) planDraft.categories = [...(SPORT_TRACKERS[planDraft.sport]?.categories || [])];
    planSheet();
  },
  'plan-cat-add'() {
    const input = $('#plan-cat'), v = input.value.trim();
    if (!v) return toast('Escribí un nombre');
    if (planDraft.categories.some((c) => c.toLowerCase() === v.toLowerCase())) return toast('Ya está en la lista');
    if (planDraft.categories.length >= 12) return toast('Máximo 12');
    planDraft.categories.push(v);
    planSheet();
    $('#plan-cat')?.focus();
  },
  'plan-cat-del'(el) { planDraft.categories.splice(+el.dataset.i, 1); planSheet(); },
  'plan-toggle'(el) {
    const list = planDraft[el.dataset.f], v = el.dataset.v;
    if (list.includes(v)) list.splice(list.indexOf(v), 1); else list.push(v);
    planSheet();
  },
  'plan-step'(el) {
    if (planStep === 2 && +el.dataset.dir > 0 && planDraft.split === 'custom' && !planDraft.custom.length) return toast('Elegí al menos una rutina');
    planStep = Math.max(0, Math.min(PLAN_STEPS.length - 1, planStep + +el.dataset.dir));
    planSheet();
    $('.sheet').scrollTop = 0;
  },
  'plan-save'() {
    const prevGoal = state.profile?.goal;
    state.profile = planDraft;
    let msg = '✅ Plan guardado';
    if (planDraft.goal !== prevGoal) {
      state.settings.rest = GOALS[planDraft.goal].rest; // descanso sugerido según el objetivo
      msg += ` · descanso ${fmtClock(state.settings.rest * 1000)}`;
    }
    planFirstRun = false;
    save(); closeSheet(); render(); toast(msg);
  },
  'plan-skip'() {
    state.profileSkipped = true; planFirstRun = false;
    save(); closeSheet();
    toast('Podés armar tu plan cuando quieras en Ajustes');
  },
  'goto-routines'() { routinePickerSheet(); },
  'edit-membership'() { membershipSheet(); },
  'mem-save'() {
    const date = $('#mem-date').value, hour = $('#mem-hour').value || '09:00';
    if (!date) return toast('Elegí la fecha del último pago');
    if (date > todayStr()) return toast('La fecha no puede ser futura');
    const prev = state.membership;
    const history = prev?.history ? [...prev.history] : [];
    if (!history.includes(date)) history.push(date);
    history.sort();
    state.membership = { lastPaid: date, hour, history };
    save(); closeSheet(); render(); syncPush();
    toast(`Guardado · vence el ${fmtDay(membershipDue(state.membership))}`);
  },
  'mem-paid'() {
    const today = todayStr(), m = state.membership;
    if (!confirm('¿Confirmás que pagaste la membresía hoy?')) return;
    const prevPaid = m.lastPaid;
    m.lastPaid = today;
    m.history = [...new Set([...(m.history || []), today])].sort();
    save(); render(); syncPush();
    toast(`✅ Pago registrado · próximo: ${fmtDay(membershipDue(m))}`, {
      label: 'Deshacer',
      fn: () => {
        m.lastPaid = prevPaid; m.history = m.history.filter((d) => d !== today || d === prevPaid);
        save(); render(); syncPush();
      },
    });
  },
  'mem-remove'() {
    if (!confirm('¿Quitar la membresía? Se borra también el historial de pagos.')) return;
    state.membership = null;
    save(); closeSheet(); render(); syncPush();
  },
  'edit-supps'() { suppEditorSheet(); },
  'add-supp'() {
    state.supplements.push({ id: uid(), name: '', dose: '', time: '09:00' });
    save(); suppEditorSheet();
    const inputs = $$('[data-sf="name"]');
    inputs[inputs.length - 1]?.focus();
  },
  'del-supp'(el) {
    const s = state.supplements[+el.dataset.i];
    if (s.name && !confirm(`¿Borrar ${s.name}?`)) return;
    state.supplements.splice(+el.dataset.i, 1); save(); suppEditorSheet();
  },
  'done-supps'() {
    state.supplements = state.supplements.filter((s) => s.name.trim());
    save(); closeSheet(); render(); syncPush();
  },

  howto(el) {
    if (howtoOpen === el.dataset.id) hideHowTo();
    else showHowTo(el.dataset.id, el);
  },
  'howto-close'() { hideHowTo(); },

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
    const blob = new Blob([JSON.stringify({ app: 'AppGym', version: 1, exported: new Date().toISOString(), sessions: state.sessions, settings: state.settings, supplements: state.supplements, intake: state.intake, membership: state.membership, profile: state.profile }, null, 2)], { type: 'application/json' });
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
  // tocar fuera del globito lo cierra
  if (howtoOpen && !ev.target.closest('#howto') && !ev.target.closest('[data-action="howto"]')) hideHowTo();
  const tab = ev.target.closest('#tabs button');
  if (tab) { view = tab.dataset.view; if (view === 'calendar') calMonth = monthStart(new Date()); render(); window.scrollTo(0, 0); return; }
  const el = ev.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) { ev.preventDefault(); actions[el.dataset.action](el); }
});

// Enter en el campo de torneos/categorías los agrega
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.id === 'plan-cat') { ev.preventDefault(); actions['plan-cat-add'](); }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'pick-q') {
    pickQuery = t.value;
    const tmp = document.createElement('div'); tmp.innerHTML = pickerSheet();
    $('#pick-list').innerHTML = tmp.querySelector('#pick-list').innerHTML;
    return;
  }
  if (t.dataset.sf) {
    state.supplements[+t.dataset.si][t.dataset.sf] = t.value;
    save();
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
  if (t.dataset.setting === 'weekGoal') { state.settings.weekGoal = +t.value; save(); toast('Objetivo guardado'); }
  if (t.id === 'import-file' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!Array.isArray(data.sessions)) throw new Error();
      const ids = new Set(state.sessions.map((s) => s.id));
      const nuevos = migrate(data.sessions.filter((s) => s && s.id && s.date && !ids.has(s.id)));
      state.sessions.push(...nuevos);
      if (Array.isArray(data.supplements)) {
        const incoming = data.supplements.filter((s) => s && s.id && s.name);
        const untouched = JSON.stringify(state.supplements) === JSON.stringify(DEFAULT_SUPPS);
        if (untouched) {
          state.supplements = incoming; // app recién instalada: tus suplementos reemplazan a los de ejemplo
        } else {
          for (const s of incoming) { // los de la copia actualizan nombre, dosis y hora de los que ya existen
            const i = state.supplements.findIndex((x) => x.id === s.id);
            if (i >= 0) state.supplements[i] = s; else state.supplements.push(s);
          }
        }
      }
      if (data.settings && typeof data.settings === 'object') state.settings = { ...state.settings, ...data.settings };
      if (!state.membership && data.membership?.lastPaid) state.membership = data.membership;
      if (!state.profile && data.profile?.split) {
        state.profile = data.profile;
        if (!('sport' in state.profile)) Object.assign(state.profile, { sport: 'Soccer', categories: ['Cente', 'Exa', 'Cyt', 'Casual'] });
      }
      for (const [d, ids] of Object.entries(data.intake || {})) {
        if (Array.isArray(ids)) state.intake[d] = [...new Set([...takenOn(d), ...ids])];
      }
      save(); render(); syncPush(); // el servidor recibe tus suplementos y membresía para los avisos
      toast(`Importadas ${nuevos.length} sesiones y ${state.supplements.length} suplementos`);
    } catch (e) { toast('Archivo no válido'); }
    t.value = '';
  }
});

// Al volver a la app después de bloquear el celular, actualizar timers
// al hacer scroll el globito queda desubicado: se cierra
document.addEventListener('scroll', () => { if (howtoOpen) hideHowTo(); }, { capture: true, passive: true });
window.addEventListener('resize', () => { if (howtoOpen) hideHowTo(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  renderRest();
  syncPush();
  if (!state.active) render(); // por si cambió el día con la app abierta
});

handleTakeLink();
render();
syncPush();
// primera vez: proponer armar el plan
if (!state.profile && !state.profileSkipped && !state.active) setTimeout(() => openPlan(true), 600);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // updateViaCache 'none': el navegador siempre busca sw.js nuevo, sin usar su caché
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  // si entra una versión nueva mientras la app está abierta, recargar una vez para mostrarla
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}
