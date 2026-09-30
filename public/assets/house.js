// "Watch the house think" - an isometric cutaway of a smart home, generated in SVG,
// replaying real automation patterns: sensor -> hub -> action -> verified -> alert.
// Time of day, lamplight, a car that drives, and "presence" figures that trip sensors.
// Layout and security-device details are illustrative on purpose.
(() => {
  const svg = document.getElementById('house-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = svg.closest('.stage');
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

  // ---------- light model: every surface has a night, day and lamplight colour ----------
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c) => `rgb(${c.join(',')})`;
  const NIGHT = hex('#0A1628'), DAYSKY = hex('#DCE6EE'), WARM = hex('#FFB566');
  const surfaces = [];
  let amb = 0;
  const LIT = {};
  const colourOf = (s) => rgb(LIT[s.room] ? s.l : mix(s.n, s.d, amb));
  const paint = (elm, room, h, shade = 1) => {
    const c = hex(h).map((v) => v * shade);
    const s = { el: elm, room: room || 'site', n: mix(c, NIGHT, 0.62), d: mix(c, DAYSKY, 0.08), l: mix(c.map((v) => Math.min(255, v * 1.1)), WARM, 0.24) };
    surfaces.push(s);
    elm.style.fill = colourOf(s);
    return elm;
  };
  const refresh = (room) => surfaces.forEach((s) => { if (!room || s.room === room) s.el.style.fill = colourOf(s); });
  const setAmbient = (a) => {
    amb = a;
    refresh();
    const top = mix(hex('#070D18'), hex('#8FB4D0'), a), bot = mix(hex('#0A1220'), hex('#E9D7B8'), a * 0.9);
    if (stage) { stage.style.background = `linear-gradient(180deg, ${rgb(top)}, ${rgb(bot)})`; stage.classList.toggle('day', a > 0.55); }
  };

  // ---------- defs ----------
  const defs = el('defs');
  const radial = (id, c1, c2) => { const r = el('radialGradient', { id }, defs);
    el('stop', { offset: '0', 'stop-color': c1, 'stop-opacity': '.9' }, r);
    el('stop', { offset: '.45', 'stop-color': c2, 'stop-opacity': '.38' }, r);
    el('stop', { offset: '1', 'stop-color': c2, 'stop-opacity': '0' }, r); };
  radial('lp', '#FFD890', '#FFB566'); radial('lpRed', '#FF5A4F', '#E0453A'); radial('lpBlue', '#8FD3FF', '#3A8BD6');
  const lin = (id, stops, attrs) => { const l = el('linearGradient', { id, ...attrs }, defs); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, l)); };
  lin('art', [['0', '#3DF2B0', 1], ['.5', '#7CD3E0', 1], ['1', '#9B8CFF', 1]], { x1: '0', y1: '0', x2: '1', y2: '1' });
  lin('beam', [['0', '#FFF2C8', 0.75], ['1', '#FFE39A', 0]], { x1: '1', y1: '0', x2: '0', y2: '1' });

  const gBase = g(), gFloor = g(), gPools = g(), gScene = g(), gTop = g(), gMesh = g('mesh'), gDev = g(), gFx = g();

  // ---------- site ----------
  paint(el('polygon', { points: pts([[-3, -7], [23, -7], [23, 22], [-3, 22]]) }, gBase), 'site', '#3E6B45', 0.95);
  paint(el('polygon', { points: pts([[0, 14.4], [6.4, 14.4], [6.4, 22], [0, 22]]) }, gBase), 'drive', '#6A727C');
  paint(el('polygon', { points: pts([[7.4, 14.2], [10.8, 14.2], [10.8, 16.2], [7.4, 16.2]]) }, gBase), 'porch', '#8A7A68');
  paint(el('polygon', { points: pts([[6, -4.5], [13, -4.5], [13, -1.2], [6, -1.2]]) }, gBase), 'yard', '#8C8276');
  const lbl0 = (x, y, text) => { const [a, b] = P(x, y); const t = el('text', { x: a, y: b, class: 'rlabel', 'text-anchor': 'middle' }, gBase); t.textContent = text; };
  lbl0(3.2, 20.6, 'DRIVEWAY'); lbl0(9.5, -5.6, 'BACK YARD');

  // ---------- rooms ----------
  const ROOMS = {
    office: [0, 0, 7, 7, 'OFFICE', '#9A7B5A'], laundry: [7, 0, 11, 7, 'LAUNDRY', '#B8BEC4'], kitchen: [11, 0, 20, 7, 'KITCHEN', '#C8CDD2'],
    pantry: [17, 0, 20, 3, 'PANTRY', '#A08A6C'], garage: [0, 7, 7, 14, 'GARAGE', '#8E959C'], living: [7, 7, 20, 14, 'LIVING ROOM', '#A5815D'],
  };
  const roomLabel = {};
  for (const [k, [x0, y0, x1, y1, name, col]] of Object.entries(ROOMS)) {
    paint(el('polygon', { points: pts([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), class: 'floor' }, gFloor), k, col);
    const [a, b] = P((x0 + x1) / 2, (y0 + y1) / 2);
    roomLabel[k] = el('text', { x: a, y: b + 3, class: 'rlabel', 'text-anchor': 'middle' }, gFloor);
    roomLabel[k].textContent = name;
  }
  el('polygon', { points: pts([[0, 14, 0], [20, 14, 0], [20, 14, -0.7], [0, 14, -0.7]]), class: 'slab' }, gBase);
  el('polygon', { points: pts([[20, 0, 0], [20, 14, 0], [20, 14, -0.7], [20, 0, -0.7]]), class: 'slab2' }, gBase);

  const pools = {};
  const addPool = (room, x, y, r, grad = 'lp', key = room) => {
    const [a, b] = P(x, y);
    (pools[key] = pools[key] || []).push(el('ellipse', { cx: a, cy: b, rx: r * U * 1.25, ry: r * U * 0.72, fill: `url(#${grad})`, class: 'pool' }, gPools));
  };
  addPool('office', 2.2, 2.6, 3.6); addPool('laundry', 9, 3.2, 2.8); addPool('kitchen', 14.2, 3.4, 4.2);
  addPool('pantry', 18.5, 1.6, 1.9); addPool('garage', 3.6, 10.6, 4); addPool('living', 14.5, 11.2, 5.4);
  addPool('yard', 9.5, -3, 4.6); addPool('drive', 3.4, 17, 4); addPool('porch', 9, 15.3, 2.2);
  addPool('x', 18.5, 1.6, 2.4, 'lpRed', 'smoke'); addPool('x', 15, 3, 4.2, 'lpRed', 'smoke');
  const [pdx, pdy] = P(8.2, 2.4);
  const puddle = el('ellipse', { cx: pdx, cy: pdy, rx: 0, ry: 0, class: 'puddle' }, gPools);

  // ---------- scene objects (painter's order: back to front) ----------
  const items = [];
  const face = (gg, room, col, shade, p3) => paint(el('polygon', { points: pts(p3) }, gg), room, col, shade);
  const boxFaces = (gg, x, y, w, d, h, col, room, z0 = 0) => {
    const z1 = z0 + h;
    face(gg, room, col, 0.62, [[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]);
    face(gg, room, col, 0.8, [[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]);
    face(gg, room, col, 1, [[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]]);
  };
  const box = (x, y, w, d, h, col, room, z0 = 0) => items.push({ k: x + w / 2 + y + d / 2 + z0 * 0.01, draw: () => boxFaces(el('g', {}, gScene), x, y, w, d, h, col, room, z0) });
  const planeY = (x0, x1, y, z0, z1, col, room, cls) => items.push({ k: (x0 + x1) / 2 + y - 0.05, draw: () =>
    paint(el('polygon', { points: pts([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]), class: cls || '' }, gScene), room, col, 0.7) });
  const planeX = (y0, y1, x, z0, z1, col, room, cls) => items.push({ k: x + (y0 + y1) / 2 - 0.05, draw: () =>
    paint(el('polygon', { points: pts([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]), class: cls || '' }, gScene), room, col, 0.85) });

  const WALL = '#C7D2DC', WH = 2.8, windows = {};
  [['office', 0, 7], ['laundry', 7, 11], ['kitchen', 11, 17], ['pantry', 17, 20]].forEach(([r, a, b]) => items.push({ k: -10 + a * 0.01, draw: () =>
    paint(el('polygon', { points: pts([[a, 0, 0], [b, 0, 0], [b, 0, WH], [a, 0, WH]]), class: 'wallf' }, gScene), r, WALL, 0.75) }));
  [['office', 0, 7], ['garage', 7, 14]].forEach(([r, a, b]) => items.push({ k: -10 + a * 0.01, draw: () =>
    paint(el('polygon', { points: pts([[0, a, 0], [0, b, 0], [0, b, WH], [0, a, WH]]), class: 'wallf' }, gScene), r, WALL, 0.9) }));
  const win = (room, p3) => items.push({ k: -1, draw: () => { const w = el('polygon', { points: pts(p3), class: 'win' }, gScene); (windows[room] = windows[room] || []).push(w); } });
  win('office', [[2, 0, 1.1], [4.6, 0, 1.1], [4.6, 0, 2.2], [2, 0, 2.2]]);
  win('laundry', [[8.4, 0, 1.4], [10.2, 0, 1.4], [10.2, 0, 2.3], [8.4, 0, 2.3]]);
  win('kitchen', [[11.8, 0, 1.3], [15.2, 0, 1.3], [15.2, 0, 2.3], [11.8, 0, 2.3]]);
  win('office', [[0, 4.3, 1.1], [0, 6.2, 1.1], [0, 6.2, 2.2], [0, 4.3, 2.2]]);
  win('garage', [[0, 9, 1.4], [0, 11.2, 1.4], [0, 11.2, 2.1], [0, 9, 2.1]]);

  const IW = '#AEBBC7', ih = 0.9;
  planeX(0, 7, 7, 0, ih, IW, 'laundry'); planeX(7, 12.6, 7, 0, ih, IW, 'living');
  planeX(0, 7, 11, 0, ih, IW, 'kitchen'); planeX(0, 3, 17, 0, ih, IW, 'pantry');
  planeY(0, 5.5, 7, 0, ih, IW, 'garage'); planeY(7, 12.2, 7, 0, ih, IW, 'living'); planeY(17.5, 20, 7, 0, ih, IW, 'living');
  planeY(17, 18.2, 3, 0, ih, IW, 'pantry'); planeY(19.2, 20, 3, 0, ih, IW, 'pantry');
  planeY(7, 7.9, 14, 0, 0.45, IW, 'living'); planeY(10.2, 20, 14, 0, 0.45, IW, 'living');
  planeX(0, 14, 20, 0, 0.45, IW, 'living');

  box(1, 0.9, 2.8, 1.1, 0.75, '#8A6A4A', 'office'); box(4.1, 0.7, 0.8, 0.5, 1.25, '#1E2A36', 'office', 0.75);
  box(1.9, 2.4, 0.9, 0.9, 0.5, '#2F6A80', 'office'); box(1.9, 3.2, 0.9, 0.18, 1.2, '#2F6A80', 'office');
  box(0.1, 3.4, 0.6, 2.8, 2.0, '#6E5238', 'office');
  box(7.2, 0.25, 1.1, 1.1, 1.05, '#EEF2F5', 'laundry'); box(8.45, 0.25, 1.1, 1.1, 1.05, '#EEF2F5', 'laundry'); box(9.8, 0.25, 1.0, 0.8, 0.9, '#CDD4DA', 'laundry');
  box(11.2, 0.25, 1.7, 0.85, 0.92, '#E3E8EC', 'kitchen'); box(12.9, 0.25, 1.1, 0.85, 0.95, '#3A4148', 'kitchen'); box(14.0, 0.25, 1.6, 0.85, 0.92, '#E3E8EC', 'kitchen');
  box(15.7, 0.2, 1.1, 0.95, 2.05, '#EEF2F5', 'kitchen');
  box(12.8, 3.4, 3.4, 1.3, 0.92, '#B08760', 'kitchen');
  box(13.2, 4.9, 0.55, 0.55, 0.7, '#2F3A45', 'kitchen'); box(14.4, 4.9, 0.55, 0.55, 0.7, '#2F3A45', 'kitchen'); box(15.6, 4.9, 0.55, 0.55, 0.7, '#2F3A45', 'kitchen');
  box(17.2, 0.2, 2.6, 0.55, 2.1, '#8A6A4A', 'pantry');
  box(0.15, 11.6, 0.9, 2.2, 0.92, '#7A5A3C', 'garage'); box(5.8, 7.25, 1.0, 0.55, 1.9, '#4A5560', 'garage');
  box(9.6, 8.8, 6.6, 3.8, 0.02, '#46557A', 'living'); box(13.0, 7.2, 3.2, 0.55, 0.55, '#6B4E34', 'living');
  box(10.2, 12.2, 5.0, 1.0, 0.45, '#3F7F92', 'living'); box(10.2, 13.0, 5.0, 0.35, 1.0, '#357083', 'living');
  box(10.2, 11.2, 0.5, 2.1, 0.7, '#357083', 'living'); box(14.7, 11.2, 0.5, 2.1, 0.7, '#357083', 'living');
  box(11.6, 9.9, 2.2, 1.1, 0.42, '#8A6A4A', 'living');
  box(17.2, 9.4, 1.3, 1.3, 0.5, '#9A5E44', 'living'); box(18.35, 9.4, 0.3, 1.3, 1.0, '#834E38', 'living');
  box(19.1, 12.9, 0.55, 0.55, 0.55, '#5A4A3A', 'living'); box(19.0, 12.8, 0.75, 0.75, 0.55, '#4C9A62', 'living', 0.55);
  box(18.5, 12.7, 0.12, 0.12, 1.7, '#8A8F94', 'living'); box(18.25, 12.45, 0.6, 0.6, 0.45, '#F2E2C4', 'living', 1.7);
  let tvScreen;
  items.push({ k: 14.6 + 7.25, draw: () => { tvScreen = el('polygon', { points: pts([[13.3, 7.45, 0.6], [15.9, 7.45, 0.6], [15.9, 7.45, 2.0], [13.3, 7.45, 2.0]]), class: 'tv' }, gScene); } });
  const tree = (x, y, s) => items.push({ k: x + y, draw: () => {
    const gg = el('g', {}, gScene);
    paint(el('polygon', { points: pts([[x - 0.15, y, 0], [x + 0.15, y, 0], [x + 0.15, y, 1.4 * s], [x - 0.15, y, 1.4 * s]]) }, gg), 'yard', '#6A4C34', 0.8);
    const [a, b] = P(x, y, 2.4 * s);
    paint(el('ellipse', { cx: a, cy: b, rx: 30 * s, ry: 34 * s }, gg), 'yard', '#3C7A4E');
    paint(el('ellipse', { cx: a - 8 * s, cy: b - 10 * s, rx: 16 * s, ry: 16 * s }, gg), 'yard', '#4E9660');
  } });
  tree(2.2, -3.4, 1.05); tree(17.2, -4.4, 1.2); tree(21.2, -2.2, 0.85);
  box(8.2, -3.6, 2.2, 1.2, 0.6, '#7A6754', 'yard');

  let door, doorLines = [], doorFrac = 1;
  const drawDoor = () => {
    if (!door) return;
    const top = 2.25, bottom = top - 2.0 * doorFrac;
    door.setAttribute('points', pts([[1, 14, bottom], [6, 14, bottom], [6, 14, top], [1, 14, top]]));
    doorLines.forEach((ln, i) => { const z = bottom + (i + 1) * (top - bottom) / 4; ln.setAttribute('points', pts([[1.1, 14, z], [5.9, 14, z]])); ln.style.opacity = doorFrac > 0.15 ? 1 : 0; });
  };
  items.push({ k: 3.5 + 14.5, draw: () => {
    door = paint(el('polygon', { class: 'gdoor' }, gScene), 'garage', '#DDE4EA', 0.85);
    doorLines = [0, 1, 2].map(() => el('polyline', { class: 'gline' }, gScene));
    drawDoor();
  } });
  planeY(0, 1, 14, 0, 2.3, WALL, 'garage'); planeY(6, 7, 14, 0, 2.3, WALL, 'garage');

  let fdoor, fin, fridgeFrac = 0;
  const FX0 = 15.7, FX1 = 16.8, FY = 1.15, FH = 2.05;
  const drawFridge = () => {
    if (!fdoor) return;
    const th = Math.PI - fridgeFrac * (Math.PI * 0.55), L = FX1 - FX0;
    const fx = FX1 + L * Math.cos(th), fy = FY + L * Math.sin(th);
    fdoor.setAttribute('points', pts([[fx, fy, 0.05], [FX1, FY, 0.05], [FX1, FY, FH], [fx, fy, FH]]));
    fin.style.opacity = fridgeFrac;
  };
  items.push({ k: 16.25 + 1.2, draw: () => {
    fin = el('polygon', { class: 'fin', points: pts([[FX0 + 0.08, FY, 0.1], [FX1 - 0.08, FY, 0.1], [FX1 - 0.08, FY, FH - 0.08], [FX0 + 0.08, FY, FH - 0.08]]) }, gScene);
    fdoor = paint(el('polygon', { class: 'fdoor' }, gScene), 'kitchen', '#F2F5F7', 0.9); drawFridge();
  } });

  let car, carSlot, carOff = 0, beams, tails;
  items.push({ k: 2.55 + 10.4, draw: () => {
    carSlot = el('g', {}, gScene);
    car = el('g', { class: 'car' }, carSlot);
    beams = el('polygon', { class: 'beam', points: pts([[1.7, 8.1, 0.35], [3.4, 8.1, 0.35], [4.6, 3.4, 0], [0.5, 3.4, 0]]) }, car);
    boxFaces(car, 1.4, 8.1, 2.3, 4.6, 0.75, '#C8513A', 'garage');
    boxFaces(car, 1.6, 9.2, 1.9, 2.4, 0.55, '#6A2A1F', 'garage', 0.75);
    tails = [[1.55, 1.95], [3.15, 3.55]].map(([a, b]) => el('polygon', { class: 'tail', points: pts([[a, 12.7, 0.42], [b, 12.7, 0.42], [b, 12.7, 0.6], [a, 12.7, 0.6]]) }, car));
  } });
  const placeCar = () => {
    const dx = -carOff * C * U, dy = carOff * 0.5 * U;
    car.setAttribute('transform', `translate(${dx.toFixed(1)},${dy.toFixed(1)})`);
    const want = carOff > 0.4 ? gTop : carSlot;
    if (car.parentNode !== want) want.appendChild(car);
  };

  items.sort((a, b) => a.k - b.k).forEach((it) => it.draw());

  // ---------- lighting ----------
  const setRoom = (room, on) => {
    LIT[room] = on;
    refresh(room);
    (pools[room] || []).forEach((p) => p.classList.toggle('on', on));
    (windows[room] || []).forEach((w) => w.classList.toggle('on', on));
    if (roomLabel[room]) roomLabel[room].classList.toggle('on', on);
  };
  const setTV = (on) => tvScreen && tvScreen.classList.toggle('on', on);

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
    hub: [0.4, 4.2, 'hub', 'Home Assistant hub', 2.1], zb: [0.4, 5.6, 'zb', 'Zigbee coordinator', 2.1],
    m_garage: [0.2, 7.6, 'motion', 'garage motion', 2.3], m_bench: [0.2, 12.6, 'motion', 'workbench motion', 1.6],
    l_garage: [3.6, 10.4, 'light', 'garage lights', 2.6], tilt: [3.5, 13.8, 'tilt', 'door tilt sensor', 2.2],
    m_laundry: [10.8, 0.1, 'motion', 'laundry motion', 2.3], l_laundry: [9, 3.4, 'light', 'laundry lights', 2.6],
    leak: [7.7, 1.8, 'leak', 'water sensor'], washer: [7.75, 0.8, 'washer', 'washer + dryer', 1.05],
    range: [13.45, 0.65, 'range', 'range', 0.95], fridge: [16.25, 0.7, 'fridge', 'fridge', 2.05],
    smoke_p: [19.4, 1.8, 'smoke', 'smoke / CO', 2.6], l_pantry: [18.4, 1.8, 'light', 'pantry light', 2.6],
    m_living: [7.2, 7.2, 'motion', 'living room motion', 2.2], lamp: [18.55, 12.75, 'light', 'lamp', 2.2],
    tv: [14.6, 7.45, 'tv', 'Frame TV', 2.3], sonos: [16.6, 7.45, 'speaker', 'speaker', 0.55],
    thermo: [7.1, 10.4, 'thermo', 'thermostat', 1.5], proxy: [8.2, 13.2, 'bt', 'ESPHome BT proxy', 0.9],
    lock: [8.9, 14.0, 'lock', 'front door', 1.0], bell: [10.0, 14.1, 'cam', 'doorbell camera', 1.4],
    flood: [0.1, 14.1, 'cam', 'driveway camera', 2.4], walls: [6.8, 14.2, 'light', 'garage wall lights', 1.9],
    porch: [10.4, 15.8, 'speaker', 'porch speaker', 0.4], yard: [9.6, -1.4, 'light', 'back yard lights', 1.8],
    r1: [12.4, 3.6, 'plug', 'smart plug (router)', 0.95], r2: [15.9, 11.6, 'plug', 'smart plug (router)', 0.45],
    smoke_u: [3.4, 4.2, 'smoke', 'smoke / CO, upstairs', 3.4],
  };
  const LIGHT_ROOM = { l_garage: 'garage', l_laundry: 'laundry', l_pantry: 'pantry', lamp: 'living', yard: 'yard', walls: 'drive', flood: 'drive' };
  const dev = {}, lbl = {}, pos = {};
  for (const [id, [x, y, t, name, z = 0]] of Object.entries(D)) {
    const [a, b] = P(x, y, z);
    pos[id] = [a, b];
    const gg = el('g', { class: 'dev', transform: `translate(${a.toFixed(1)},${b.toFixed(1)})` }, gDev);
    el('circle', { r: 17, class: 'hit' }, gg);
    el('circle', { r: 9.5, class: 'ring0' }, gg);
    el('path', { d: I[t], class: 'ic' }, gg);
    const l = el('text', { y: -13, class: 'lbl', 'text-anchor': 'middle' }, gg);
    l.textContent = name;
    dev[id] = gg; lbl[id] = l;
  }
  const MESH = [['zb', 'r1'], ['zb', 'r2'], ['zb', 'm_garage'], ['zb', 'm_bench'], ['r1', 'm_laundry'], ['r1', 'leak'], ['r1', 'l_pantry'], ['r2', 'm_living'], ['r2', 'tilt'], ['r2', 'l_garage']];
  for (const [a, b] of MESH) el('line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1] }, gMesh);

  // ---------- camera: on narrow screens glide to the action ----------
  const pan = svg.parentElement;
  let focusTimer = 0;
  const focusXY = (x, y) => {
    if (!pan || pan.scrollWidth <= pan.clientWidth + 4) return;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      const vb = svg.viewBox.baseVal, scale = svg.getBoundingClientRect().width / vb.width;
      const left = (x - vb.x) * scale - pan.clientWidth / 2;
      pan.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
    }, 140);
  };
  const focus = (id) => focusXY(...pos[id]);

  // ---------- effects ----------
  const tween = (ms, fn, done) => {
    if (reduce) { fn(1); done && done(); return; }
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(step); else done && done(); };
    requestAnimationFrame(step);
  };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const tweenP = (ms, fn) => new Promise((res) => tween(ms, fn, res));
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
  const light = (id, on) => { cls(id, 'on', on); if (LIGHT_ROOM[id]) setRoom(LIGHT_ROOM[id], on); };
  const setDoor = (target) => { const from = doorFrac; return tweenP(1900, (t) => { doorFrac = from + (target - from) * ease(t); drawDoor(); }); };
  const setFridge = (target, ms = 900) => { const from = fridgeFrac; return tweenP(ms, (t) => { fridgeFrac = from + (target - from) * ease(t); drawFridge(); }); };
  const setLock = (locked) => { cls('lock', 'on', locked); lbl.lock.textContent = locked ? 'front door: locked' : 'front door: unlocked'; };
  const driveCar = (target, ms) => { const from = carOff; focusXY(...P(2.5, 10.4 + target)); return tweenP(ms, (t) => { carOff = from + (target - from) * ease(t); placeCar(); }); };
  const carLights = (head, tail) => { beams.classList.toggle('on', head); tails.forEach((t) => t.classList.toggle('on', tail)); };
  const ambTo = (a, ms = 1400) => { const from = amb; return tweenP(ms, (t) => setAmbient(from + (a - from) * t)); };

  const people = [];
  const person = (x, y) => {
    const gg = el('g', { class: 'person' }, gTop);
    el('ellipse', { cx: 0, cy: 0, rx: 7, ry: 3.5, class: 'pshadow' }, gg);
    el('path', { d: 'M-5,-4 C-5,-26 5,-26 5,-4 Z', class: 'pbody' }, gg);
    el('circle', { cx: 0, cy: -31, r: 5, class: 'pbody' }, gg);
    const p = { gg, x, y };
    p.place = (bob = 0) => { const [a, b] = P(p.x, p.y); gg.setAttribute('transform', `translate(${a.toFixed(1)},${(b - bob).toFixed(1)}) scale(1.6)`); };
    p.place(); people.push(p);
    return p;
  };
  const walk = async (p, path, speed = 2.6) => {
    for (const [tx, ty] of path) {
      const fx = p.x, fy = p.y, dist = Math.hypot(tx - fx, ty - fy);
      focusXY(...P(tx, ty));
      await tweenP(Math.max(200, (dist / speed) * 1000), (t) => { p.x = fx + (tx - fx) * t; p.y = fy + (ty - fy) * t; p.place(Math.abs(Math.sin(t * dist * 3.2)) * 2.2); });
    }
  };
  const leave = (p) => tweenP(500, (t) => { p.gg.style.opacity = 1 - t; }).then(() => p.gg.remove());

  // ---------- log, phone, clock ----------
  const logEl = document.getElementById('house-log');
  const noteEl = document.getElementById('house-notes');
  const clockEl = document.createElement('div'); clockEl.className = 'hclock mono'; if (stage) stage.append(clockEl);
  let clock = 0;
  const fmt = (s) => [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  const fmt12 = (s) => { const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const tick = () => { const h = Math.floor(clock / 3600) % 24; clockEl.textContent = `${h >= 7 && h < 19 ? '☀' : '☽'}  ${fmt12(clock)}`; };
  const log = (text, kind = '') => {
    const d = document.createElement('div'); d.className = 'ln ' + kind;
    const b = document.createElement('b'); b.textContent = fmt(clock);
    d.append(b, document.createTextNode(text));
    logEl.append(d);
    while (logEl.children.length > 11) logEl.firstChild.remove();
    tick();
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

  for (const [id, [, , , name]] of Object.entries(D)) {
    const gg = dev[id];
    gg.setAttribute('tabindex', '0'); gg.setAttribute('role', 'button'); gg.setAttribute('aria-label', name);
    const poke = () => {
      pausedUntil = Date.now() + 20000;
      gg.classList.add('peek'); setTimeout(() => gg.classList.remove('peek'), 2600);
      ring(id, '#7CD3E0', 1);
      if (id !== 'hub') pulse(id, 'hub', '#7CD3E0');
      log(name + ' → reporting in');
    };
    gg.addEventListener('click', poke);
    gg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
  }

  // ---------- scenarios (patterns from the real system) ----------
  const reset = (s = {}) => {
    Object.keys(dev).forEach((id) => dev[id].classList.remove('on', 'alarm', 'stale'));
    [...Object.keys(ROOMS), 'yard', 'drive', 'porch'].forEach((r) => setRoom(r, false));
    (pools.smoke || []).forEach((p) => p.classList.remove('on'));
    setTV(false);
    fridgeFrac = s.fridge ?? 0; drawFridge();
    doorFrac = s.door ?? 1; drawDoor();
    carOff = s.car ?? 0; car.style.opacity = 1; carLights(false, false); placeCar();
    people.splice(0).forEach((p) => p.gg.remove());
    puddle.setAttribute('rx', 0); puddle.setAttribute('ry', 0);
    gFx.replaceChildren();
    setLock(s.locked ?? true);
    lbl.m_bench.textContent = 'workbench motion';
    logEl.replaceChildren(); noteEl.replaceChildren();
    clock = s.clock ?? 0; tick();
    setAmbient(s.amb ?? 0);
  };
  const SC = {
    dusk: { name: 'Sunset', setup: { clock: 19 * 3600 + 22 * 60, amb: 0.85 }, run: async (w) => {
      log('the sun is going down'); await ambTo(0.45, 1800); clock += 5 * 60;
      await ambTo(0.12, 1600); clock += 4 * 60; log('sun → below the horizon');
      light('lamp', true); ring('lamp', '#FFC873'); log('living room lamp → on, until 2:00 AM', 'ok'); await w(800);
      light('yard', true); ring('yard', '#FFC873'); log('back yard lights → on, until 2:00 AM', 'ok');
      await ambTo(0, 1200); await w(600);
      log('no one asked. it just knows when the sun sets.'); } },
    garage: { name: 'Motion in the garage', setup: { clock: 21 * 3600 + 14 * 60, amb: 0 }, run: async (w) => {
      const p = person(7.6, 10.2); log('someone walks into the garage');
      const walking = walk(p, [[5.2, 10.5], [3.6, 12.6], [1.5, 12.8]], 2.4);
      await w(700); cls('m_garage', 'on'); ring('m_garage'); log('garage motion → detected'); await pulse('m_garage', 'hub');
      log('workbench light level: 23 lx → dark enough'); await w(300);
      await pulse('hub', 'l_garage'); light('l_garage', true); log('garage lights → on', 'ok');
      await walking; await w(1400);
      await walk(p, [[3.8, 12.2], [7.6, 10.2]], 2.6); await leave(p);
      cls('m_garage', 'on', false); clock += 300; log('quiet for 5 minutes'); await w(500);
      light('l_garage', false); log('garage lights → off'); } },
    leave: { name: 'Everyone leaves', setup: { clock: 8 * 3600 + 5 * 60, amb: 1, door: 0, locked: false }, run: async (w) => {
      log('the last people leave, by car'); carLights(false, true); await w(400);
      await driveCar(9.5, 2600); await tweenP(400, (t) => { car.style.opacity = 1 - t; });
      await pulse('proxy', 'hub', '#9B8CFF'); log('everyone away → securing the house', 'warn'); await w(400);
      await pulse('hub', 'lock'); setLock(true); ring('lock'); log('front door → lock'); await w(600);
      clock += 30; log('verifying: front door reports locked ✓', 'ok'); await w(500);
      await pulse('hub', 'tilt'); log('garage → closing'); await setDoor(1); clock += 14;
      cls('tilt', 'on'); log('verifying: tilt sensor reports closed ✓', 'ok'); await w(400);
      notify('ts', 'House secured', 'Front door locked. Garage closed.'); log('→ alert sent: House secured', 'ok'); } },
    laundry: { name: "Laundry's done", setup: { clock: 14 * 3600 + 2 * 60, amb: 1 }, run: async (w) => {
      cls('washer', 'on'); ring('washer'); log('washer → end of cycle'); await pulse('washer', 'hub'); await w(300);
      notify('active', 'Washer finished', 'Time to move the load.'); log('→ alert sent: routine, respects Do Not Disturb', 'ok'); await w(1800);
      clock += 45 * 60; log('45 minutes later: washer door never opened', 'warn'); ring('washer', '#FFC061'); await w(700);
      notify('active', 'Clothes still in the washer', "They've been sitting for 45 minutes."); log('→ reminder sent (1 of 3)', 'ok'); } },
    art: { name: 'Walk into the living room', setup: { clock: 18 * 3600 + 47 * 60, amb: 0.3 }, run: async (w) => {
      const p = person(8.6, 13.4); log('someone comes in the front door');
      const walking = walk(p, [[9.4, 11.4], [11.4, 10.6], [12.2, 9.4]], 2.2);
      await w(900); cls('m_living', 'on'); ring('m_living'); log('living room motion → detected'); await pulse('m_living', 'hub');
      await pulse('hub', 'tv', '#9B8CFF'); cls('tv', 'on'); setTV(true); ring('tv', '#9B8CFF'); log('Frame TV → art mode', 'ok');
      await walking; await w(900); log('the TV becomes a painting when someone walks in.'); } },
    drive: { name: 'A car pulls in after dark', setup: { clock: 22 * 3600 + 38 * 60, amb: 0, car: 8.6 }, run: async (w) => {
      carLights(true, false); focusXY(...P(3.4, 19)); log('headlights on the driveway'); await w(700);
      light('flood', true); ring('flood', '#FFC873'); log('driveway floodlight → on'); await w(300);
      await pulse('flood', 'hub'); log('driveway motion → detected');
      await pulse('hub', 'walls'); light('walls', true); log('garage wall lights → on', 'ok'); await w(500);
      log('garage → opening'); ring('tilt'); await setDoor(0); cls('tilt', 'on');
      notify('active', 'Garage opened', 'Welcome home.'); log('→ alert sent: routine', 'ok');
      await driveCar(0, 2600); carLights(false, false); await pulse('hub', 'l_garage'); light('l_garage', true); log('garage lights → on', 'ok'); await w(700);
      log('backstop: the floodlight also counts as motion,'); log('because the camera once went quiet for six days.', 'warn'); } },
    leak: { name: 'Water leak', setup: { clock: 3 * 3600 + 12 * 60, amb: 0 }, run: async (w) => {
      log('water under the washer'); focus('leak');
      await tweenP(1600, (t) => { puddle.setAttribute('rx', 60 * t); puddle.setAttribute('ry', 30 * t); });
      cls('leak', 'alarm'); ring('leak', '#5FB7FF', 3); log('laundry water sensor → WET', 'bad'); await pulse('leak', 'hub', '#5FB7FF');
      light('l_laundry', true);
      notify('crit', 'Water detected', 'Laundry room. Check it now.'); log('→ critical alert: full volume, even on silent', 'bad');
      await tweenP(1500, (t) => { puddle.setAttribute('rx', 60 + 24 * t); puddle.setAttribute('ry', 30 + 12 * t); }); } },
    smoke: { name: 'Smoke or CO', setup: { clock: 17 * 3600 + 51 * 60, amb: 0.45 }, run: async (w) => {
      cls('smoke_p', 'alarm'); ring('smoke_p', '#FF6B61', 3); log('pantry detector → SMOKE', 'bad'); await pulse('smoke_p', 'hub', '#FF6B61');
      notify('crit', 'Smoke: pantry', 'Each detector alerts on its own, so two alarms never hide each other.'); log('→ critical alert, one per detector', 'bad');
      for (let i = 0; i < 6; i++) { (pools.smoke || []).forEach((p) => p.classList.toggle('on', i % 2 === 0)); await w(420); }
      (pools.smoke || []).forEach((p) => p.classList.add('on')); } },
    fridge: { name: 'Fridge left open', setup: { clock: 16 * 3600 + 20 * 60, amb: 0.9 }, run: async (w) => {
      const p = person(18.4, 6.2); log('someone heads for the fridge');
      await walk(p, [[17.4, 2.8]], 2.2);
      log('refrigerator door → open'); await setFridge(1); cls('fridge', 'on'); ring('fridge', '#CFEFFF'); await pulse('fridge', 'hub');
      await w(600); await walk(p, [[18.6, 6.4]], 2.4); await leave(p); log('...and walks away'); await w(700);
      clock += 180; log('still open after 3 minutes', 'warn'); ring('fridge', '#FFC061'); await w(400);
      notify('active', 'Refrigerator door open', 'The fridge has been open for 3 minutes.'); log('→ alert sent (repeats up to 4 times)', 'ok'); await w(1600);
      log('refrigerator door → closed'); await setFridge(0); cls('fridge', 'on', false); log('alert cleared', 'ok'); } },
    gopen: { name: 'Garage left open', setup: { clock: 17 * 3600 + 5 * 60, amb: 0.7 }, run: async (w) => {
      log('garage → opening'); ring('tilt'); await setDoor(0); cls('tilt', 'on'); await pulse('tilt', 'hub'); log('garage → open'); await w(1300);
      clock += 30 * 60; log('open for 30 minutes', 'warn'); ring('tilt', '#FFC061', 3); await w(500);
      notify('ts', 'Garage still open', 'It has been open for 30 minutes.'); log('→ alert sent: time-sensitive, repeats up to 4 times', 'ok'); await w(1700);
      log('closed from the phone'); await pulse('hub', 'tilt'); await setDoor(1); cls('tilt', 'on', false); log('verifying: tilt sensor reports closed ✓', 'ok'); } },
    watchdog: { name: 'A sensor goes quiet', setup: { clock: 6 * 3600, amb: 0.15 }, run: async (w) => {
      cls('m_bench', 'stale'); lbl.m_bench.textContent = 'workbench motion: last heard 26 h ago'; log('watchdog: checking when every sensor last reported'); await w(900);
      await pulse('hub', 'm_bench', '#FFC061'); ring('m_bench', '#FFC061'); log('workbench motion: silent for 26 hours', 'warn'); await w(600);
      notify('ts', 'Sensor gone quiet', 'Workbench motion stopped reporting. It still says "clear".'); log('→ alert sent: a healthy-looking sensor that stopped talking', 'ok'); } },
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
    const w = async (ms) => { clock += Math.max(1, Math.round(ms / 400)); tick(); await sleep(ms); if (id !== run) throw 0; };
    try { await SC[k].run(w); } catch (e) { return; }
    if (id === run) { busy = false; idx = (order.indexOf(k) + 1) % order.length; }
  }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.25 }).observe(svg);
  let lastEnd = 0;
  setInterval(() => {
    if (reduce || !inView || document.hidden || Date.now() < pausedUntil) return;
    if (busy) { lastEnd = Date.now(); return; }
    if (Date.now() - lastEnd > 2600) play(order[idx]);
  }, 400);
  document.getElementById('house-mesh').addEventListener('change', (e) => gMesh.classList.toggle('show', e.target.checked));
  requestAnimationFrame(() => { if (pan.scrollWidth > pan.clientWidth) pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) * 0.45; });
  play('dusk');
})();
