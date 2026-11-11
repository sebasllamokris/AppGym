// Servidor de recordatorios de AppGym (Cloudflare Worker).
// - La app registra el celular y le cuenta sus suplementos y qué tomó hoy.
// - Cada minuto revisa si a alguien le toca un recordatorio y le manda una notificación push.

const ALLOWED_ORIGINS = ['https://sebasllamokris.github.io', 'http://localhost:5173'];
const MAX_DEVICES = 20;
const REPEAT_AFTER_MS = 2 * 60 * 60 * 1000; // si no lo marcaste, repite una vez a las 2 horas
const KEY = 'devices';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    const path = new URL(req.url).pathname;
    try {
      if (req.method === 'GET' && path === '/vapid') return json({ publicKey: env.VAPID_PUBLIC });
      if (req.method !== 'POST') return json({ error: 'not found' }, 404);

      const body = await req.json();
      if (!body.id || typeof body.id !== 'string' || body.id.length > 64) return json({ error: 'id inválido' }, 400);
      const devices = await getDevices(env);

      if (path === '/subscribe' || path === '/sync') {
        const prev = devices[body.id];
        if (path === '/subscribe') {
          if (!body.subscription?.endpoint || !body.subscription?.keys) return json({ error: 'suscripción inválida' }, 400);
          if (!prev && Object.keys(devices).length >= MAX_DEVICES) return json({ error: 'demasiados dispositivos' }, 429);
        } else if (!prev) return json({ error: 'no registrado' }, 404);

        devices[body.id] = {
          subscription: body.subscription || prev.subscription,
          tz: validTz(body.tz) ? body.tz : prev?.tz || 'UTC',
          supplements: cleanSupps(body.supplements ?? prev?.supplements ?? []),
          taken: body.date ? { date: String(body.date), ids: (body.taken || []).map(String) } : prev?.taken || { date: '', ids: [] },
          sent: prev?.sent || { date: '', ids: {} },
        };
        await putDevices(env, devices);
        return json({ ok: true });
      }

      if (path === '/unsubscribe') {
        delete devices[body.id];
        await putDevices(env, devices);
        return json({ ok: true });
      }

      if (path === '/test') {
        const d = devices[body.id];
        if (!d) return json({ error: 'no registrado' }, 404);
        const res = await sendPush(env, d.subscription, {
          title: '💪 AppGym', body: '¡Las notificaciones funcionan! Así te vas a enterar de tus suplementos.', url: './',
        });
        return json({ ok: res.ok, status: res.status });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },

  async scheduled(_event, env) {
    const devices = await getDevices(env);
    let changed = false;
    const now = Date.now();

    for (const [id, d] of Object.entries(devices)) {
      const { date, time } = localNow(d.tz);
      if (d.sent.date !== date) d.sent = { date, ids: {} };
      const taken = d.taken.date === date ? d.taken.ids : [];

      const due = d.supplements.filter((s) => {
        if (!s.time || s.time > time || taken.includes(s.id)) return false;
        const sent = d.sent.ids[s.id];
        return !sent || (sent.count < 2 && now - sent.last >= REPEAT_AFTER_MS);
      });
      if (!due.length) continue;

      const names = due.map((s) => (s.dose ? `${s.name} (${s.dose})` : s.name));
      const res = await sendPush(env, d.subscription, {
        title: '💊 Hora de tus suplementos',
        body: `${names.join(' · ')}. Tocá para marcar${due.length > 1 ? 'los' : 'lo'} como tomado${due.length > 1 ? 's' : ''}.`,
        url: `./?take=${due.map((s) => encodeURIComponent(s.id)).join(',')}`,
      });

      if (res.status === 404 || res.status === 410) {
        delete devices[id]; // el celular canceló la suscripción
      } else if (res.ok) {
        for (const s of due) {
          const prev = d.sent.ids[s.id];
          d.sent.ids[s.id] = { count: (prev?.count || 0) + 1, last: now };
        }
      }
      changed = true;
    }
    if (changed) await putDevices(env, devices);
  },
};

// ---------- Datos ----------
async function getDevices(env) { return (await env.SUBS.get(KEY, 'json')) || {}; }
async function putDevices(env, devices) { await env.SUBS.put(KEY, JSON.stringify(devices)); }

function cleanSupps(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 30).map((s) => ({
    id: String(s.id).slice(0, 64), name: String(s.name || '').slice(0, 60),
    dose: String(s.dose || '').slice(0, 30), time: /^\d{2}:\d{2}$/.test(s.time) ? s.time : '',
  })).filter((s) => s.name);
}
function validTz(tz) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return typeof tz === 'string'; } catch { return false; }
}
function localNow(tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// ---------- Web Push (VAPID + cifrado aes128gcm, RFC 8291 / 8292) ----------
const enc = new TextEncoder();
const b64u = {
  encode(buf) {
    let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
};
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};

async function vapidAuth(env, endpoint) {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64u.encode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.encode(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT,
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u.encode(sig)}, k=${env.VAPID_PUBLIC}`;
}

async function hkdf(salt, ikm, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits));
}

async function encrypt(subscription, payload) {
  const uaPublic = b64u.decode(subscription.keys.p256dh);
  const authSecret = b64u.decode(subscription.keys.auth);

  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 96);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain = concat(enc.encode(payload), new Uint8Array([2])); // 0x02 = último registro
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plain));

  const rs = new Uint8Array([0, 0, 16, 0]); // tamaño de registro 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

async function sendPush(env, subscription, message) {
  const body = await encrypt(subscription, JSON.stringify(message));
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(env, subscription.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'high',
    },
    body,
  });
}
