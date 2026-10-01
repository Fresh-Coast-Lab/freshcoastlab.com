// When the lake is frozen solid (the temperature slider at the bottom), a dog sled team and a snowmobile take turns crossing the ice.
// Silhouettes, like everyone else on the shore. And if the ice thaws under anybody (them, or a character from the shore acts in
// ufo.js), they go through it: cracks, a splash, and a comic swim for it. window.__iceFall() is the shared helper for that.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const HZ = 0.36, INK = '#05070B', FAR = '#0B1017', RIM = 'drop-shadow(0 0 .9px rgba(160,200,222,.75))';
  const SNOW = 'rgba(236,244,252,.9)', CRACK = 'rgba(232,244,255,.92)', WATER = '#06121C';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ice-layer'); svg.setAttribute('aria-hidden', 'true');
  hero.append(svg); // last of the z-index 0 layers: over the skyline and the snow lying on the ice, still under the sign (z 1)
  let W = 0, H = 0, horizon = 0;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size);
  const wx = () => window.__wx || {};
  // "solid" is the bottom of the slider; "thawed" is well on the way back up. Shore acts only fall through if it was solid when they set out.
  window.__iceSolid = () => (wx().ice || 0) > 0.97;
  window.__iceThawed = () => (wx().ice || 0) < 0.85 || (typeof window.__tempF === 'number' && window.__tempF > -5);
  const mk = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
  const f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);
  const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  // fur along an edge (the same idea as shag() in ufo.js): every other point pushed out along the normal, polygons run clockwise
  const ruff = (pts, step = 1.2, amp = 0.8) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1, n = Math.max(1, Math.round(len / step)), nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
      for (let k = 0; k < n; k++) { const t = k / n, j = k % 2 ? amp * (0.55 + ((i * 7 + k * 3) % 5) / 8) : 0;
        out.push(`${f2(x1 + (x2 - x1) * t + nx * j)},${f2(y1 + (y2 - y1) * t + ny * j + j * 0.3)}`); }
    }
    return 'M' + out.join(' L') + 'Z';
  };
  const P = (pts, amp, fill = INK, step) => `<path d="${amp ? ruff(pts, step, amp) : 'M' + pts.map((p) => p.join(',')).join(' L') + 'Z'}" fill="${fill}"/>`;

  // ------------------------------------------------------------------ a husky, facing +x, paws on y=0 (about 17 units nose to tail)
  // chest and hindquarters are separate so the spine can flex; each leg has two joints; the tail curls up over the back
  const DOG = {
    hind: [[-6.8, -9.2], [-4, -9.8], [0, -9.6], [0, -5.2], [-3, -4.8], [-6.2, -4.2], [-8, -5.4], [-8.3, -7.6]],
    chest: [[0, -9.6], [3.6, -10], [6.2, -10.4], [7.8, -8.8], [8, -5.8], [6.6, -3.8], [3.6, -4], [0, -5.2]],
    neck: [[5.2, -10], [7.4, -12.8], [9.4, -12.6], [9.6, -9.6], [7.6, -7.6]],
    head: [[7.6, -13.2], [9.6, -14.1], [11.4, -13.2], [13.9, -12.2], [14.3, -11.3], [13.4, -10.8], [10.6, -10.5], [8.8, -10.6], [7.8, -11.6]],
    ear1: [[8.3, -13.4], [8.8, -16.6], [10, -13.9]], ear2: [[9.6, -13.9], [10.6, -16.8], [11.3, -13.4]],
    tail: [[-7.6, -9.4], [-9.6, -11.6], [-9.4, -14], [-7.4, -15.2], [-4.8, -14.4], [-4.2, -12.8], [-5.4, -12.2], [-6.6, -12.9], [-7.6, -12.2], [-7.4, -10.6], [-6.4, -9.6]],
    fu: [[-1.1, -.8], [1.1, -.8], [.8, 3.6], [-.8, 3.6]], fl: [[-.7, 0], [.7, 0], [.6, 3.1], [1.8, 3.4], [1.8, 4.1], [-.8, 4.1]],
    hu: [[-2.2, -1.6], [1.7, -1.6], [1.1, 3.4], [-.7, 3.8]], hs: [[-.6, -.2], [.6, -.2], [-.4, 2.6], [-1.6, 2.6]], hm: [[-.6, 0], [.5, 0], [.5, 2], [1.5, 2.1], [1.5, 2.6], [-.6, 2.6]],
  };
  const dogSVG = (fill) => {
    const fleg = (c) => `<g class="${c}" transform="translate(5.6,-7.7)">${P(DOG.fu, 0, fill)}<g class="lo" transform="translate(0,3.6)">${P(DOG.fl, 0, fill)}</g></g>`;
    const hleg = (c) => `<g class="${c}" transform="translate(-5.8,-8.6)">${P(DOG.hu, 0, fill)}<g class="lo" transform="translate(.2,3.6)">${P(DOG.hs, 0, fill)}<g transform="translate(-1.1,2.6)">${P(DOG.hm, 0, fill)}</g></g></g>`;
    return `<g class="dbody"><g class="hq">${hleg('l h2')}${P(DOG.hind, 0.7, fill)}<g class="tl">${P(DOG.tail, 0.9, fill, 1)}</g>${hleg('l h1')}</g>
      <g class="ch">${fleg('l f2')}${P(DOG.chest, 0.7, fill)}<g class="hd">${P(DOG.neck, 0.9, fill, 1)}${P(DOG.head, 0.35, fill, 1)}${P(DOG.ear1, 0, fill)}${P(DOG.ear2, 0, fill)}</g>${fleg('l f1')}</g></g>`;
  };
  // 8 dogs in 4 pairs (lead, swing, team, wheel) on a gangline, then a basket sled and the musher on the runners
  const PAIR = 25, SLED0 = -4 * PAIR + 6;
  let team = `<path class="gangline" d="M9,-9.2 L${SLED0},-6.4" stroke="${INK}" stroke-width=".55" fill="none"/>`;
  const dogsFar = [], dogsNear = [];
  for (let r = 0; r < 4; r++) {
    const x = -r * PAIR;
    dogsFar.push(`<g class="dog" transform="translate(${x + 1.6},-1.7)">${dogSVG('#1B2632')}</g>`);
    dogsNear.push(`<g class="dog" transform="translate(${x},0)">${dogSVG(INK)}</g>
      <path d="M${x - 6},-8.6 L${x - 11},-8.4 M${x + 6.6},-10 L${x + 8.6},-9.4" stroke="${INK}" stroke-width=".45" fill="none"/>`);
  }
  team = dogsFar.join('') + team + dogsNear.join('');
  const sledSVG = `<g class="sledbody" transform="translate(${SLED0},0)">
      <path d="M-40,0 H-3 Q2.5,0 3.6,-5.4" stroke="${INK}" stroke-width="1.15" fill="none" stroke-linecap="round"/>
      <path d="M-2.6,-3.2 Q3.4,-3.4 4.2,-1.2" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-28,-.4 V-7 M-20,-.4 V-7 M-12,-.4 V-7 M-4,-.4 V-6.6" stroke="${INK}" stroke-width=".9"/>
      <path d="M-30,-7 H-3 Q.6,-7 1.6,-4.4 M-30,-3.2 H-2" stroke="${INK}" stroke-width="1.1" fill="none"/>
      ${P([[-29, -3.4], [-27.6, -8.6], [-16, -9.4], [-6.2, -8.4], [-4.2, -3.4]], 0.5)}
      <g class="musher">
        <g class="kick" transform="translate(-38.6,-11.6)"><path d="M0,0 L3.2,5.2 L1,10.4" stroke="${FAR}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-.6,9.8 H3.6 V11.6 H-.8Z" fill="${FAR}"/></g>
        <path d="M-34.4,-19.4 L-32.2,-15.2 L-30.4,-13" stroke="${FAR}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M-38.2,-11.4 L-35,-6 L-36.8,-1.4" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-38.8,-1.8 H-34.2 V0 H-39Z" fill="${INK}"/>
        ${P([[-41.6, -8.4], [-41.2, -13], [-39.6, -17.6], [-36.8, -20.8], [-33.8, -21.2], [-31.8, -19.2], [-32.4, -15.6], [-33.8, -11.4], [-34.8, -8.2], [-38.2, -7.4]], 0.5, INK, 1)}
        <g class="hood">${P([[-36, -20.6], [-36.4, -24.2], [-34.6, -26.8], [-31.8, -27.4], [-29.4, -26], [-28.6, -23], [-29.6, -20.6], [-32.6, -19.8]], 1, INK, 0.8)}
          <ellipse cx="-30.4" cy="-23.4" rx="1.15" ry="1.8" fill="#1C2733"/></g>
      </g>
      <path d="M-30,-.4 L-32.2,-11.8 Q-32.4,-13.2 -31,-13.2 L-27.6,-12.8 M-31.4,-8.6 L-27.4,-7.2" stroke="${INK}" stroke-width="1.05" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-34,-18.6 L-31.8,-14.6 L-30,-12.8" stroke="${INK}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-29.8" cy="-12.9" r="1" fill="${INK}"/>
    </g>`;
  // ------------------------------------------------------------------ the snowmobile, facing +x, track and skis on y=0
  const TRACK = 'M-21,-5 H-6 Q-3,-5 -3,-2.2 Q-3,.6 -6,.6 H-20.4 Q-23.2,.6 -23.2,-2.2 Q-23.2,-5 -21,-5Z';
  const snowmoSVG = `<g class="smbody">
      <g class="lampbeam"><ellipse cx="62" cy=".4" rx="30" ry="2.8" fill="url(#ice-pool)"/><path d="M21.4,-6.4 L104,-17 L104,3.4Z" fill="url(#ice-beam)"/></g>
      <g class="lampday"><path d="M21.4,-6.4 L80,-13.6 L80,1.6Z" fill="url(#ice-beam-day)"/><circle cx="21.3" cy="-6.4" r="4.2" fill="url(#ice-flare)"/></g>
      <path d="${TRACK}" fill="${INK}"/>
      <path class="lugs" d="${TRACK}" fill="none" stroke="${INK}" stroke-width="1.35" stroke-dasharray=".8 1.05"/>
      ${[-20.2, -15.4, -10.6, -6].map((x) => `<g class="wheel" transform="translate(${x},-2.2)"><circle r=".95" fill="none" stroke="#2A3743" stroke-width=".3"/><path d="M-.7,0 H.7" stroke="#2A3743" stroke-width=".22"/></g>`).join('')}
      ${P([[-24, -8.8], [-4, -8.8], [-3, -5], [-24, -5.2]], 0)}${P([[-25, -6.4], [-23.6, -6.4], [-23.6, -1], [-25, -.4]], 0)}
      <circle cx="-23.9" cy="-7.6" r=".6" fill="#FF4A3A"/>
      ${P([[-19.4, -11.8], [-6, -11.6], [-3.8, -9.4], [-19.8, -8.8]], 0)}
      <path d="M15,0 L13.6,-5.2" stroke="${INK}" stroke-width="1.5"/>
      <path d="M9.4,.4 H24.4 Q27.2,.4 27.8,-2.4" stroke="${INK}" stroke-width="1.15" fill="none" stroke-linecap="round"/>
      ${P([[-5, -9], [0, -11], [8, -11.8], [14, -10.4], [19, -7.8], [21.8, -5.8], [20.8, -4.4], [12, -4], [2, -4.4], [-4, -5]], 0)}
      <path d="M2,-7.4 L18,-6.2" stroke="#1A2530" stroke-width=".45"/>
      <path d="M6.6,-11.6 L9.6,-16.8 L11.8,-16.6 L12.6,-10.6Z" fill="rgba(190,215,235,.38)" stroke="${INK}" stroke-width=".55"/>
      <path d="M6,-12.4 L8.6,-14.2" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/>
      <g class="rider">
        <path d="M-8,-12.2 L-.8,-11.4 L-3,-6.2" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-4.8,-6.6 H-.6 V-5.2 H-5Z" fill="${INK}"/>
        ${P([[-12, -11.6], [-11.6, -16.4], [-8, -21], [-3.8, -22.6], [-.6, -21.2], [-2.2, -17], [-5.2, -11.4]], 0.35, INK, 1.4)}
        <path d="M-1.6,-20.4 L3.8,-16.6 L7.6,-14" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="1" cy="-24.6" r="3.1" fill="${INK}"/><path d="M1.4,-26 Q4.4,-25.8 4,-23.2 L1.8,-23.4Z" fill="#22303C"/>
        <path d="M2.2,-25.6 Q3.6,-25.4 3.6,-24.2" stroke="rgba(200,225,240,.7)" stroke-width=".4" fill="none"/>
      </g>
      <circle class="headlamp" cx="21.3" cy="-6.4" r="1.25" fill="#FFFBE8" style="filter:drop-shadow(0 0 2px #FFF3C4) drop-shadow(0 0 6px #FFE9A0)"/>
    </g>`;
  svg.innerHTML = `<defs>
      <linearGradient id="ice-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".78"/><stop offset=".45" stop-color="#FFF3C4" stop-opacity=".3"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></linearGradient>
      <linearGradient id="ice-beam-day" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC23A" stop-opacity=".75"/><stop offset=".5" stop-color="#FFD25A" stop-opacity=".22"/><stop offset="1" stop-color="#FFD25A" stop-opacity="0"/></linearGradient>
      <radialGradient id="ice-flare"><stop offset="0" stop-color="#FFFBE8"/><stop offset=".35" stop-color="#FFD25A" stop-opacity=".8"/><stop offset="1" stop-color="#FFB020" stop-opacity="0"/></radialGradient>
      <radialGradient id="ice-pool"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".55"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="trails"></g>
    <g class="sled" opacity="0"><g style="filter:${RIM}">${team}${sledSVG}</g></g>
    <g class="sled2" opacity="0"><g style="filter:${RIM}">${snowmoSVG}</g></g>
    <g class="fx"></g>`;
  const trails = svg.querySelector('.trails'), fx = svg.querySelector('.fx');
  const sled = svg.querySelector('.sled'), snowmo = svg.querySelector('.sled2'), smbody = svg.querySelector('.smbody');
  const lamp = svg.querySelector('.lampbeam'), lampday = svg.querySelector('.lampday'), headlamp = svg.querySelector('.headlamp'), lugs = svg.querySelector('.lugs');
  const wheels = [...svg.querySelectorAll('.wheel')], kick = svg.querySelector('.kick'), hood = svg.querySelector('.hood'), musher = svg.querySelector('.musher');
  // every dog: its own phase, so the team ripples rather than marching in step
  const dogs = [...svg.querySelectorAll('.dog')].map((d, i) => ({ hq: d.querySelector('.hq'), ch: d.querySelector('.ch'), hd: d.querySelector('.hd'), tl: d.querySelector('.tl'), body: d.querySelector('.dbody'),
    f: [d.querySelector('.f1'), d.querySelector('.f2')], h: [d.querySelector('.h1'), d.querySelector('.h2')], off: (i * 0.37) % 1, x: i < 4 ? -i * PAIR + 1.6 : -(i - 4) * PAIR }));

  // ------------------------------------------------------------------ particles: one pool, updated in the main loop
  const parts = [], MAXP = innerWidth < 700 ? 70 : 150; // a hard cap: fewer on phones
  let raf = 0, last = 0;
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const spray = (x, y, n, o = {}) => {
    n = Math.min(n, MAXP - parts.length); if (n > 0) wake();
    for (let i = 0; i < n; i++) {
      const c = mk('circle', { r: f2((o.r || 1) * (0.6 + Math.random() * 0.9)), fill: o.fill || SNOW, stroke: 'rgba(70,95,120,.35)', 'stroke-width': '.4' }, fx);
      parts.push({ c, x: x + (Math.random() - 0.5) * (o.spread || 0), y, vx: (o.vx || 0) + (Math.random() - 0.5) * (o.jx || 30), vy: (o.vy || -30) - Math.random() * (o.jy || 30), g: o.g || 160, life: o.life || 0.7, age: 0 });
    }
  };
  const stepParts = (dt) => {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt;
      if (p.age > p.life) { p.c.remove(); parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.c.setAttribute('cx', f1(p.x)); p.c.setAttribute('cy', f1(p.y)); p.c.setAttribute('opacity', f2(1 - p.age / p.life)); }
  };
  // runner and track marks on the ice: short segments that fade
  const marks = [];
  const mark = (x1, y1, x2, y2, w, a = 0.35) => marks.length < 160 && marks.push({ el: mk('path', { d: `M${f1(x1)},${f1(y1)} L${f1(x2)},${f1(y2)}`, stroke: `rgba(205,222,236,${a})`, 'stroke-width': f2(w), 'stroke-linecap': 'round' }, trails), age: 0, a });
  const stepMarks = (dt) => { for (let i = marks.length - 1; i >= 0; i--) { const m = marks[i]; m.age += dt; if (m.age > 3.2) { m.el.remove(); marks.splice(i, 1); } else m.el.setAttribute('opacity', f2(1 - m.age / 3.2)); } };

  // ------------------------------------------------------------------ falling through: the shared helper
  // __iceFall({ el, x, y, s, w, kind, dir, done, stay }): el (optional) is cloned and sinks; x,y is the ice under them; s their scale;
  // w the hole's half-width in px. kind picks the swimmers: bigfoot, dogman, man, sled (two huskies, the musher, his mitt), snowmobile.
  // stay: just the hole and the splash (the UFO lifts its man back out, dripping).
  const falls = [];
  const jag = (cx, cy, rx, ry, n, j) => { let d = ''; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = 1 + (((i * 7) % 5) / 5 - 0.4) * j;
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rx * r)},${f1(cy + Math.sin(a) * ry * r)} `; } return d + 'Z'; };
  // cracks: wandering hairlines that start at the rim of the hole and fork once or twice (built once per fall, not per frame)
  const crackPaths = (x, y, w, persp) => {
    const out = [], n = 9;
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5, px = x + Math.cos(a) * w * 0.7, py = y + Math.sin(a) * w * 0.7 * persp;
      const L = w * (0.8 + Math.random() * 0.9), st = L / 6; let d = `M${f1(px)},${f1(py)}`;
      for (let k = 1; k <= 6; k++) { a += (Math.random() - 0.5) * 0.7; px += Math.cos(a) * st; py += Math.sin(a) * st * persp; d += ` L${f1(px)},${f1(py)}`;
        if (k === 2 || (k === 4 && Math.random() < 0.6)) { const b = a + (Math.random() < 0.5 ? 0.8 : -0.8); d += ` M${f1(px)},${f1(py)} l${f1(Math.cos(b) * st * 1.6)},${f1(Math.sin(b) * st * 1.6 * persp)} M${f1(px)},${f1(py)}`; } }
      out.push(d);
    }
    return out;
  };
  // the swimmers: small silhouettes that bob in the hole and paddle for the near shore
  const SW = {
    head: (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>`,
    bigfoot: () => `<g class="paw a"><path d="${ruff([[-4.6, -3.4], [-9.4, -10.6], [-12.2, -12], [-12.6, -9.8], [-8.4, -4], [-5.4, -1]], 1.1, 0.9)}" fill="${INK}"/></g>
      <g class="paw b"><path d="${ruff([[5.4, -1], [8.4, -4], [12.6, -9.8], [12.2, -12], [9.4, -10.6], [4.6, -3.4]].reverse(), 1.1, 0.9)}" fill="${INK}"/></g>
      <path d="${ruff([[-7, 0], [-6.6, -5.4], [-3.2, -10.4], [0, -13], [3.2, -10.4], [6.6, -5.4], [7, 0]], 1, 1.3)}" fill="${INK}"/>
      <path d="M-4.2,-7.2 Q-2,-8.4 0,-7.2 Q2,-8.4 4.2,-7.2" fill="none" stroke="#1A2530" stroke-width=".6"/>
      <circle cx="-2" cy="-6" r=".8" fill="#FFC870"/><circle cx="2" cy="-6" r=".8" fill="#FFC870"/>`,
    yeti: () => SW.bigfoot().split(INK).join('#D8E1E7').split('#FFC870').join('#BFF3FF'),
    husky: () => `<g class="paw a"><path d="M2.6,-1 L5,-2.6" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/></g><g class="paw b"><path d="M1,-.6 L3.6,-2" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/></g>
      ${P(DOG.head.map(([x, y]) => [x - 9.6, y + 10]), 0.3)}${P(DOG.ear1.map(([x, y]) => [x - 9.6, y + 10]), 0)}${P(DOG.ear2.map(([x, y]) => [x - 9.6, y + 10]), 0)}
      ${P([[-3, 0], [-2.6, -3.6], [0, -3.4], [1.6, 0]], 0.5)}`,
    dogman: () => `<g class="paw a"><path d="M3,-1.4 L6.6,-3.6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/></g><g class="paw b"><path d="M-3,-1.4 L-6.6,-3.6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/></g>
      <path d="${ruff([[-4.6, 0], [-4.4, -5], [-5.8, -11.6], [-2, -7.4], [2, -7.4], [5.8, -11.6], [4.4, -5], [4.6, 0]], 1, 0.9)}" fill="${INK}"/>
      <path d="M-2.6,-3.4 Q0,1.6 2.6,-3.4 Q0,-1.6 -2.6,-3.4Z" fill="${INK}"/>
      <circle cx="-1.9" cy="-4.8" r=".75" fill="#FFC45E"/><circle cx="1.9" cy="-4.8" r=".75" fill="#FFC45E"/>
      <text class="yelp" x="0" y="-15" text-anchor="middle" font-family="'Archivo Expanded',sans-serif" font-weight="800" font-size="5" fill="#F4EFE4" opacity="0">YIPE!</text>`,
    man: () => `<g class="paw a"><path d="M2.4,-1 L4.4,-5.6 L5.4,-8.4" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="5.5" cy="-8.8" r=".9" fill="${INK}"/></g>
      <ellipse cx="0" cy="-3.4" rx="2.9" ry="3.3" fill="${INK}"/><path d="M-3,0 H3 V1 H-3Z" fill="${INK}"/>`,
    musher: () => `<path d="M-5.6,1 L-6.4,-1.4 L-3.4,-2.4 L-2.4,-.6Z M5.6,1 L6.4,-1.4 L3.4,-2.4 L2.4,-.6Z" fill="${INK}"/>
      <path d="${ruff([[-2.8, -.6], [-2.6, -4.6], [0, -6.4], [2.6, -4.6], [2.8, -.6]], 0.9, 0.7)}" fill="${INK}"/><circle cx="0" cy="-3.4" r="1.2" fill="#1A2530"/>`,
    rider: () => `<g class="paw a"><path d="M2.6,-1.6 L5,-6 L5.4,-9.2" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M4.4,-9.6 L5.2,-11.4 L6.2,-9.4Z" fill="${INK}"/></g>
      <ellipse cx="0" cy="-3.4" rx="2.8" ry="3.2" fill="${INK}"/><path d="M-2.6,-5.4 Q0,-8.4 2.8,-5.2 Q1,-6 -.4,-5.4Z" fill="${INK}"/>`,
    mitt: () => `<path d="${ruff([[-3, 0], [-3.2, -2.4], [-1.6, -3.6], [1.4, -3.4], [2.2, -2], [3.4, -2.8], [3.8, -1.6], [2.6, 0]], 0.9, 0.6)}" fill="${INK}"/>`,
    fedora: () => `<ellipse cx="0" cy="0" rx="4.8" ry="1" fill="${INK}"/><path d="M-2.4,0 L-2,-3 Q.4,-4.2 2.6,-3 L3,0Z" fill="${INK}"/>`,
    helmet: () => `<path d="M-3.2,0 Q-3.6,-5.6 0,-5.8 Q3.6,-5.6 3.4,0Z" fill="${INK}"/><path d="M.6,-4 Q3.4,-3.8 3,-1.2 L.8,-1.4Z" fill="#22303C"/>`,
  };
  const CAST = {
    bigfoot: [{ k: 'bigfoot', dx: 0, at: 1400, swim: 1, splash: 1.6 }],
    dogman: [{ k: 'dogman', dx: 0, at: 1300, swim: 1, splash: 1.1, yelp: 1 }],
    man: [{ k: 'man', dx: 0, at: 1500, swim: 0.4, splash: 0.7, flail: 1 }, { k: 'fedora', dx: -0.4, at: 1150, float: 1 }],
    sled: [{ k: 'husky', dx: -0.4, at: 1350, swim: 1, splash: 0.6 }, { k: 'husky', dx: 0.35, at: 1700, swim: 1.2, splash: 0.6 },
      { k: 'musher', dx: 0.05, at: 2000, edge: 1 }, { k: 'mitt', dx: -0.15, at: 1600, float: 1 }],
    yeti: [{ k: 'yeti', dx: 0, at: 1400, swim: 1, splash: 2 }],
    snowmobile: [{ k: 'rider', dx: 0.1, at: 1500, wave: 1 }, { k: 'helmet', dx: -0.6, at: 1300, float: 1 }],
  };
  // also callable as __iceFall(el, x, y, scale, kind[, dir, done])
  window.__iceFall = (o, ...rest) => {
    if (!o || o instanceof Element) { const [x, y, s, kind, dir, done] = rest; o = { el: o, x, y, s, w: (kind === 'bigfoot' || kind === 'yeti' ? 16 : kind === 'dogman' ? 22 : 12) * (s || 1), kind, dir, done }; }
    size(); wake();
    const s = o.s || 1, x = o.x, y = o.y, persp = y > horizon + 6 ? 0.3 : 0.26, w = o.w || 13 * s, dir = o.dir || 1;
    const g = mk('g', { class: 'icefall' }, fx);
    const cracks = crackPaths(x, y, w, persp).map((d) => mk('path', { d, fill: 'none', stroke: CRACK, 'stroke-width': '.75', 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1', style: 'filter:drop-shadow(0 0 1.5px rgba(200,230,255,.8))' }, g));
    const rip = mk('g', {}, g), hole = mk('path', { fill: WATER, stroke: 'rgba(226,240,250,.95)', 'stroke-width': '1.2', 'stroke-linejoin': 'round', opacity: 0, style: 'filter:drop-shadow(0 0 2px rgba(200,230,255,.6))' }, g);
    const chunks = [0, 1, 2, 3, 4].map((i) => mk('path', { d: jag(0, 0, w * 0.16, w * 0.16 * persp * 1.6, 6, 0.5), fill: 'rgba(222,236,248,.8)', stroke: 'rgba(120,150,175,.5)', 'stroke-width': '.5', opacity: 0 }, g));
    // the character: a clone that sinks, clipped at the near rim of the hole
    let clone = null, clip = null;
    if (o.el) {
      clip = mk('clipPath', { id: `icefall-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, clipPathUnits: 'userSpaceOnUse' }, g);
      clip.cr = mk('rect', { x: -9999, y: -9999, width: 30000, height: 9999 + y + w * persp * 0.7 }, clip);
      const wrap = mk('g', { 'clip-path': `url(#${clip.id})` }, g);
      clone = o.el.cloneNode(true); clone.removeAttribute('filter'); clone.style.opacity = 1; clone.setAttribute('opacity', 1);
      clone.base = clone.getAttribute('transform') || ''; wrap.append(clone);
    }
    const front = mk('g', {}, g); // swimmers, in front of the hole
    const F = { o, g, rip, hole, cracks, chunks, clone, front, x, y, s, w, persp, dir, t0: performance.now(), splashed: false, swimmers: null, lastRip: 0, lastPaddle: 0, lifted: false };
    falls.push(F);
    return { lift: () => { F.lifted = true; } }; // the saucer's beam takes the swimmer (the hat stays behind)
  };
  window.__iceChips = (x, y, s) => spray(x, y, 30, { spread: 20 * s, vy: -60, jy: 120, jx: 160, g: 300, life: 0.9, r: 1.3, fill: 'rgba(222,238,250,.95)' });
  window.__iceFall.drip = (x, y, s) => spray(x, y, 1, { vx: 0, vy: 10, jx: 10 * s, jy: 5, g: 300, life: 0.6, r: 0.8, fill: 'rgba(160,210,240,.9)' });
  // a hole in the ice for the lake monster to come up through
  window.__iceHole = (x, y, s, ms) => { window.__iceFall({ x, y, s, w: 16 * s, stay: true, hold: ms, quick: true }); };
  const stepFall = (F, now, dt) => {
    const t = now - F.t0, o = F.o, END = o.hold || (o.stay ? 6500 : 4800), quick = o.quick ? 0.4 : 1;
    // 1. cracks spider out
    F.cracks.forEach((c, i) => c.setAttribute('stroke-dashoffset', f2(1 - smooth((t - i * 18) / (380 * quick)))));
    // 2. the ice gives: the hole opens, chunks tip up, the character lurches and drops
    const open = smooth((t - 420 * quick) / 260);
    F.hole.setAttribute('opacity', open > 0 ? 1 : 0);
    F.hole.setAttribute('d', jag(F.x, F.y, F.w * 0.8 * (0.3 + 0.7 * open), F.w * 0.8 * F.persp * (0.3 + 0.7 * open) * 1.25, 14, 0.45));
    F.chunks.forEach((c, i) => { const a = (i / 5) * Math.PI * 2 + 0.5, r = F.w * (0.78 + 0.1 * Math.sin(t / 300 + i));
      c.setAttribute('opacity', open > 0 ? f2(0.85 * open) : 0);
      c.setAttribute('transform', `translate(${f1(F.x + Math.cos(a) * r)},${f1(F.y + Math.sin(a) * r * F.persp * 1.2)}) rotate(${f1(Math.sin(t / 260 + i * 2) * 18 * open)})`); });
    if (F.clone) {
      const shake = t < 450 ? Math.sin(t / 22) * 0.8 : 0, tilt = smooth((t - 380) / 300) * 13 * F.dir, drop = t > 560 ? Math.pow((t - 560) / 1000, 2) * 900 * F.s : 0;
      F.clone.setAttribute('transform', `translate(${f1(shake)},${f1(drop)}) rotate(${f1(tilt)} ${f1(F.x)} ${f1(F.y)}) ${F.clone.base}`);
      if (t > 1200) { F.clone.parentNode.remove(); F.clone = null; }
    }
    // 3. the splash, then ripples
    if (!F.splashed && t > 640 * quick) { F.splashed = true;
      spray(F.x, F.y, Math.round(26 + F.w / 3), { spread: F.w * 1.4, vy: -70 * Math.min(2, F.s), jy: 110 * Math.min(2, F.s), jx: 70, g: 320, life: 0.9, r: 1.1, fill: 'rgba(214,236,252,.95)' }); }
    if (t > 700 * quick && now - F.lastRip > 520 && t < END - 900) { F.lastRip = now;
      F.rip.append(Object.assign(mk('ellipse', { cx: f1(F.x), cy: f1(F.y), fill: 'none', stroke: 'rgba(214,236,252,.55)', 'stroke-width': '.9' }, F.rip), { born: now })); }
    // the rings stay inside the hole: ice doesn't ripple
    [...F.rip.children].forEach((r) => { const a = (now - r.born) / 1600; if (a >= 1) { r.remove(); return; }
      r.setAttribute('rx', f1(F.w * (0.15 + a * 0.6))); r.setAttribute('ry', f1(F.w * F.persp * 1.2 * (0.15 + a * 0.6))); r.setAttribute('opacity', f2(1 - a)); });
    // 4. comic survival: heads pop up, paddle for the near shore, hats and mitts float
    if (!o.stay && !F.swimmers) F.swimmers = (CAST[o.kind] || CAST.man).map((c) => {
      const el = mk('g', { opacity: 0, style: 'filter:drop-shadow(0 0 1.1px rgba(196,228,248,.95))' }, F.front); el.innerHTML = SW[c.k]() + `<path d="M-8,.6 Q-4,-.6 0,.8 Q4,-.6 8,.6" fill="none" stroke="rgba(214,236,252,.75)" stroke-width=".7" stroke-linecap="round"/>`; return { c, el, paws: [...el.querySelectorAll('.paw')], yelp: el.querySelector('.yelp') }; });
    (F.swimmers || []).forEach((m, i) => {
      const c = m.c, u = (t - c.at) / 1000; if (u < 0) return;
      const pop = Math.min(1, u / 0.35), bob = Math.sin(t / 260 + i * 1.7) * 0.7, k = Math.max(1.05, F.s * 1.1);
      let sx = F.x + c.dx * F.w, sy = F.y + (1 - pop) * 5 * k + bob * k, rot = 0;
      if (c.swim) { sy += Math.min(F.w * F.persp * 0.75, u * 4 * c.swim * k); sx += Math.sin(u * 1.4 + i) * F.w * 0.18;
        m.paws.forEach((p, j) => p.setAttribute('transform', `translate(0,${f1(Math.sin(t / 110 + j * Math.PI) * 1.4)})`));
        if (now - F.lastPaddle > 140) { F.lastPaddle = now; spray(sx, sy - 1, Math.round(2 * c.splash), { spread: 8 * k, vy: -30 * k, jy: 30 * k, jx: 40, g: 260, life: 0.45, r: 0.8 * Math.max(1, c.splash), fill: 'rgba(214,236,252,.9)' }); } }
      if (c.flail) m.paws.forEach((p) => p.setAttribute('transform', `rotate(${f1(Math.sin(t / 90) * 35)} 2.4 -1)`));
      if (c.wave && u > 0.5) m.paws.forEach((p) => p.setAttribute('transform', `rotate(${f1(Math.sin(t / 150) * 22)} 2.6 -1.6)`));
      if (c.edge) { sy = F.y + F.w * F.persp * 1.05 + bob * 0.3; }
      if (c.float) { sx += Math.min(u * 3 * k, F.w * 0.3) * (c.dx < 0 ? -1 : 1); rot = Math.sin(t / 420 + i) * 10; sy = F.y + Math.sin(t / 380 + i) * 0.6 * k; }
      if (m.yelp) { const yk = (t - c.at - 200) / 1300; m.yelp.setAttribute('opacity', yk > 0 && yk < 1 ? f2(Math.min(1, yk * 5) * (yk > 0.7 ? (1 - yk) / 0.3 : 1)) : 0);
        m.yelp.setAttribute('transform', `translate(0,${f1(-yk * 3)}) rotate(${f1(Math.sin(t / 50) * 4)} 0 -15)`); }
      const fade = t > END - 600 ? Math.max(0, (END - t) / 600) : 1;
      m.el.setAttribute('opacity', F.lifted && !c.float ? 0 : f2(pop * fade));
      m.el.setAttribute('transform', `translate(${f1(sx)},${f1(sy)}) rotate(${f1(rot)}) scale(${f2(k * (c.k === 'musher' ? 1.2 : 1) * (c.k === 'bigfoot' ? 1.35 : c.k === 'yeti' ? 1.6 : 1))})`);
    });
    // 5. and everything fades out
    if (t > END - 600) F.g.setAttribute('opacity', f2(Math.max(0, (END - t) / 600)));
    if (t > END) { F.g.remove(); return true; }
    return false;
  };

  // ------------------------------------------------------------------ the crossings
  // one at a time: the sled team west-to-east on the near ice, the snowmobile east-to-west a little further out
  let act = null, nextAt = 0, turn = 0, waitFreeze = false, left = 2; // each crosses once per freeze
  const start = (now) => {
    size();
    const phone = W < 700, s = (phone ? 1.05 : 1.45) * Math.max(0.9, Math.min(1.6, W / 900));
    // far out on the ice, on a lane that passes behind the sign and its post (the layer sits under the sign), so a smaller scale
    const far = phone ? 0.85 : 0.64;
    if (turn++ % 2 === 0) act = { el: sled, t0: now, dur: phone ? 9000 : 12000, x0: -10, x1: W + 150 * s * 1.25 * far, y: horizon + H * (phone ? 0.045 : 0.035), s: s * 1.25 * far, dir: 1, kind: 'dogs', lastMark: null };
    else act = { el: snowmo, t0: now, dur: phone ? 3600 : 4600, x0: W + 40 * s, x1: -120 * s, y: horizon + H * (phone ? 0.03 : 0.022), s: s * 1.15 * far, dir: -1, kind: 'snowmobile', lastMark: null };
    act.el.setAttribute('opacity', 1);
  };
  const gallop = (d, ph) => {
    const T = Math.PI * 2, b = ph * T;
    // rotary gallop: hind legs land, then the fronts; the spine bunches as the legs gather and stretches on the extension
    d.hq.setAttribute('transform', `rotate(${f1(-5 * Math.sin(b + 0.6))} 0 -7.4)`);
    d.ch.setAttribute('transform', `rotate(${f1(4 * Math.sin(b + 0.6))} 0 -7.4)`);
    d.hd.setAttribute('transform', `rotate(${f1(5 * Math.sin(b + 2.2))} 6.6 -9.6)`);
    d.tl.setAttribute('transform', `rotate(${f1(6 * Math.sin(b * 2))} -7.4 -9.6)`);
    d.body.setAttribute('transform', `translate(0,${f2(-1.3 * Math.max(0, Math.sin(b + 1.1)))})`);
    [0, 0.12].forEach((o, j) => { const a = b + o * T; d.h[j].setAttribute('transform', `translate(-5.8,-8.6) rotate(${f1(32 * Math.sin(a))})`);
      d.h[j].querySelector('.lo').setAttribute('transform', `translate(.2,3.6) rotate(${f1(-48 * Math.max(0, -Math.cos(a)) + 8)})`); });
    [0.5, 0.62].forEach((o, j) => { const a = b + o * T; d.f[j].setAttribute('transform', `translate(5.6,-7.7) rotate(${f1(38 * Math.sin(a))})`);
      d.f[j].querySelector('.lo').setAttribute('transform', `translate(0,3.6) rotate(${f1(75 * Math.max(0, -Math.cos(a)))})`); });
  };
  // the rAF loop runs only while something is moving (a crossing, a fall, particles, fading tracks), then stops
  function loop(now) {
    raf = -1; // in the loop: wake() has nothing to do
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepParts(dt); stepMarks(dt);
    for (let i = falls.length - 1; i >= 0; i--) if (stepFall(falls[i], now, dt)) { const F = falls.splice(i, 1)[0]; if (F.o.done) F.o.done(); }
    if (act) stepAct(now);
    raf = act || falls.length || parts.length || marks.length ? requestAnimationFrame(loop) : 0;
  }
  // a cheap watcher decides when a crossing starts: frozen solid, cold enough, nobody else on the ice, the hero on screen, no twister
  const frozenNow = () => (wx().ice || 0) > 0.97 && typeof window.__tempF === 'number' && window.__tempF <= -9;
  setInterval(() => {
    const frozen = frozenNow();
    if (!frozen && (wx().ice || 0) < 0.9) { left = 2; turn = 0; waitFreeze = false; } // a real thaw: next freeze, they both cross again
    if (waitFreeze && frozen) waitFreeze = false;
    const now = performance.now(), r = hero.getBoundingClientRect();
    if (!act && frozen && !waitFreeze && left > 0 && !window.__tornado && !document.hidden && r.bottom > 0 && r.top < innerHeight && now > nextAt) { left--; start(now); wake(); }
  }, 500);
  function stepAct(now) {
    const A = act, k = Math.min(1, (now - A.t0) / A.dur), x = A.x0 + (A.x1 - A.x0) * k, s = A.s, t = now - A.t0;
    // thawing under them: through they go (not grim: everybody swims for it)
    if (window.__iceThawed() && k > 0.04 && k < 0.96) {
      const cx = A.kind === 'dogs' ? x + (-40 * s) : x - 4 * s * A.dir;
      window.__iceFall({ el: A.el, x: cx, y: A.y, s, w: (A.kind === 'dogs' ? 26 : 16) * s, kind: A.kind === 'dogs' ? 'sled' : 'snowmobile', dir: A.dir });
      A.el.setAttribute('opacity', 0); act = null; waitFreeze = true; nextAt = now + 1800; return;
    }
    if (A.kind === 'dogs') {
      const bob = Math.sin(now / 140) * 0.4;
      A.el.setAttribute('transform', `translate(${f1(x)},${f1(A.y + bob)}) scale(${f2(s)})`);
      const speed = (A.x1 - A.x0) / A.dur * 1000 / s; // units per second
      dogs.forEach((d) => gallop(d, (t / 1000) * (speed / 30) + d.off));
      // the musher: a kick and a pedal now and then, and a little sway on the runners
      const kc = (t % 2600) / 2600, kk = kc < 0.3 ? Math.sin(kc / 0.3 * Math.PI) : 0;
      kick.setAttribute('transform', `translate(-38.6,-11.6) rotate(${f1(kk * 46)})`);
      hood.setAttribute('transform', `rotate(${f1(Math.sin(t / 380) * 3)} -32.6 -20)`); musher.setAttribute('transform', `rotate(${f2(Math.sin(t / 520) * 1.6 + kk * 2)} -36.6 0)`);
      // snow from the paws and the runners, and a fading trail
      if (Math.random() < 0.5) { const d = dogs[Math.floor(Math.random() * dogs.length)]; spray(x + d.x * s, A.y, 1, { vx: -40, vy: -12, jx: 30, jy: 20, g: 140, life: 0.45, r: 0.8 }); }
      const rx = x + (SLED0 - 36) * s;
      if (Math.random() < 0.6) spray(rx, A.y, 1, { vx: -30, vy: -10, jx: 25, jy: 14, g: 120, life: 0.6, r: 0.9 });
      if (A.lastMark === null) A.lastMark = rx;
      else if (Math.abs(rx - A.lastMark) > 6) { mark(A.lastMark, A.y + 0.5, rx, A.y + 0.5, 1.2 * s * 0.5); mark(A.lastMark, A.y - 1.2 * s, rx, A.y - 1.2 * s, 0.9 * s * 0.4, 0.22); A.lastMark = rx; }
    } else {
      // over the bumps: the body pitches and bounces; the track's lugs run, the bogie wheels spin
      const bump = Math.sin(t / 120) * 1 + Math.max(0, Math.sin(t / 430)) * 2.4 * Math.sin(t / 47), lift = Math.max(0, Math.sin(t / 430) - 0.7) * 2.2;
      A.el.setAttribute('transform', `translate(${f1(x)},${f1(A.y - lift * s)}) scale(${f2(s * A.dir)},${f2(s)})`);
      smbody.setAttribute('transform', `rotate(${f2(-bump)} -12 0)`);
      lugs.setAttribute('stroke-dashoffset', f2((t / 18) % 1.85));
      wheels.forEach((w, i) => w.querySelector('path').setAttribute('transform', `rotate(${f1(t * 1.4 + i * 40)})`));
      const night = (wx().day || 0) < 0.5;
      lamp.setAttribute('opacity', night ? 1 : 0.25); lampday.setAttribute('opacity', night ? 0.35 : 1); headlamp.setAttribute('opacity', 1);
      // the rooster tail
      const tx = x - A.dir * 24 * s;
      spray(tx, A.y - 1, MAXP > 100 ? 3 : 2, { vx: -A.dir * 150, vy: -70, jx: 110, jy: 90, g: 240, life: 0.85, r: 1.1 });
      if (A.lastMark === null) A.lastMark = tx;
      else if (Math.abs(tx - A.lastMark) > 8) { mark(A.lastMark, A.y + 0.4, tx, A.y + 0.4, 6 * s * 0.35, 0.25); A.lastMark = tx; }
    }
    if (k >= 1) { A.el.setAttribute('opacity', 0); act = null; nextAt = now + 1800; }
  }
  // the tornado takes everything: end the crossing and any fall in progress, cleanly
  window.__iceAbort = () => { if (act) { act.el.setAttribute('opacity', 0); act = null; nextAt = performance.now() + 1800; }
    falls.splice(0).forEach((F) => { F.g.remove(); if (F.o.done) F.o.done(); });
    parts.splice(0).forEach((p) => p.c.remove()); marks.splice(0).forEach((m) => m.el.remove()); };
})();
