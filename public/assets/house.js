// "Watch the house think" - an isometric cutaway of a smart home, generated in SVG,
// replaying real automation patterns: sensor -> hub -> action -> verified -> alert.
// Layout and security-device details are illustrative on purpose.
(() => {
  const svg = document.getElementById('house-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pausedUntil = 0;

  // ---------- isometric projection ----------
  const C = Math.cos(Math.PI / 6), U = 24;
  const P = (x, y, z = 0) => [(x - y) * C * U, (x + y) * 0.5 * U - z * U];
  const pts = (a) => a.map((p) => P(...p).map((v) => v.toFixed(1)).join(',')).join(' ');
  const el = (tag, attrs = {}, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const g = (cls) => el('g', cls ? { class: cls } : {});
  const gBase = g(), gWalls = g(), gRooms = g(), gExt = g(), gMesh = g('mesh'), gDev = g(), gFx = g();

  // ---------- site ----------
  el('polygon', { points: pts([[-3, -7], [23, -7], [23, 21.5], [-3, 21.5]]), class: 'lot' }, gBase);
  el('polygon', { points: pts([[0, -6], [20, -6], [20, -0.3], [0, -0.3]]), class: 'yard' }, gBase);
  el('polygon', { points: pts([[0.6, 14.4], [6.4, 14.4], [6.4, 21], [0.6, 21]]), class: 'drive' }, gBase);
  el('polygon', { points: pts([[7.4, 14.3], [10.8, 14.3], [10.8, 16.2], [7.4, 16.2]]), class: 'porch' }, gBase);
  const tx = (x, y, z, text, cls) => { const [a, b] = P(x, y, z); const t = el('text', { x: a, y: b, class: cls, 'text-anchor': 'middle' }, gBase); t.textContent = text; };
  tx(3.5, 19.5, 0, 'DRIVEWAY', 'rlabel');
  tx(10, -4.2, 0, 'BACK YARD', 'rlabel');

  // floor slab: front faces give the model weight
  el('polygon', { points: pts([[0, 14, 0], [20, 14, 0], [20, 14, -0.7], [0, 14, -0.7]]), class: 'slab' }, gBase);
  el('polygon', { points: pts([[20, 0, 0], [20, 14, 0], [20, 14, -0.7], [20, 0, -0.7]]), class: 'slab2' }, gBase);
  // back walls (cutaway dollhouse)
  const H = 2.6;
  el('polygon', { points: pts([[0, 0, 0], [20, 0, 0], [20, 0, H], [0, 0, H]]), class: 'wall' }, gWalls);
  el('polygon', { points: pts([[0, 0, 0], [0, 14, 0], [0, 14, H], [0, 0, H]]), class: 'wall' }, gWalls);

  // rooms
  const ROOMS = {
    office: [0, 0, 7, 7, 'OFFICE'], laundry: [7, 0, 11, 7, 'LAUNDRY'], kitchen: [11, 0, 20, 7, 'KITCHEN'],
    pantry: [17, 0, 20, 3, 'PANTRY'], garage: [0, 7, 7, 14, 'GARAGE'], living: [7, 7, 20, 14, 'LIVING ROOM'],
  };
  const roomEl = {};
  for (const [k, [x0, y0, x1, y1, name]] of Object.entries(ROOMS)) {
    roomEl[k] = el('polygon', { points: pts([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), class: 'room' }, gRooms);
    const [a, b] = P((x0 + x1) / 2, (y0 + y1) / 2);
    const t = el('text', { x: a, y: b + 3, class: 'rlabel', 'text-anchor': 'middle' }, gRooms);
    t.textContent = name;
  }

  // garage door on the front edge (y = 14), animatable
  const door = el('polygon', { class: 'gdoor' }, gWalls);
  let doorFrac = 1; // 1 closed, 0 open
  const drawDoor = () => { const h = 0.25 + 2.0 * doorFrac; door.setAttribute('points', pts([[1, 14, 0], [6, 14, 0], [6, 14, h], [1, 14, h]])); };
  drawDoor();

  // ---------- devices ----------
  const I = {
    hub: 'M0,-5 L4.3,-2.5 L4.3,2.5 L0,5 L-4.3,2.5 L-4.3,-2.5Z M-1.8,0 H1.8',
    zb: 'M-3,-3 H3 L-3,3 H3',
    motion: 'M-4.5,-1 A5,5 0 0 1 4.5,-1 M-2.5,1 A2.7,2.7 0 0 1 2.5,1 M0,3.2 V3.4',
    light: 'M0,-4 A3.2,3.2 0 1 1 -0.01,-4 M-1.6,3.4 H1.6 M-1,4.8 H1',
    leak: 'M0,-4.5 C3.2,-0.5 3.2,3.5 0,3.5 C-3.2,3.5 -3.2,-0.5 0,-4.5Z',
    smoke: 'M0,-4.5 A4.5,4.5 0 1 1 -0.01,-4.5 M-2,0 H2 M0,-2 V2',
    lock: 'M-3,-0.5 H3 V4 H-3Z M-1.8,-0.5 V-2.2 A1.8,1.8 0 0 1 1.8,-2.2 V-0.5',
    cam: 'M-4,-2.5 H2 V2.5 H-4Z M2,-1 L4.5,-2.5 V2.5 L2,1',
    tv: 'M-5,-3 H5 V2.5 H-5Z M-2,4.2 H2',
    speaker: 'M-2.6,-4.5 H2.6 V4.5 H-2.6Z M0,1.3 A1.5,1.5 0 1 1 -0.01,1.3 M0,-2.4 V-2.3',
    washer: 'M-4,-4 H4 V4 H-4Z M0,0.5 A2.2,2.2 0 1 1 -0.01,0.5',
    range: 'M-4,-3 H4 V3.5 H-4Z M-2,-0.2 A1,1 0 1 1 -2.01,-0.2 M2,-0.2 A1,1 0 1 1 1.99,-0.2',
    fridge: 'M-2.8,-4.8 H2.8 V4.8 H-2.8Z M-2.8,-0.8 H2.8 M1.5,-3.2 V-2',
    thermo: 'M0,-4.2 A4.2,4.2 0 1 1 -0.01,-4.2 M0,0 L2,-2',
    bt: 'M-2.2,-2 L2.2,2 L0,4 V-4 L2.2,-2 L-2.2,2',
    plug: 'M-3.2,-3.2 H3.2 V3.2 H-3.2Z M-1.2,-0.8 V0.8 M1.2,-0.8 V0.8',
    tilt: 'M-4,3 L3.5,-2.5 M-4,3 H4',
  };
  const D = {
    hub: [2.4, 2.4, 'hub', 'Home Assistant hub'], zb: [4.2, 2.0, 'zb', 'Zigbee coordinator'],
    m_garage: [3.6, 9.6, 'motion', 'garage motion'], m_bench: [1.2, 12.2, 'motion', 'workbench motion'],
    l_garage: [5.4, 11.4, 'light', 'garage lights'], tilt: [3.5, 13.4, 'tilt', 'door tilt sensor'],
    m_laundry: [9.6, 5.4, 'motion', 'laundry motion'], l_laundry: [8.3, 3.4, 'light', 'laundry lights'],
    leak: [8.2, 1.2, 'leak', 'water sensor'], washer: [10.2, 1.4, 'washer', 'washer + dryer'],
    range: [13.4, 1.4, 'range', 'range'], fridge: [15.6, 1.3, 'fridge', 'fridge'],
    smoke_p: [19.2, 1.0, 'smoke', 'smoke / CO'], l_pantry: [17.9, 2.2, 'light', 'pantry light'],
    m_living: [11.4, 10.2, 'motion', 'living room motion'], lamp: [18.6, 12.8, 'light', 'lamp'],
    tv: [15.2, 7.4, 'tv', 'Frame TV'], sonos: [17.6, 8.4, 'speaker', 'speaker'],
    thermo: [7.5, 9.2, 'thermo', 'thermostat'], proxy: [8.3, 12.6, 'bt', 'ESPHome BT proxy'],
    lock: [8.7, 14.0, 'lock', 'front door'], bell: [9.9, 14.1, 'cam', 'doorbell camera'],
    flood: [0.3, 14.3, 'cam', 'driveway camera'], walls: [6.6, 14.4, 'light', 'garage wall lights'],
    porch: [10.3, 15.6, 'speaker', 'porch speaker'], yard: [10.0, -2.8, 'light', 'back yard lights'],
    r1: [13.0, 4.8, 'plug', 'smart plug (router)'], r2: [12.6, 12.6, 'plug', 'smart plug (router)'],
    smoke_u: [3.2, 4.6, 'smoke', 'smoke / CO, upstairs', 3.2],
  };
  const LIGHT_ROOM = { l_garage: 'garage', l_laundry: 'laundry', l_pantry: 'pantry', lamp: 'living' };
  const EXT = ['walls', 'yard', 'flood'];
  const dev = {}, lbl = {}, pos = {};
  for (const [id, [x, y, t, name, z = 0]] of Object.entries(D)) {
    const [a, b] = P(x, y, z);
    pos[id] = [a, b];
    const gg = el('g', { class: 'dev', transform: `translate(${a.toFixed(1)},${b.toFixed(1)})` }, gDev);
    if (z) el('line', { x1: 0, y1: 0, x2: 0, y2: z * U, class: 'stem' }, gg);
    el('circle', { r: 17, class: 'hit' }, gg);
    el('circle', { r: 9.5, class: 'ring0' }, gg);
    el('path', { d: I[t], class: 'ic' }, gg);
    const l = el('text', { y: -13, class: 'lbl', 'text-anchor': 'middle' }, gg);
    l.textContent = name;
    dev[id] = gg; lbl[id] = l;
  }
  // tap / click any device: name it and send its signal to the hub (works on touch)
  for (const [id, [, , , name]] of Object.entries(D)) {
    const gg = dev[id];
    gg.setAttribute('tabindex', '0'); gg.setAttribute('role', 'button'); gg.setAttribute('aria-label', name);
    const poke = () => {
      pausedUntil = Date.now() + 20000;
      gg.classList.add('peek'); setTimeout(() => gg.classList.remove('peek'), 2600);
      ring(id, '#7CD3E0', 1);
      if (id !== 'hub') pulse(id, 'hub', '#7CD3E0');
      log(name + ' \u2192 reporting in');
    };
    gg.addEventListener('click', poke);
    gg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
  }
  // exterior light glows
  const glow = {};
  for (const id of EXT) {
    const [a, b] = pos[id];
    glow[id] = el('ellipse', { cx: a, cy: b + 16, rx: 70, ry: 30, class: 'xglow' }, gExt);
  }
  // Zigbee mesh (illustrative topology: coordinator -> routers -> sleepy end devices)
  const MESH = [['zb', 'r1'], ['zb', 'r2'], ['zb', 'm_garage'], ['zb', 'm_bench'], ['r1', 'm_laundry'], ['r1', 'leak'], ['r1', 'l_pantry'], ['r2', 'm_living'], ['r2', 'tilt'], ['r2', 'l_garage']];
  for (const [a, b] of MESH) el('line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1] }, gMesh);

  // ---------- camera: on narrow screens the model is wider than the frame; glide to the action ----------
  const pan = svg.parentElement;
  let focusTimer = 0;
  const focus = (id) => {
    if (!pan || pan.scrollWidth <= pan.clientWidth + 4) return;
    clearTimeout(focusTimer); // settle on the latest action in a burst
    focusTimer = setTimeout(() => focusNow(id), 140);
  };
  const focusNow = (id) => {
    const r = dev[id].getBoundingClientRect(), pr = pan.getBoundingClientRect();
    const left = r.left - pr.left + pan.scrollLeft - pan.clientWidth / 2 + r.width / 2;
    pan.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
  };

  // ---------- effects ----------
  const tween = (ms, fn, done) => {
    if (reduce) { fn(1); done && done(); return; }
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(step); else done && done(); };
    requestAnimationFrame(step);
  };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const cls = (id, c, on = true) => dev[id].classList.toggle(c, on);
  const flashHub = () => { cls('hub', 'on'); setTimeout(() => cls('hub', 'on', false), 500); };
  const pulse = (a, b, color = '#3DF2B0') => new Promise((res) => {
    if (b !== 'hub') focus(b);
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    const c = el('circle', { r: 3.4, fill: color, class: 'pl' }, gFx);
    tween(620, (t) => { const e = ease(t); c.setAttribute('cx', x1 + (x2 - x1) * e); c.setAttribute('cy', y1 + (y2 - y1) * e); }, () => { c.remove(); if (b === 'hub') flashHub(); res(); });
  });
  const ring = (id, color = '#3DF2B0', n = 2) => {
    focus(id);
    if (reduce) return;
    const [x, y] = pos[id];
    for (let i = 0; i < n; i++) setTimeout(() => {
      const c = el('circle', { cx: x, cy: y, r: 9, class: 'rp', stroke: color }, gFx);
      tween(1300, (t) => { c.setAttribute('r', 9 + t * 34); c.setAttribute('opacity', 1 - t); }, () => c.remove());
    }, i * 420);
  };
  const light = (id, on) => {
    cls(id, 'on', on);
    if (LIGHT_ROOM[id]) roomEl[LIGHT_ROOM[id]].classList.toggle('lit', on);
    if (glow[id]) glow[id].classList.toggle('on', on);
  };
  const setDoor = (target) => new Promise((res) => { const from = doorFrac; tween(1700, (t) => { doorFrac = from + (target - from) * ease(t); drawDoor(); }, res); });
  const setLock = (locked) => { cls('lock', 'on', locked); lbl.lock.textContent = locked ? 'front door: locked' : 'front door: unlocked'; };
  const phones = () => new Promise((res) => {
    if (reduce) return res();
    const dots = [0, 1].map((i) => el('circle', { r: 4, class: 'phone-dot' }, gFx));
    tween(2200, (t) => {
      dots.forEach((d, i) => { const e = ease(Math.max(0, Math.min(1, t * 1.15 - i * 0.15))); const [a, b] = P(2.8 + i * 1.4, 11.5 + e * 9.5); d.setAttribute('cx', a); d.setAttribute('cy', b); d.setAttribute('opacity', 1 - Math.max(0, e - 0.75) * 4); });
    }, () => { dots.forEach((d) => d.remove()); res(); });
  });

  // ---------- log + phone ----------
  const logEl = document.getElementById('house-log');
  const noteEl = document.getElementById('house-notes');
  let clock = 0;
  const fmt = (s) => [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  const log = (text, kind = '') => {
    const d = document.createElement('div'); d.className = 'ln ' + kind;
    const b = document.createElement('b'); b.textContent = fmt(clock);
    d.append(b, document.createTextNode(text));
    logEl.append(d);
    while (logEl.children.length > 11) logEl.firstChild.remove();
  };
  const TIERS = { active: ['ROUTINE', 'active'], ts: ['TIME-SENSITIVE', 'ts'], crit: ['CRITICAL · OVERRIDES SILENT MODE', 'crit'] };
  const notify = (tier, title, body) => {
    const [label, c] = TIERS[tier];
    const n = document.createElement('div'); n.className = 'note ' + c;
    const t = document.createElement('div'); t.className = 'tier ' + c; t.textContent = label;
    const h = document.createElement('div'); h.className = 'nt'; h.textContent = title;
    const p = document.createElement('div'); p.className = 'nb'; p.textContent = body;
    n.append(t, h, p); noteEl.prepend(n);
    while (noteEl.children.length > 2) noteEl.lastChild.remove();
  };

  // ---------- scenarios (patterns from the real system) ----------
  const reset = (s = {}) => {
    Object.keys(dev).forEach((id) => dev[id].classList.remove('on', 'alarm', 'stale'));
    Object.values(roomEl).forEach((r) => r.classList.remove('lit'));
    Object.values(glow).forEach((gl) => gl.classList.remove('on'));
    gFx.replaceChildren();
    doorFrac = s.door ?? 1; drawDoor();
    setLock(s.locked ?? true);
    logEl.replaceChildren(); noteEl.replaceChildren();
    clock = s.clock ?? 0;
  };
  const SC = {
    dusk: { name: 'Sunset', setup: { clock: 19 * 3600 + 31 * 60 }, run: async (w) => {
      log('sun → below the horizon'); await w(900);
      light('lamp', true); ring('lamp', '#FFC873'); log('living room lamp → on, until 2:00 AM', 'ok'); await w(900);
      light('yard', true); ring('yard', '#FFC873'); log('back yard lights → on, until 2:00 AM', 'ok'); await w(1400);
      log('no one asked. it just knows what time the sun sets.'); } },
    garage: { name: 'Motion in the garage', setup: { clock: 21 * 3600 + 14 * 60 }, run: async (w) => {
      cls('m_garage', 'on'); ring('m_garage'); log('garage motion → detected'); await pulse('m_garage', 'hub'); await w(300);
      log('workbench light level: 23 lx → dark enough'); await w(700);
      await pulse('hub', 'l_garage'); light('l_garage', true); log('garage lights → on', 'ok'); await w(1500);
      cls('m_garage', 'on', false); clock += 300; log('quiet for 5 minutes'); await w(600);
      light('l_garage', false); log('garage lights → off'); } },
    leave: { name: 'Everyone leaves', setup: { clock: 8 * 3600 + 5 * 60, door: 0, locked: false }, run: async (w) => {
      log('last phone leaves the house'); await phones(); await pulse('proxy', 'hub', '#9B8CFF');
      log('everyone away → securing the house', 'warn'); await w(500);
      await pulse('hub', 'lock'); setLock(true); ring('lock'); log('front door → lock'); await w(600);
      clock += 30; log('verifying: front door reports locked ✓', 'ok'); await w(600);
      await pulse('hub', 'tilt'); log('garage → closing'); await setDoor(1); clock += 14;
      cls('tilt', 'on'); log('verifying: tilt sensor reports closed ✓', 'ok'); await w(500);
      notify('ts', 'House secured', 'Front door locked. Garage closed.'); log('→ alert sent: House secured', 'ok'); } },
    laundry: { name: "Laundry's done", setup: { clock: 14 * 3600 + 2 * 60 }, run: async (w) => {
      cls('washer', 'on'); ring('washer'); log('washer → end of cycle'); await pulse('washer', 'hub'); await w(300);
      notify('active', 'Washer finished', 'Time to move the load.'); log('→ alert sent: routine, respects Do Not Disturb', 'ok'); await w(1800);
      clock += 45 * 60; log('45 minutes later: washer door never opened', 'warn'); ring('washer', '#FFC061'); await w(700);
      notify('active', 'Clothes still in the washer', "They've been sitting for 45 minutes."); log('→ reminder sent (1 of 3)', 'ok'); } },
    art: { name: 'Walk into the living room', setup: { clock: 18 * 3600 + 47 * 60 }, run: async (w) => {
      cls('m_living', 'on'); ring('m_living'); log('living room motion → detected'); await pulse('m_living', 'hub'); await w(300);
      await pulse('hub', 'tv', '#9B8CFF'); cls('tv', 'on'); ring('tv', '#9B8CFF'); log('Frame TV → art mode', 'ok'); await w(1200);
      log('the TV becomes a painting when someone walks in.'); } },
    drive: { name: 'A car pulls in after dark', setup: { clock: 22 * 3600 + 38 * 60 }, run: async (w) => {
      light('flood', true); ring('flood', '#FFC873'); log('driveway floodlight → on'); await w(400);
      await pulse('flood', 'hub'); log('driveway motion → detected'); await w(300);
      await pulse('hub', 'walls'); light('walls', true); log('garage wall lights → on', 'ok'); await w(900);
      log('backstop: the floodlight also counts as motion,'); log('because the camera once went quiet for six days.', 'warn'); } },
    leak: { name: 'Water leak', setup: { clock: 3 * 3600 + 12 * 60 }, run: async (w) => {
      cls('leak', 'alarm'); ring('leak', '#5FB7FF', 3); log('laundry water sensor → WET', 'bad'); await pulse('leak', 'hub', '#5FB7FF'); await w(300);
      notify('crit', 'Water detected', 'Laundry room. Check it now.'); log('→ critical alert: full volume, even on silent', 'bad'); } },
    smoke: { name: 'Smoke or CO', setup: { clock: 17 * 3600 + 51 * 60 }, run: async (w) => {
      cls('smoke_p', 'alarm'); ring('smoke_p', '#FF6B61', 3); log('pantry detector → SMOKE', 'bad'); await pulse('smoke_p', 'hub', '#FF6B61'); await w(300);
      notify('crit', 'Smoke: pantry', 'Each detector alerts on its own, so two alarms never hide each other.'); log('→ critical alert, one per detector', 'bad'); } },
    watchdog: { name: 'A sensor goes quiet', setup: { clock: 6 * 3600 }, run: async (w) => {
      cls('m_bench', 'stale'); lbl.m_bench.textContent = 'workbench motion: last heard 26 h ago'; log('watchdog: checking when every sensor last reported'); await w(900);
      await pulse('hub', 'm_bench', '#FFC061'); ring('m_bench', '#FFC061'); log('workbench motion: silent for 26 hours', 'warn'); await w(600);
      notify('ts', 'Sensor gone quiet', 'Workbench motion stopped reporting. It still says "clear".'); log('→ alert sent: a healthy-looking sensor that stopped talking', 'ok');
      await w(1500); lbl.m_bench.textContent = 'workbench motion'; } },
  };

  // ---------- UI ----------
  const bar = document.getElementById('house-scenarios');
  const order = Object.keys(SC);
  const btn = {};
  for (const k of order) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = SC[k].name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { pausedUntil = Date.now() + 45000; play(k); });
    bar.append(b); btn[k] = b;
  }
  let run = 0, idx = 0, inView = false, busy = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  async function play(k) {
    const id = ++run; busy = true;
    order.forEach((o) => btn[o].setAttribute('aria-pressed', o === k ? 'true' : 'false'));
    reset(SC[k].setup);
    const w = async (ms) => { clock += Math.max(1, Math.round(ms / 400)); await sleep(ms); if (id !== run) throw 0; };
    try { await SC[k].run(w); } catch (e) { return; }
    if (id === run) { busy = false; idx = (order.indexOf(k) + 1) % order.length; }
  }
  // autoplay while visible (paused after a click; off for reduced motion)
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.25 }).observe(svg);
  let lastEnd = 0;
  setInterval(() => {
    if (reduce || !inView || document.hidden || Date.now() < pausedUntil) return;
    if (busy) { lastEnd = Date.now(); return; }
    if (Date.now() - lastEnd > 2600) play(order[idx]);
  }, 400);
  document.getElementById('house-mesh').addEventListener('change', (e) => gMesh.classList.toggle('show', e.target.checked));
  // start phones centred on the house
  requestAnimationFrame(() => { if (pan.scrollWidth > pan.clientWidth) pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) * 0.45; });
  play('dusk');
})();
