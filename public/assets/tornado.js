// Weather with consequences. Above 75% precipitation and 60°F, lightning: real branching bolts, more often
// the harder it rains and the hotter it is. Max out wind, precipitation and temperature together and a tornado drops out of the
// clouds, rips the sign off its post and tears through the skyline. Ease off and everything comes back.
// The tornado and the fried sign are drawn on one 2D canvas from soft pre-rendered sprites: no filters,
// no per-frame gradients on the hot path, a capped particle count, and a rAF that only runs while
// something is actually happening and the hero is on screen.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HZ = 0.36;
  const rnd = Math.random, TAU = Math.PI * 2;
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'storm-layer'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <filter id="bolt-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g class="bolts"></g>`;
  hero.append(svg);
  // the tornado (and the sparks when the sign fries) live on a canvas just under the bolts
  const cv = document.createElement('canvas');
  cv.className = 'tornado-layer'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, svg);
  const ctx = cv.getContext('2d');
  const bolts = svg.querySelector('.bolts');
  const orbit = document.querySelector('.hero .orbit'), skyline = () => document.querySelector('.skyline-layer');
  const stack = document.querySelector('.hero-stack');
  let W = 0, H = 0, horizon = 0, dpr = 1;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size); new ResizeObserver(size).observe(hero); // not per frame: reading the hero's box every frame forced a layout each time
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(W * dpr)), h = Math.max(1, Math.round(H * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  };

  // ---------- sprites: soft puffs, re-tinted only when daylight changes noticeably ----------
  const puff = (rgb, hard, px = 64) => {
    const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'), m = px / 2;
    const gr = g.createRadialGradient(m, m, 0, m, m, m), s = `rgba(${rgb},`;
    if (hard) { gr.addColorStop(0, s + '1)'); gr.addColorStop(.45, s + '.92)'); gr.addColorStop(.75, s + '.4)'); gr.addColorStop(1, s + '0)'); }
    else { gr.addColorStop(0, s + '1)'); gr.addColorStop(.3, s + '.6)'); gr.addColorStop(.65, s + '.18)'); gr.addColorStop(1, s + '0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, px, px); return c;
  };
  // night first, then daylight: near-black at night, grey-green-brown under a daytime supercell
  const PAL = {
    core: [[8, 9, 13], [30, 33, 30]], shroud: [[42, 47, 60], [88, 94, 88]], lit: [[66, 74, 94], [160, 164, 152]],
    cloud: [[10, 12, 16], [40, 45, 46]], cloudLit: [[28, 32, 42], [86, 92, 92]], spray: [[78, 86, 102], [206, 210, 208]],
    dust: [[24, 23, 22], [98, 86, 70]], smoke: [[96, 98, 106], [132, 132, 130]],
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const spr = {}, rgbOf = {}; let sprDay = -1;
  const paint = (day) => {
    const q = Math.round(day * 8) / 8; if (q === sprDay) return; sprDay = q;
    for (const k in PAL) { rgbOf[k] = mix(PAL[k][0], PAL[k][1], q).join(','); spr[k] = puff(rgbOf[k], k === 'core'); }
  };
  const GLOW = { w: puff('205,222,255', false), o: puff('255,128,40', false), y: puff('255,232,170', true), char: puff('6,7,9', true) };
  let rainTex = null;
  const rain = () => { // a tileable sheet of slanted rain, faded at its left and right edges
    if (rainTex) return rainTex;
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(215,224,236,.55)'; g.lineWidth = 1;
    for (let i = 0; i < 150; i++) { const x = rnd() * 128, y = rnd() * 256, l = 14 + rnd() * 26;
      for (const ox of [-128, 0, 128]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + l * .3, y + oy + l); g.stroke(); } }
    g.globalCompositeOperation = 'destination-in';
    const f = g.createLinearGradient(0, 0, 128, 0); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(.3, '#000'); f.addColorStop(.7, '#000'); f.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = f; g.fillRect(0, 0, 128, 256);
    return (rainTex = c);
  };
  let G = 1; // global fade for whatever is being drawn
  const put = (img, x, y, w, h, a) => { a *= G; if (a <= .004 || w < .5 || h < .5) return; ctx.globalAlpha = a > 1 ? 1 : a; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); };
  const chunk = (x, y, w, h, rot, flip, color, a) => {
    const c = Math.cos(rot), s = Math.sin(rot), f = Math.max(.15, Math.abs(Math.cos(flip)));
    ctx.setTransform(dpr * c * f, dpr * s * f, -dpr * s, dpr * c, dpr * x, dpr * y);
    ctx.globalAlpha = Math.min(1, a * G); ctx.fillStyle = color; ctx.fillRect(-w / 2, -h / 2, w, h);
  };

  // ---------- lightning ----------
  let litAt = -1e9, litX = 0;
  const strike = (level, target, sx) => {
    size();
    const x0 = sx != null ? sx : target ? target[0] + (rnd() - .5) * W * .12 : W * (.08 + rnd() * .84), y0 = 0, y1 = target ? target[1] : horizon - rnd() * 8;
    const pts = [[x0, y0]]; let x = x0, y = y0; const steps = 14;
    for (let i = 1; i <= steps; i++) { y = y0 + (y1 - y0) * i / steps; x += (rnd() - .5) * W * .05; if (target) x += (target[0] - x) * (i / steps) * (sx != null ? .8 : .5); pts.push([x, y]); }
    if (target && sx != null) pts[steps] = [target[0], target[1]]; // aimed bolts land exactly on their mark
    const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L');
    let br = ''; for (let b = 0; b < 2 + Math.floor(level * 3); b++) { const k = 3 + Math.floor(rnd() * (steps - 6)); let [bx, by] = pts[k]; br += `M${bx.toFixed(1)},${by.toFixed(1)}`;
      for (let j = 0; j < 4; j++) { bx += (rnd() - .3) * W * .04 * (rnd() < .5 ? -1 : 1); by += (y1 - y0) / steps * (.8 + rnd() * .6); br += ` L${bx.toFixed(1)},${by.toFixed(1)}`; } }
    const g = document.createElementNS(NS, 'g'); g.setAttribute('filter', 'url(#bolt-glow)');
    g.innerHTML = `<path d="${d}" stroke="#F4F7FF" stroke-width="${(2.2 + level * 1.6).toFixed(1)}" fill="none" stroke-linejoin="round"/><path d="${br}" stroke="#DCE6FF" stroke-width="1.1" fill="none" opacity=".85"/>`;
    bolts.append(g);
    window.__flashReq = .7 + level * .5;
    litAt = performance.now(); litX = x0; // the tornado lights up with it
    if (level > .5 && stack) { stack.classList.remove('quake'); void stack.offsetWidth; stack.classList.add('quake'); setTimeout(() => stack.classList.remove('quake'), 160); }
    // over 90% rain in a lightning storm, every strike shakes the screen; harder the hotter it is
    if (!reduce && (window.__stormRain || 0) >= .6 && !document.body.classList.contains('screenquake')) {
      const b = document.body; b.style.setProperty('--bq', (.45 + .55 * Math.min(1, level / Math.max(.01, window.__stormRain))).toFixed(2));
      b.classList.remove('boltquake'); void b.offsetWidth; b.classList.add('boltquake'); clearTimeout(strike.qt); strike.qt = setTimeout(() => b.classList.remove('boltquake'), 520); }
    const t0 = performance.now();
    (function fade(t) { const k = (t - t0) / 260; g.setAttribute('opacity', k < .15 ? 1 : k < .3 ? .2 : k < .45 ? 1 : Math.max(0, 1 - (k - .45) / .55)); if (k < 1) requestAnimationFrame(fade); else g.remove(); })(t0);
  };
  const litK = (now) => { const k = (now - litAt) / 260; return k < 0 || k > 1.4 ? 0 : k < .15 ? 1 : k < .3 ? .3 : k < .45 ? 1 : Math.max(0, 1 - (k - .45) / .95); };

  // ---------- the render loop: runs only while the tornado or the fried-sign effects are alive ----------
  let raf = 0, last = 0, onScreen = true, cost = 0;
  const frame = (now) => {
    raf = 0;
    if (!onScreen || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
    fit();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    paint(Math.min(1, Math.max(0, (window.__wx && window.__wx.day) || 0)));
    let alive = false; const c0 = performance.now();
    if (state !== 'calm') alive = drawTornado(now, dt) || alive;
    if (fz) alive = drawFry(now, dt) || alive;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; cost += (performance.now() - c0 - cost) * .05;
    if (alive) raf = requestAnimationFrame(frame); else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); last = 0; }
  };
  const kick = () => { if (!raf && onScreen && !document.hidden && (state !== 'calm' || fz)) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; kick(); }).observe(hero);
  document.addEventListener('visibilitychange', kick);

  // ---------- the tornado ----------
  let state = 'calm', T = 0, RT = 0, tx = 0, gx = 0, signGone = false, cityGone = false, gone = false, P = null;
  const build = () => {
    // particle budget: ~600 on desktop, ~250 on phones, trimmed further if frames run long
    const phone = W < 700, n = phone ? { sh: 84, cl: 24, dk: 12, sp: 46, db: 22, inf: 28, sc: 10, sv: 2, bands: 4, bs: 30 } : { sh: 210, cl: 52, dk: 28, sp: 120, db: 56, inf: 76, sc: 24, sv: 3, bands: 7, bs: 56 };
    P = {
      n,
      sh: Array.from({ length: n.sh }, () => ({ u: rnd(), a: rnd() * TAU, s: rnd(), dark: rnd() < .24, sp: .75 + rnd() * .5, ro: .72 + rnd() * .55 })),
      cl: Array.from({ length: n.cl }, () => ({ a: rnd() * TAU, R: .1 + .9 * Math.sqrt(rnd()), s: rnd(), lit: rnd() < .32, h: rnd() })),
      dk: Array.from({ length: n.dk }, (_, i) => ({ x: (i + rnd() * .8) / n.dk, y: rnd(), s: rnd() })),
      sp: Array.from({ length: n.sp }, () => ({ age: 0, life: -1 })),
      db: Array.from({ length: n.db }, () => ({ m: -1 })),
      inf: Array.from({ length: n.inf }, () => ({ a: rnd() * TAU, R: 1.5 + rnd() * 12, s: rnd(), sp: .7 + rnd() * .8, dust: rnd() < .35 })),
      scud: Array.from({ length: n.sc }, () => ({ a: rnd() * TAU, R: .35 + rnd() * .9, h: rnd(), s: rnd(), sp: .6 + rnd() * .8 })),
      sv: Array.from({ length: n.sv }, (_, i) => ({ ph: i / n.sv * TAU, t: rnd() * 3, per: 2.4 + rnd() * 1.8, u0: .42 + rnd() * .18 })),
      burst: [], cap: phone ? 26 : 44,
    };
  };
  let Q = 1, ema = 1 / 60, fixQ = 0; // adaptive quality: share of each particle set actually drawn
  const fling = (x0, y0, w0, h0, cols, n, sc) => { // pieces of whatever just got hit, thrown up and out of the vortex
    for (let i = 0; i < n && P.burst.length < P.cap; i++) {
      const s = (1.6 + rnd() * 4.5) * sc;
      P.burst.push({ x: x0 + rnd() * w0, y: y0 + rnd() * h0, vx: (40 + rnd() * 230) * sc * (rnd() < .82 ? 1 : -1), vy: -(110 + rnd() * 260) * sc,
        w: s, h: s * (.35 + rnd() * .6), rot: rnd() * TAU, vr: (rnd() - .5) * 18, flip: rnd() * TAU, vf: (rnd() - .5) * 16, col: cols[(rnd() * cols.length) | 0], age: 0 });
    }
  };
  const streak = (x, y, vx, vy, w, col, a) => { // motion blur for anything thrown fast
    ctx.globalAlpha = Math.min(1, a * G); ctx.strokeStyle = col; ctx.lineWidth = Math.max(.6, w);
    ctx.beginPath(); ctx.moveTo(x - vx * .04, y - vy * .04); ctx.lineTo(x, y); ctx.stroke();
  };
  const drawTornado = (now, dt) => {
    const phone = W < 700, sc = Math.min(1.8, .55 + W / 1100), day = sprDay;
    ema += (dt - ema) * .05; Q = fixQ || (ema > 1 / 38 ? Math.max(.55, Q - .01) : Math.min(1, Q + .002));
    const lim = (a) => Math.ceil(a.length * Q);
    if (state === 'twister') T += dt; else RT += dt;
    const k = state === 'roping' ? Math.min(1, RT / 2.6) : 0;
    if (k >= 1) { state = 'calm'; P = null; return false; }
    if (gone) return false;
    // forming: the wall cloud lowers and spins up, a rope reaches down, spray lifts off the water, then it fattens
    const form = smooth(T / 1.3) * (1 - k * k), reach = smooth((T - .35) / 2), sprayK = smooth((T - 1.3) / 1.4) * (1 - smooth(k * 1.6));
    const th = (.28 + .72 * smooth((T - 2.3) / 2.2)) * (1 - .8 * smooth(k * 1.3)), mature = smooth((T - 2.6) / 2) * (1 - k);
    if (T > 2.3) tx += dt * W * (phone ? .11 : .075) * (state === 'roping' ? .35 : 1);
    const cloudY = Math.max(60, H * .14), groundY = horizon + 3, span = groundY - cloudY;
    const rT = (phone ? 84 : 70) * sc, rB = (phone ? 11 : 15) * sc, Rw = rT * (phone ? 2 : 2.4);
    const topX = tx + W * .025 + Math.sin(T * .31) * 12 * sc;
    gx = tx + Math.sin(T * .83 + 1) * 16 * sc + Math.sin(T * .37) * 10 * sc;
    const S = (9 + 34 * k) * sc;
    const ax = (u) => topX + (gx - topX) * Math.pow(u, 1.35) + S * Math.sin(u * 5.3 - T * 1.25) * Math.sin(u * Math.PI);
    const yy = (u) => cloudY + span * u;
    const uEnd = reach * (1 - .55 * k * k); // roping out: the condensation withdraws back up into the cloud
    const wob = (u) => 1 + .09 * Math.sin(u * 19 - T * 2.1) + .05 * Math.sin(u * 43 + T * 3.7) + .02 * Math.sin(u * 87 - T * 5.3); // ragged, turbulent edges
    const rad = (u) => { let r = rB * th + (rT - rB) * Math.pow(1 - u, 1.7) * (.45 + .55 * th) + rB * .8 * th * smooth((u - .86) / .14);
      if (uEnd < 1) r *= Math.max(.12, Math.min(1, (uEnd - u) / .18)); return Math.max(1.2, r * wob(u)); };
    if (gx - Rw > W + 60 && state === 'twister') { gone = true; return false; }
    // when it reaches the sign, the sign goes; when it reaches the city, so does the city
    if (state === 'twister' && reach >= 1) {
      if (orbit && !signGone) { const r = orbit.getBoundingClientRect(), h = hero.getBoundingClientRect();
        if (gx > r.left - h.left + r.width * .3) { signGone = true; orbit.classList.add('torn'); window.__flashReq = .6;
          fling(r.left - h.left + r.width * .25, r.top - h.top + r.height * .25, r.width * .5, r.height * .35, ['#4F8C8A', '#3E6F70', '#D9663A', '#E9DCC4', '#22303A'], phone ? 12 : 22, sc); } }
      const sk = skyline(); if (sk && !cityGone && gx > W * (phone ? .55 : .6)) { cityGone = true; sk.classList.add('wiped');
        fling(gx - 30 * sc, horizon - 70 * sc, 140 * sc, 66 * sc, ['#1F2A36', '#2B3846', '#3A4858', '#FFD98A'], phone ? 12 : 22, sc); }
      if (rnd() < dt * 1.1) strike(1, rnd() < .45 ? [topX + (rnd() - .5) * Rw, groundY - span * (.2 + rnd() * .3)] : null);
    }
    const lit = litK(now);
    // the storm deck: a dark lowered base across the top of the sky, tinted green in daylight
    G = form;
    let gr = ctx.createLinearGradient(0, 0, 0, cloudY + 24 * sc);
    gr.addColorStop(0, `rgba(${rgbOf.cloud},.92)`); gr.addColorStop(.7, `rgba(${rgbOf.cloud},.55)`); gr.addColorStop(1, `rgba(${rgbOf.cloud},0)`);
    ctx.globalAlpha = form; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, cloudY + 24 * sc);
    if (day > 0) { gr = ctx.createRadialGradient(topX, cloudY + span * .3, 0, topX, cloudY + span * .3, Rw * 1.7);
      gr.addColorStop(0, `rgba(78,112,84,${(.2 * day).toFixed(3)})`); gr.addColorStop(1, 'rgba(78,112,84,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, groundY); }
    for (const d of P.dk) { const x = (((d.x + T * .012) % 1.1) - .05) * W, sz = (34 + d.s * 46) * sc;
      put(spr.cloud, x, cloudY - (12 + d.y * 30) * sc, sz * 2.8, sz * 1.25, .6 + .3 * d.s); }
    // rain curtains: a heavy one wrapping the back of the storm, a lighter one ahead
    const tex = rain(), scroll = (T * 380) % 256;
    const curtain = (cx, cw, ca, y0 = cloudY) => {
      put(spr.shroud, cx, (y0 + groundY) / 2, cw * 1.1, (groundY - y0) * 1.25, ca * .3);
      const a = ca * (.4 + .2 * (1 - day)) * G; if (a <= .01) return; ctx.globalAlpha = a;
      for (let y = y0 - 256 + scroll; y < groundY; y += 256) { const top = Math.max(y, y0), hh = Math.min(y + 256, groundY + 4) - top; if (hh > 1) ctx.drawImage(tex, 0, top - y, 128, hh, cx - cw / 2, top, cw, hh); }
    };
    curtain(topX - Rw * .8, Rw * .85, .6); curtain(topX + Rw * 1.15, Rw * .55, .3);
    // the wall cloud: a lowered mass that visibly rotates, hanging lowest at the centre
    const drawCloud = (front) => { for (const p of P.cl) {
      // stacked tiers, each narrower than the one above, flattened by perspective: a rotating, lowered wall cloud
      const z = Math.sin(p.a); if ((z > 0) !== front) continue;
      const tier = p.h, R = p.R * Rw * (1 - .55 * tier), sz = (20 + 26 * p.s) * sc * (1 - .3 * tier);
      put(p.lit || (tier > .6 && z > .2) ? spr.cloudLit : spr.cloud, topX + Math.cos(p.a) * R, cloudY - 16 * sc + tier * 34 * sc + z * R * .1, sz * 3, sz * (.85 + .3 * (1 - tier)), front ? .92 : .8); } };
    for (const p of P.cl) p.a -= dt * (.75 - .4 * p.R) * (1 + k);
    drawCloud(false);
    // scud: ragged fragments under the base, spiralling in and pulled up into the wall cloud
    for (const p of P.scud) { p.h += dt * .22 * p.sp; p.R -= dt * .12 * p.sp; p.a -= dt * .9 * p.sp;
      if (p.h > 1 || p.R < .15) Object.assign(p, { h: 0, R: .5 + rnd() * .85, a: rnd() * TAU, s: rnd() });
      const sz = (7 + 13 * p.s) * sc, z = Math.sin(p.a);
      put(p.s > .55 ? spr.cloudLit : spr.cloud, topX + Math.cos(p.a) * p.R * Rw, cloudY + 10 * sc + (1 - p.h) * span * .26 + z * p.R * Rw * .1, sz * (1.8 + p.s), sz * .75,
        .7 * smooth(p.h / .2) * (1 - smooth((p.h - .7) / .3))); }
    // lightning behind the storm back-lights the funnel: a glow it stands out against in silhouette
    if (lit > .05) { ctx.globalCompositeOperation = 'lighter';
      for (let u = .05; u <= uEnd; u += .07) { const r = rad(u); put(GLOW.w, ax(u), yy(u), r * 3.6 + 18 * sc, r * 2.4 + 20 * sc, lit * (.3 - .12 * day)); }
      ctx.globalCompositeOperation = 'source-over'; }
    // inflow: spray and dust streaming across the water and spiralling in toward the base
    const inflow = (front) => { if (sprayK <= 0) return; for (let i = 0, n = lim(P.inf); i < n; i++) { const p = P.inf[i], z = Math.sin(p.a); if ((z > 0) !== front) continue;
      const R = p.R * rB, f = smooth((13 - p.R) / 3) * smooth((p.R - 1.2) / 1.2);
      put(p.dust ? spr.dust : spr.spray, gx + Math.cos(p.a) * R, groundY + 1 + z * R * .2, (5 + p.R * 1.6) * sc, (1.4 + p.s * 1.6) * sc, .42 * sprayK * f * (front ? 1 : .6)); } };
    for (const p of P.inf) { p.R -= dt * p.sp * (1.2 + 6 / p.R); p.a -= dt * p.sp * Math.min(5, 9 / p.R); if (p.R < 1.2) Object.assign(p, { R: 9 + rnd() * 5, a: rnd() * TAU }); }
    inflow(false);
    // suction vortices: thin ropes that wrap the lower funnel, flare up and die away
    const fA = 1 - .55 * k;
    const subs = (front) => { ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const v of P.sv) { const env = Math.sin(Math.PI * ((v.t % v.per) / v.per)) * mature; if (env < .05 || uEnd < .98) continue;
        let open = false;
        const flush = () => { if (!open) return; open = false;
          ctx.globalAlpha = .55 * env * fA * G * (front ? 1 : .5); ctx.strokeStyle = `rgb(${rgbOf.core})`; ctx.lineWidth = 4.5 * sc; ctx.stroke();
          if (front) { ctx.globalAlpha = .12 * env * fA * G; ctx.strokeStyle = `rgb(${rgbOf.lit})`; ctx.lineWidth = 1.4 * sc; ctx.stroke(); } };
        for (let u = v.u0; u <= 1.001; u += 1 / 40) { const an = v.ph - T * 3.4 + u * 3.6, z = Math.sin(an);
          if ((z > 0) !== front) { flush(); continue; }
          const R = rad(u) * 1.04 + 2.5 * sc, x = ax(u) + Math.cos(an) * R, y = yy(u) + z * R * .12;
          if (!open) { ctx.beginPath(); ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y); }
        flush();
        if (front) put(spr.spray, ax(1) + Math.cos(v.ph - T * 3.4 + 3.6) * (rad(1) * 1.1 + 3 * sc), groundY - 4 * sc, 26 * sc, 12 * sc, .35 * env * sprayK); } };
    for (const v of P.sv) v.t += dt;
    subs(false);
    // the funnel: shroud particles spiral up around a dark core, faster toward the ground
    for (const p of P.sh) { p.a -= dt * (1.1 + 3.8 * p.u) * p.sp; p.u -= dt * .05 * p.sp; if (p.u < 0) p.u += 1; }
    const drawShroud = (front) => { for (let i = 0, n = lim(P.sh); i < n; i++) { const p = P.sh[i];
      const u = p.u; if (u > uEnd) continue; const z = Math.sin(p.a); if ((z > 0) !== front) continue;
      const c = Math.cos(p.a), r = rad(u), sz = r * (.3 + .36 * p.s) + 1.2;
      put(p.dark ? spr.core : c < .15 && z > -.3 ? spr.lit : spr.shroud, ax(u) + c * r * p.ro, yy(u) + z * r * .12, sz * (2 + 1.3 * Math.abs(z)), sz * .85,
        (.2 + .26 * p.s) * (front ? 1 : .55) * smooth(u / .1) * fA); } };
    drawShroud(false);
    // debris: lifted in a tightening spiral, thrown clear at different depths, tumbling, dropped in the lake
    const dcol = `rgb(${mix([6, 7, 9], [42, 37, 32], day).join(',')})`;
    for (const p of P.db) {
      if (p.m < 0) { if (state === 'twister' && reach >= 1 && rnd() < dt * 6) { const d = .5 + rnd() * 1.1, w = (.9 + rnd() * 2.4) * sc * .7 * d;
        Object.assign(p, { m: 0, d, a: rnd() * TAU, rr: rB * (1 + rnd() * 2.2), h: rnd() * 6 * sc, w, h2: w * (.35 + rnd() * .6), rot: rnd() * TAU, vr: (rnd() - .5) * 14, flip: rnd() * TAU, vf: (rnd() - .5) * 14,
          t: .5 + rnd() * 2.2, wv: 3.5 + rnd() * 3, vh: (24 + rnd() * 60) * sc, land: (d - .5) * 44 * sc }); } continue; }
      if (p.m === 0) { p.a -= p.wv * dt; p.h += p.vh * dt; p.rr += 6 * sc * dt; p.t -= dt;
        const u = Math.max(0, 1 - p.h / span); p.x = ax(u) + Math.cos(p.a) * (p.rr + rad(u) * .6); p.y = groundY - p.h + Math.sin(p.a) * p.rr * .2;
        if (p.t < 0 || k > 0) { p.m = 1; p.vx = Math.sin(p.a) * p.wv * p.rr * p.d + Math.cos(p.a) * 30 * sc; p.vy = -(20 + rnd() * 90) * sc * p.d; } }
      else { p.vy += 240 * sc * p.d * dt; p.vx *= 1 - .4 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > groundY + p.land) p.m = -1; }
      p.rot += p.vr * dt; p.flip += p.vf * dt;
    }
    const db = (back) => { for (const p of P.db) { if (p.m !== 0 || (Math.sin(p.a) < 0) !== back) continue;
      chunk(p.x, p.y, p.w, p.h2, p.rot, p.flip, dcol, back ? .6 : .95); } ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    db(true);
    // the condensation funnel: a solid body with a ragged, turbulent edge, a translucent sheath round it,
    // a darker inner core and a lit flank, so it reads as a solid rotating tube rather than a smudge
    const NB = phone ? 44 : 72, L = [], Rr = [];
    for (let i = 0; i <= NB; i++) { const u = uEnd * i / NB, r = rad(u), x = ax(u), y = yy(u);
      L.push([x - r * (1 + .025 * Math.sin(u * 97 + T * 7.3) + .06 * Math.sin(u * 31 - T * 4.1)), y]);
      Rr.push([x + r * (1 + .025 * Math.sin(u * 89 - T * 6.7 + 2) + .06 * Math.sin(u * 27 + T * 3.9)), y]); }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1] - 8 * sc);
    for (const p of L) ctx.lineTo(p[0], p[1]);
    for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.lineTo(Rr[0][0], Rr[0][1] - 8 * sc); ctx.closePath();
    gr = ctx.createLinearGradient(0, cloudY - 8 * sc, 0, cloudY + span * .14); gr.addColorStop(0, `rgba(${rgbOf.shroud},0)`); gr.addColorStop(1, `rgba(${rgbOf.shroud},1)`);
    ctx.globalAlpha = .9 * fA * G; ctx.fillStyle = gr; ctx.fill();
    let u = 0;
    while (u <= uEnd) {
      const r = rad(u), x = ax(u), y = yy(u), a = smooth(u / .06) * fA;
      put(spr.shroud, x, y, r * 2.8, r * 2.6, .22 * a);
      put(spr.core, x + r * .14, y, r * 1.55, r * 2.4, .75 * a);
      put(spr.lit, x - r * .55, y, r * .75, r * 2.8, .15 * a);
      u += Math.max(1.6, r * .26) / span;
    }
    // spiral banding: helical striations, light and dark, winding round the front of the funnel as it turns
    ctx.lineCap = 'round';
    for (let b = 0; b < P.n.bands; b++) { const ph = b / P.n.bands * TAU, light = b % 2 === 0;
      ctx.strokeStyle = `rgb(${light ? rgbOf.lit : rgbOf.core})`; let open = false, last = 0;
      const flush = () => { if (open) { ctx.globalAlpha = (light ? .2 : .36) * fA * G * last; ctx.lineWidth = (light ? 1.6 : 2.4) * sc; ctx.stroke(); open = false; } };
      for (let i = 2; i <= P.n.bs; i++) { const u = i / P.n.bs * uEnd, an = ph + u * 9 - T * (2 + 1.5 * u), z = Math.sin(an);
        if (z < .2) { flush(); continue; }
        const r = rad(u), x = ax(u) + Math.cos(an) * r * .85, y = yy(u) + z * r * .12;
        if (!open) { ctx.beginPath(); ctx.moveTo(x, y); open = true; last = 0; } else ctx.lineTo(x, y);
        last = Math.max(last, z * smooth(u / .15)); }
      flush(); }
    drawShroud(true);
    subs(true);
    drawCloud(true);
    // rain wrapping round the trailing flank, in front of the funnel's edge
    curtain(ax(.6) - rad(.6) * 1.4 - Rw * .12, Rw * .5, .32, cloudY + span * .15);
    // where it meets the lake: a churning skirt of spray and dust, and a smear of reflection
    if (sprayK > 0) {
      put(spr.spray, gx, groundY - 3 * sc, rB * 11, rB * 2.8, .32 * sprayK);
      put(spr.dust, gx, groundY - 9 * sc, rB * 5.5, rB * 3.6, .26 * sprayK);
      if (reach >= .98) put(spr.core, gx, groundY + 18 * sc, rB * 2.4 * th + 4, 34 * sc, .2 * sprayK);
    }
    for (let i = 0, n = lim(P.sp); i < n; i++) { const p = P.sp[i];
      p.age += dt;
      if (p.age > p.life) { if (state !== 'twister' || sprayK <= 0) { p.life = -1; continue; }
        Object.assign(p, { age: p.life < 0 ? rnd() * 1.5 : 0, life: 1.1 + rnd() * 1.6, a: rnd() * TAU, r0: rB * (.6 + rnd() * .8), vr: (12 + rnd() * 40) * sc, vh: (8 + rnd() * 44) * sc * (rnd() < .25 ? 1.9 : 1), s: .6 + rnd() * .8, dust: rnd() < .3 }); }
      const q = p.age / p.life, rr = p.r0 + p.vr * p.age; p.a -= dt * 5 * Math.min(1.5, rB * 1.5 / Math.max(rr, 1));
      const h = p.vh * p.age * (1 - .3 * q), sz = (5 + 18 * q) * sc * p.s;
      put(p.dust ? spr.dust : spr.spray, gx + Math.cos(p.a) * rr, groundY - h + Math.sin(p.a) * rr * .22, sz * 2.4, sz * 1.5, .36 * sprayK * Math.sin(Math.PI * q));
    }
    inflow(true);
    db(false);
    for (const p of P.db) if (p.m === 1) { streak(p.x, p.y, p.vx, p.vy, p.h2 * .8, dcol, .35 * p.d); chunk(p.x, p.y, p.w, p.h2, p.rot, p.flip, dcol, Math.min(1, .55 + .4 * p.d)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    for (let i = P.burst.length - 1; i >= 0; i--) { const p = P.burst[i]; p.age += dt; p.vy += 260 * sc * dt; p.vx *= 1 - .3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.y > H + 20 || p.age > 6) { P.burst.splice(i, 1); continue; } streak(p.x, p.y, p.vx, p.vy, p.h * .8, p.col, .3); chunk(p.x, p.y, p.w, p.h, p.rot, p.flip, p.col, 1); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    // and the flash catches its near side too
    if (lit > .02) {
      ctx.globalCompositeOperation = 'source-atop';
      gr = ctx.createRadialGradient(litX, cloudY, 0, litX, cloudY, W * .9);
      const a = lit * (.2 - .06 * day);
      gr.addColorStop(0, `rgba(222,230,255,${a.toFixed(3)})`); gr.addColorStop(1, `rgba(200,212,255,${(a * .3).toFixed(3)})`);
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    G = 1;
    return true;
  };
  const startTornado = () => {
    if (state === 'twister' || reduce) return;
    size(); state = 'twister'; T = 0; RT = 0; gone = false; signGone = cityGone = false;
    tx = W * (W < 700 ? .12 : .1); gx = tx; build(); kick();
    clearTimeout(unblowTimer); unblow(); blowTimer = setTimeout(blowActs, 2200); // a quick restart must not let the last ending's unblow cancel this blow
  };
  // anything else on stage when the twister touches down (the UFO, Bigfoot, the sled team...) gets sucked into it
  const LAYERS = '.ufo-layer, .ice-layer, .bf-layer, .yeti-layer';
  let blowTimer = 0, unblowTimer = 0, abortTimer = 0, blown = [];
  const blowActs = () => {
    if (state !== 'twister') return;
    const ox = gx, oy = horizon;
    blown = [...hero.querySelectorAll(LAYERS)].map((el) => {
      el.style.transformOrigin = `${ox.toFixed(0)}px ${oy.toFixed(0)}px`;
      return el.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'scale(.5) rotate(18deg)', opacity: 1, offset: .4 },
        { transform: `translate(0,${(-H * .2).toFixed(0)}px) scale(.22) rotate(-24deg)`, opacity: .9, offset: .7 },
        { transform: `translate(0,${(-H * .5).toFixed(0)}px) scale(.03) rotate(30deg)`, opacity: 0 },
      ], { duration: 1700, easing: 'cubic-bezier(.45,0,.7,.6)', fill: 'forwards' });
    });
    // once they're gone, end whatever act was running so nothing pops back mid-scene
    clearTimeout(abortTimer); abortTimer = setTimeout(() => { try { window.__acts && window.__acts.abort && window.__acts.abort(); } catch (e) { /* act not running */ }
      try { window.__iceAbort && window.__iceAbort(); } catch (e) { /* no crossing */ } }, 1750);
  };
  const unblow = () => { clearTimeout(blowTimer); clearTimeout(abortTimer); blown.forEach((a) => a.cancel()); blown = []; };
  const endTornado = () => {
    if (state !== 'twister') return;
    state = gone ? 'calm' : 'roping'; RT = 0; // it ropes out and dissipates instead of vanishing
    clearTimeout(unblowTimer); unblowTimer = setTimeout(unblow, 1200);
    if (orbit) { orbit.classList.remove('torn'); orbit.classList.add('returning'); setTimeout(() => orbit.classList.remove('returning'), 1200); }
    const sk = skyline(); if (sk) sk.classList.remove('wiped');
    kick();
  };

  // ---------- full precipitation: bolts find the sign and fry it ----------
  // The sign's outline, post and tube groups, in the sign image's own pixels (440 x 411)
  const OUTLINE = [[30, 102], [120, 80], [250, 68], [400, 80], [428, 96], [420, 160], [408, 246], [300, 258], [200, 268], [110, 279], [70, 196], [30, 102]];
  const POST = [[222, 280], [226, 378], [168, 386], [378, 392], [250, 376], [246, 272]];
  const TUBES = [[52, 70, 34, 44], [105, 95, 65, 70], [170, 95, 130, 70], [100, 165, 70, 85], [170, 165, 120, 85], [310, 160, 100, 92]]; // starburst, FR, ESH, CO, AST, LAB
  let fried = false, fryTimer = 0, friedTimer = 0, fz = null;
  const flashScreen = (x, y) => {
    const f = document.createElement('div'); f.className = 'fry-flash'; f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--fx', x.toFixed(0) + 'px'); f.style.setProperty('--fy', y.toFixed(0) + 'px');
    document.body.append(f); setTimeout(() => f.remove(), 1000);
  };
  const fry = () => {
    if (fried || !orbit || reduce) return; fried = true;
    size();
    const neon = orbit.querySelector('.neon'), n = (neon || orbit).getBoundingClientRect(), h = hero.getBoundingClientRect();
    const m = (ix, iy) => [n.left - h.left + ix / 440 * n.width, n.top - h.top + iy / 411 * n.height];
    const fs = n.width / 310, phone = W < 700;
    // three bolts converge on the sign from different parts of the sky
    const hits = [[m(68, 70), W * .1, 0], [m(372, 166), W * .92, 120], [m(250, 70), W * .5, 250]];
    hits.forEach(([p, sx, ms]) => setTimeout(() => { strike(1, p, sx + (rnd() - .5) * W * .08); window.__flashReq = 2; burst(p, phone ? 14 : 26, 1); }, ms));
    flashScreen(n.left + n.width * .5, n.top + n.height * .3);
    if (stack) { stack.classList.add('quake-hard'); setTimeout(() => stack.classList.remove('quake-hard'), 700); }
    // the whole screen takes the hit
    document.body.classList.remove('screenquake'); void document.body.offsetWidth; document.body.classList.add('screenquake'); setTimeout(() => document.body.classList.remove('screenquake'), 900);
    orbit.classList.add('zapped');
    const outline = OUTLINE.map(([x, y]) => m(x, y)), lens = [0];
    for (let i = 1; i < outline.length; i++) lens.push(lens[i - 1] + Math.hypot(outline[i][0] - outline[i - 1][0], outline[i][1] - outline[i - 1][1]));
    const tubes = TUBES.map(([x, y, w, hh]) => ({ c: m(x + w / 2, y + hh / 2), w: w / 440 * n.width, h: hh / 411 * n.height })).sort(() => rnd() - .5);
    tubes.forEach((t, i) => { t.at = .3 + i * .17 + rnd() * .08; });
    const base = m(0, 388)[1], b0 = m(168, 0)[0], b1 = m(378, 0)[0], p0 = m(218, 0)[0], p1 = m(250, 0)[0], pTop = m(0, 280)[1];
    fz = { t: 0, m, fs, outline, lens, tubes, sparks: [], smoke: [], cap: phone ? 90 : 190, smokeCap: phone ? 26 : 52, base, b0, b1, p0, p1, pTop, star: m(68, 92) };
    function burst(p, k, heat) { if (!fz) return; for (let i = 0; i < k && fz.sparks.length < fz.cap; i++) { const a = -Math.PI * (.08 + rnd() * .84), v = (90 + rnd() * 260) * fs * heat;
      fz.sparks.push({ x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: .7 + rnd() * 1.1, ember: rnd() < .22, rest: 0 }); } }
    fz.burst = burst;
    kick();
    friedTimer = setTimeout(() => { if (!fried) return; orbit.classList.remove('zapped'); orbit.classList.add('fried'); }, 1900);
  };
  const arcLine = (pts, wide) => { // a crackling arc: a blue haze, a bright body and a white-hot thread
    if (pts.length < 2) return;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.globalAlpha = .35 * G; ctx.strokeStyle = '#6E94FF'; ctx.lineWidth = wide * 3.2; ctx.stroke();
    ctx.globalAlpha = .8 * G; ctx.strokeStyle = '#BFD4FF'; ctx.lineWidth = wide * 1.3; ctx.stroke();
    ctx.globalAlpha = G; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = wide * .5; ctx.stroke();
  };
  const along = (s) => { // a point on the sign's outline, and the outward normal there
    const L = fz.lens, tot = L[L.length - 1]; s = ((s % 1) + 1) % 1 * tot;
    let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const [ax0, ay0] = fz.outline[i - 1], [bx, by] = fz.outline[i], f = (s - L[i - 1]) / Math.max(1e-3, L[i] - L[i - 1]), len = Math.hypot(bx - ax0, by - ay0) || 1;
    return [ax0 + (bx - ax0) * f, ay0 + (by - ay0) * f, (by - ay0) / len, -(bx - ax0) / len];
  };
  const drawFry = (now, dt) => {
    const f = fz, t = (f.t += dt), fs = f.fs;
    if (t > 13 && !f.sparks.length && !f.smoke.length) { fz = null; return false; }
    ctx.globalCompositeOperation = 'lighter';
    // arcs crawl along the sign's outline: savage at first, then sputtering out
    const I = t < .3 ? 1 : t < 1.4 ? .8 * (rnd() < .85 ? 1 : .2) : t < 3.2 ? (rnd() < .3 ? (3.2 - t) / 1.8 : 0) : 0;
    const tot = f.lens[f.lens.length - 1];
    for (let a = 0, n = Math.round(I * (W < 700 ? 3 : 5)); a < n; a++) {
      const s0 = rnd(), len = (.04 + rnd() * .12) * (I + .3), pts = [], N = Math.max(3, Math.round(len * tot / 6)), jit = (2 + rnd() * 4) * fs;
      for (let i = 0; i <= N; i++) { const [x, y, nx, ny] = along(s0 + len * i / N), o = (rnd() - .35) * jit; pts.push([x + nx * o, y + ny * o]); }
      const e = pts[pts.length - 1], [, , nx, ny] = along(s0 + len); pts.push([e[0] + nx * (6 + rnd() * 14) * fs + (rnd() - .5) * 8, e[1] + ny * (6 + rnd() * 14) * fs + (rnd() - .5) * 8]);
      arcLine(pts, (1 + rnd() * .8) * Math.max(.8, fs));
      if (rnd() < .3) put(GLOW.w, e[0], e[1], 26 * fs, 26 * fs, .5);
    }
    if (I > 0 && rnd() < .35 * I) { // a jump down the post to the base plate
      const x0 = (f.p0 + f.p1) / 2, pts = []; for (let i = 0; i <= 9; i++) pts.push([x0 + (rnd() - .5) * 14 * fs, f.pTop + (f.base - f.pTop) * i / 9]);
      arcLine(pts, Math.max(.8, fs));
    }
    // the tubes pop one by one: a white flash, a fistful of sparks, then that letter goes dark
    for (const tb of f.tubes) {
      if (t >= tb.at && !tb.popped) { tb.popped = true; f.burst(tb.c, W < 700 ? 6 : 12, .8); }
      const k = t - tb.at; if (k >= 0 && k < .09) put(GLOW.w, tb.c[0], tb.c[1], tb.w * 1.8, tb.h * 1.8, 1 - k / .09);
    }
    // the starburst catches fire, burns down to an ember
    const fk = (t - .25) / 5.5;
    if (fk > 0 && fk < 1.6) { const st = fk < .08 ? fk / .08 : fk < 1 ? Math.pow(1 - fk, .8) : 0, [cx, cy] = f.star, fl = 14 * fs;
      if (st > 0) { put(GLOW.o, cx, cy - fl * .4, fl * 7 * st, fl * 7 * st, .28);
        for (let i = 0; i < 6; i++) { const s = fl * (.55 + rnd() * .6) * st, x = cx + (rnd() - .5) * fl * .7, y = cy - rnd() * fl * 1.7 * st;
          put(GLOW.o, x, y, s * 1.2, s * 2.1, .75); put(GLOW.y, x, y + s * .35, s * .55, s * 1.05, .85); } }
      else put(GLOW.o, cx, cy, fl * 1.8, fl * 1.8, .35 + .3 * rnd()); // the ember
    }
    // sparks: gravity, a bounce off the base plate and the post, embers that sit there glowing
    for (let i = f.sparks.length - 1; i >= 0; i--) { const p = f.sparks[i]; p.age += dt;
      if (p.age > p.life * (p.ember ? 3.2 : 1)) { f.sparks.splice(i, 1); continue; }
      if (!p.rest) { p.vy += 560 * fs * dt; p.vx *= 1 - .5 * dt; const px = p.x, py = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > f.pTop && p.y < f.base && p.x > f.p0 && p.x < f.p1 && (px <= f.p0 || px >= f.p1)) { p.x = px; p.vx *= -.45; }
        if (p.vy > 0 && p.y > f.base && py <= f.base && p.x > f.b0 && p.x < f.b1) { p.y = f.base; p.vy *= -.36; p.vx *= .65; if (Math.abs(p.vy) < 40 * fs) p.rest = 1; } }
      const heat = 1 - p.age / (p.life * (p.ember ? 3.2 : 1));
      if (p.ember) put(GLOW.o, p.x, p.y, (5 + 4 * heat) * fs, (5 + 4 * heat) * fs, heat * (.6 + .4 * rnd()));
      if (!p.rest) { ctx.globalAlpha = Math.min(1, heat * 1.2) * G; ctx.strokeStyle = heat > .65 ? '#FFF8E2' : heat > .35 ? '#FFD27A' : '#FF8A3A'; ctx.lineWidth = (p.ember ? 2 : 1.4) * Math.max(.8, fs);
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * .02, p.y - p.vy * .02); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    // dead tubes stay dark until the CSS has the whole sign dimmed, then hand over
    const dk = t < 1.9 ? 1 : Math.max(0, 1 - (t - 1.9) / .8);
    if (dk > 0) for (const tb of f.tubes) { const k = t - tb.at; if (k < .09) continue; const on = k < .14 ? 0 : k < .2 ? 1 : k < .25 ? .3 : 1;
      put(GLOW.char, tb.c[0], tb.c[1], tb.w * 1.15, tb.h * 1.05, .5 * on * dk); }
    // smoke boils off the starburst, the LAB box and the top edge, and drifts downwind
    const sources = [[f.star, t < 5.5 ? 7 : t < 10 ? 2.5 : 0], [f.m(360, 160), 4 * Math.max(0, 1 - t / 7)], [f.m(220, 74), 3 * Math.max(0, 1 - t / 6)]];
    if (t > .2) for (const [p, rate] of sources) if (f.smoke.length < f.smokeCap && rnd() < rate * dt)
      f.smoke.push({ x: p[0] + (rnd() - .5) * 10 * fs, y: p[1], vx: (5 + rnd() * 12) * fs, vy: -(15 + rnd() * 16) * fs, age: 0, life: 3 + rnd() * 2.2, s: .7 + rnd() * .6 });
    for (let i = f.smoke.length - 1; i >= 0; i--) { const p = f.smoke[i]; p.age += dt; if (p.age > p.life) { f.smoke.splice(i, 1); continue; }
      const q = p.age / p.life; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - .25 * dt; p.vx += 4 * fs * dt;
      const r = (5 + 30 * q) * fs * p.s; put(spr.smoke, p.x, p.y, r * 2, r * 2, .55 * Math.sin(Math.PI * Math.min(1, q * 1.6)) * (1 - q * .5)); }
    return true;
  };
  const unfry = () => { clearTimeout(friedTimer); if (!fried) return; fried = false; if (orbit) { orbit.classList.remove('zapped', 'fried'); orbit.classList.add('relit'); setTimeout(() => orbit.classList.remove('relit'), 1600); } };

  // ---------- the loop ----------
  let next = 0;
  const loop = () => { // weather changes are slider-paced, so 5 checks a second is plenty (and timers sleep in hidden tabs)
    const now = performance.now(), level = reduce ? 0 : (window.__storm || 0);
    if (level > 0 && now > next && onScreen && !document.hidden) { strike(level); next = now + (5200 - 4400 * level) * (.6 + rnd() * .8); } // ~5 s apart at 75%, under a second near 100%; none while scrolled away
    if (window.__tornado) startTornado(); else endTornado();
    const rain = window.__stormRain || 0; // the fry follows the rain, not the lightning rate, so it still happens at 60°F
    // the fry waits until someone is looking
    if (rain >= .97 && !window.__tornado) { if (!fryTimer && onScreen && !document.hidden) fryTimer = setTimeout(fry, 1600); } else { clearTimeout(fryTimer); fryTimer = 0; if (rain < .9) unfry(); }
  };
  setInterval(loop, 200);
  window.__storm_debug = { strike, startTornado, endTornado, fry, unfry, get T() { return T; }, get state() { return state; }, get Q() { return Q; }, get cost() { return cost; }, set Q(v) { fixQ = v; } };
})();
