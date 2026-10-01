// freshcoastlab.com - static site plus one tiny API for "The Lab, right now".
//
// GET  /api/lab-status  -> latest aggregate numbers (or 204 if none yet)
// POST /api/lab-status  -> Home Assistant pushes numbers here (Bearer LAB_PUSH_TOKEN)
//
// Home Assistant is never reachable from the internet: it PUSHES out to this Worker.
// Only whitelisted, aggregate fields are accepted and stored - never devices,
// addresses or routines. If the KV binding or token isn't configured yet, the API
// answers 204 (or 503 for a bad push) and the page simply keeps the strip hidden.

const FIELDS = {
  automations_running: (v) => Number.isInteger(v) && v >= 0 && v < 10000,
  days_since_self_repair: (v) => Number.isInteger(v) && v >= 0 && v < 10000,
  silent_failures_week: (v) => Number.isInteger(v) && v >= 0 && v < 10000,
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lab-status') {
      if (!env.LAB) return new Response(null, { status: 204 }); // nothing to show yet: the strip stays hidden, no console noise

      if (request.method === 'GET') {
        const data = await env.LAB.get('status', 'json');
        return data ? json(data) : new Response(null, { status: 204 });
      }

      if (request.method === 'POST') {
        const auth = request.headers.get('authorization') || '';
        if (!env.LAB_PUSH_TOKEN || !(await timingSafeEqual(auth, `Bearer ${env.LAB_PUSH_TOKEN}`))) {
          return json({ error: 'unauthorized' }, 401);
        }
        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
        const clean = {};
        for (const [k, ok] of Object.entries(FIELDS)) {
          if (!ok(body[k])) return json({ error: `bad or missing ${k}` }, 400);
          clean[k] = body[k];
        }
        clean.updated = new Date().toISOString();
        await env.LAB.put('status', JSON.stringify(clean));
        return json({ ok: true });
      }

      return json({ error: 'method not allowed' }, 405);
    }

    if (url.pathname === '/api/weather') return weather(request);

    return env.ASSETS.fetch(request);
  },
};

// GET /api/weather -> Traverse City conditions and Lake Michigan waves for the hero sky.
// Public data (Open-Meteo, no key), cached at the edge for 10 minutes. Any failure answers 204 and the
// page keeps its default sunset sky.
async function weather(request) {
  const cache = caches.default;
  const key = new Request('https://freshcoastlab.com/api/weather', { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const W = 'https://api.open-meteo.com/v1/forecast?latitude=44.76&longitude=-85.62&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,is_day,weather_code&daily=sunrise,sunset&timezone=America%2FDetroit&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1';
    const M = 'https://marine-api.open-meteo.com/v1/marine?latitude=44.95&longitude=-85.95&current=wave_height&timezone=America%2FDetroit';
    const [w, m] = await Promise.all([fetch(W).then((r) => r.json()), fetch(M).then((r) => r.json()).catch(() => null)]);
    const c = w.current, d = w.daily;
    const body = {
      temp_f: Math.round(c.temperature_2m), wind_mph: Math.round(c.wind_speed_10m), wind_dir: c.wind_direction_10m,
      cloud: c.cloud_cover, code: c.weather_code, is_day: c.is_day,
      sunrise: d.sunrise[0], sunset: d.sunset[0], utc_offset_s: w.utc_offset_seconds,
      wave_ft: m && m.current && m.current.wave_height != null ? Math.round(m.current.wave_height * 3.281 * 10) / 10 : null,
      observed: c.time,
    };
    const res = new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } });
    await cache.put(key, res.clone());
    return res;
  } catch {
    return new Response(null, { status: 204 });
  }
}
