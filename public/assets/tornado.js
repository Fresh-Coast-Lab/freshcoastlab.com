// Weather with consequences. Above 75% precipitation, lightning: real branching bolts, more often as it
// approaches 100%. Max out wind, precipitation and temperature together and a tornado drops out of the
// clouds, rips the sign off its post and tears through the skyline. Ease off and everything comes back.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HZ = 0.36;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'storm-layer'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="tw-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1A1F26"/><stop offset=".45" stop-color="#3A424C"/><stop offset=".7" stop-color="#262C34"/><stop offset="1" stop-color="#14181E"/></linearGradient>
      <filter id="tw-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="bolt-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g class="bolts"></g>
    <g class="twister" opacity="0">
      <path class="tw-cloud" fill="#151A20" opacity=".92" filter="url(#tw-soft)"/>
      <path class="tw-body" fill="url(#tw-g)" filter="url(#tw-soft)"/>
      <g class="tw-bands" fill="none" stroke="rgba(160,170,182,.35)" stroke-width="1.6" stroke-linecap="round"></g>
      <g class="tw-dust"></g>
      <g class="tw-debris" fill="#0B0E12"></g>
    </g>`;
  hero.append(svg);
  const bolts = svg.querySelector('.bolts'), tw = svg.querySelector('.twister'), cloud = svg.querySelector('.tw-cloud'), body = svg.querySelector('.tw-body');
  const bands = svg.querySelector('.tw-bands'), dustG = svg.querySelector('.tw-dust'), debrisG = svg.querySelector('.tw-debris');
  for (let i = 0; i < 9; i++) { const p = document.createElementNS(NS, 'path'); bands.append(p); }
  const dusts = Array.from({ length: 7 }, () => { const e = document.createElementNS(NS, 'ellipse'); e.setAttribute('fill', 'rgba(70,64,58,.5)'); e.setAttribute('filter', 'url(#tw-soft)'); dustG.append(e); return e; });
  const debris = Array.from({ length: 26 }, (_, i) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('width', 2 + (i % 4)); r.setAttribute('height', 1.4 + (i % 3)); debrisG.append(r); return { el: r, a: Math.random() * 6.28, h: Math.random(), sp: 2 + Math.random() * 3, rad: .5 + Math.random() * .6 }; });
  const orbit = document.querySelector('.hero .orbit'), skyline = () => document.querySelector('.skyline-layer');
  const stack = document.querySelector('.hero-stack');
  let W = 0, H = 0, horizon = 0;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size);

  // ---------- lightning ----------
  const strike = (level) => {
    size();
    const x0 = W * (.08 + Math.random() * .84), y0 = 0, y1 = horizon - Math.random() * 8;
    const pts = [[x0, y0]]; let x = x0, y = y0; const steps = 14;
    for (let i = 1; i <= steps; i++) { y = y0 + (y1 - y0) * i / steps; x += (Math.random() - .5) * W * .05; pts.push([x, y]); }
    const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L');
    let br = ''; for (let b = 0; b < 2 + Math.floor(level * 3); b++) { const k = 3 + Math.floor(Math.random() * (steps - 6)); let [bx, by] = pts[k]; br += `M${bx.toFixed(1)},${by.toFixed(1)}`;
      for (let j = 0; j < 4; j++) { bx += (Math.random() - .3) * W * .04 * (Math.random() < .5 ? -1 : 1); by += (y1 - y0) / steps * (.8 + Math.random() * .6); br += ` L${bx.toFixed(1)},${by.toFixed(1)}`; } }
    const g = document.createElementNS(NS, 'g'); g.setAttribute('filter', 'url(#bolt-glow)');
    g.innerHTML = `<path d="${d}" stroke="#F4F7FF" stroke-width="${(2.2 + level * 1.6).toFixed(1)}" fill="none" stroke-linejoin="round"/><path d="${br}" stroke="#DCE6FF" stroke-width="1.1" fill="none" opacity=".85"/>`;
    bolts.append(g);
    window.__flashReq = .7 + level * .5;
    if (level > .5 && stack) { stack.classList.remove('quake'); void stack.offsetWidth; stack.classList.add('quake'); setTimeout(() => stack.classList.remove('quake'), 160); }
    const t0 = performance.now();
    (function fade(t) { const k = (t - t0) / 260; g.setAttribute('opacity', k < .15 ? 1 : k < .3 ? .2 : k < .45 ? 1 : Math.max(0, 1 - (k - .45) / .55)); if (k < 1) requestAnimationFrame(fade); else g.remove(); })(t0);
  };

  // ---------- the tornado ----------
  let state = 'calm', t0 = 0, tx = 0, signGone = false, cityGone = false;
  const funnel = (cx, top, bottom, k, grow) => {
    // a rope that widens at the cloud base, sways, and twists
    const n = 18, left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, y = top + (bottom - top) * u * grow, w = (6 + 70 * Math.pow(1 - u, 2.2)) * (W / 900 + .5);
      const sway = Math.sin(u * 3.2 + k * 1.7) * 14 * u + Math.sin(k * .9) * 10 * u * u;
      left.push([cx + sway - w, y]); right.push([cx + sway + w, y]);
    }
    body.setAttribute('d', 'M' + left.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + ' L' + right.reverse().map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z');
    [...bands.children].forEach((p, i) => { const u = ((i / 9) + (k * .35) % 1) % 1, y = top + (bottom - top) * u * grow, w = (6 + 70 * Math.pow(1 - u, 2.2)) * (W / 900 + .5), sway = Math.sin(u * 3.2 + k * 1.7) * 14 * u + Math.sin(k * .9) * 10 * u * u;
      p.setAttribute('d', `M${(cx + sway - w * .9).toFixed(1)},${y.toFixed(1)} Q${(cx + sway).toFixed(1)},${(y + 5).toFixed(1)} ${(cx + sway + w * .9).toFixed(1)},${(y - 2).toFixed(1)}`); p.setAttribute('opacity', (.3 + .7 * Math.sin(u * 3.14)).toFixed(2)); });
    return Math.sin(3.2 + k * 1.7) * 14 + Math.sin(k * .9) * 10; // the sway at the ground
  };
  const tornadoFrame = (now) => {
    const k = (now - t0) / 1000, top = H * .02, phone = W < 700;
    tw.setAttribute('opacity', Math.min(1, k / 1.2).toFixed(2));
    cloud.setAttribute('d', `M${-40},${top - 20} H${W + 40} V${top + 46 + Math.sin(k) * 6} Q${W * .7},${top + 70} ${W * .5},${top + 52} T${-40},${top + 58} Z`);
    // descend for 2.4 s, then travel across the lake from the left, slowing as it chews through things
    const grow = Math.min(1, k / 1.8), travel = Math.max(0, k - 1.8);
    tx = -W * .08 + travel * W * (phone ? .16 : .13);
    const sway = funnel(tx, top + 40, horizon + 4, k, grow);
    const gx = tx + sway;
    dusts.forEach((e, i) => { const a = k * 2.2 + i * .9; e.setAttribute('cx', (gx + Math.cos(a) * 36 * (W / 900 + .5)).toFixed(1)); e.setAttribute('cy', (horizon - 4 - Math.abs(Math.sin(a)) * 10).toFixed(1));
      e.setAttribute('rx', (24 + 10 * Math.sin(a * 1.3)).toFixed(1)); e.setAttribute('ry', '9'); e.setAttribute('opacity', grow >= 1 ? '1' : '0'); });
    debris.forEach((d) => { d.a += d.sp * .016 * (1 + d.h); const rr = (16 + d.h * 60) * d.rad * (W / 900 + .5), y = horizon - d.h * (horizon - top) * .75;
      d.el.setAttribute('x', (gx + Math.cos(d.a) * rr * (1 - d.h * .4) + Math.sin(k * .9) * 10 * d.h).toFixed(1)); d.el.setAttribute('y', (y + Math.sin(d.a) * 4).toFixed(1));
      d.el.setAttribute('transform', `rotate(${(d.a * 57) % 360} ${d.el.getAttribute('x')} ${d.el.getAttribute('y')})`); d.el.setAttribute('opacity', grow >= 1 ? '1' : '0'); });
    // when it reaches the sign, the sign goes; when it reaches the city, so does the city
    if (orbit && !signGone) { const r = orbit.getBoundingClientRect(), h = hero.getBoundingClientRect(); if (grow >= 1 && gx > r.left - h.left + r.width * .3) { signGone = true; orbit.classList.add('torn'); window.__flashReq = .6; } }
    const sk = skyline(); if (sk && !cityGone && gx > W * (phone ? .55 : .6)) { cityGone = true; sk.classList.add('wiped'); }
    if (Math.random() < .02) strike(1);
    if (gx > W + 120) { tx = W + 200; }
    if (state === 'twister') requestAnimationFrame(tornadoFrame); else tw.setAttribute('opacity', 0);
  };
  const startTornado = () => { if (state === 'twister' || reduce) return; state = 'twister'; t0 = performance.now(); signGone = cityGone = false; requestAnimationFrame(tornadoFrame); };
  const endTornado = () => {
    if (state !== 'twister') return; state = 'calm';
    tw.setAttribute('opacity', 0);
    if (orbit) { orbit.classList.remove('torn'); orbit.classList.add('returning'); setTimeout(() => orbit.classList.remove('returning'), 1200); }
    const sk = skyline(); if (sk) sk.classList.remove('wiped');
  };

  // ---------- the loop ----------
  let next = 0;
  const loop = (now) => {
    const level = reduce ? 0 : (window.__storm || 0);
    if (level > 0 && now > next) { strike(level); next = now + (5200 - 4400 * level) * (.6 + Math.random() * .8); } // ~5 s apart at 75%, under a second near 100%
    if (window.__tornado) startTornado(); else endTornado();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__storm_debug = { strike, startTornado, endTornado };
})();
