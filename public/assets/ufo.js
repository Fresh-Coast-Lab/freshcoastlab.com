// Easter eggs in the hero, in 1950s B-movie style: a saucer beams up a walker (on load), a lake monster knocks the
// sign over (once, later), Bigfoot strolls the shore. Tap the sign to cycle through them.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const HZ = 0.36; // the lake horizon in the hero shader, as a fraction of height from the bottom
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ufo-layer'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="ufo-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#CFFFEF" stop-opacity=".85"/><stop offset=".6" stop-color="#3DF2B0" stop-opacity=".35"/><stop offset="1" stop-color="#3DF2B0" stop-opacity=".08"/>
      </linearGradient>
      <radialGradient id="ufo-dome" cx=".4" cy=".35"><stop offset="0" stop-color="#E8FBFF" stop-opacity=".95"/><stop offset="1" stop-color="#7CD3E0" stop-opacity=".35"/></radialGradient>
    </defs>
    <g class="beam" opacity="0"><polygon points="-6,0 6,0 26,100 -26,100" fill="url(#ufo-beam)"/></g>
    <g class="man">
      <g class="body" fill="#05070B">
        <circle cx="0" cy="-17.5" r="2.6"/>
        <path d="M-2.2,-14.5 h4.4 l1,8 h-6.4z"/>
        <g class="arm a1"><rect x="-0.9" y="0" width="1.8" height="6.5" rx=".9"/></g>
        <g class="arm a2"><rect x="-0.9" y="0" width="1.8" height="6.5" rx=".9"/></g>
        <g class="leg l1"><rect x="-1" y="0" width="2" height="7.5" rx="1"/></g>
        <g class="leg l2"><rect x="-1" y="0" width="2" height="7.5" rx="1"/></g>
      </g>
    </g>
    <g class="ship">
      <ellipse cx="0" cy="-5" rx="9" ry="7" fill="url(#ufo-dome)"/>
      <ellipse cx="0" cy="0" rx="24" ry="6" fill="#8FA3B3"/>
      <ellipse cx="0" cy="-1.2" rx="24" ry="3.4" fill="#C9D6DF"/>
      <ellipse cx="0" cy="2.6" rx="13" ry="2.4" fill="#4E5E6C"/>
      <g class="lights"><circle cx="-15" cy="1.2" r="1.5"/><circle cx="-5" cy="2.6" r="1.5"/><circle cx="5" cy="2.6" r="1.5"/><circle cx="15" cy="1.2" r="1.5"/></g>
    </g>`;
  hero.prepend(svg);
  const man = svg.querySelector('.man'), ship = svg.querySelector('.ship'), beam = svg.querySelector('.beam');
  const limbs = { a1: svg.querySelector('.a1'), a2: svg.querySelector('.a2'), l1: svg.querySelector('.l1'), l2: svg.querySelector('.l2') };
  const lights = [...svg.querySelectorAll('.lights circle')];
  let W = 0, H = 0, horizon = 0, scale = 1;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); scale = Math.max(1.1, Math.min(1.5, W / 800)); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size);
  const place = (el, x, y, s = 1, extra = '') => el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(s * scale).toFixed(3)}) ${extra}`);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const hide = () => { man.style.opacity = 0; ship.style.opacity = 0; beam.setAttribute('opacity', 0); };
  hide();
  let playing = false;
  // when the saucer crosses over the sign, the sign takes the hit
  const orbitEl = document.querySelector('.orbit');
  const signX = () => { const r = orbitEl.getBoundingClientRect(), h = hero.getBoundingClientRect(); return r.left - h.left + r.width / 2; };
  const disturb = () => {
    if (!orbitEl) return;
    orbitEl.classList.remove('disturbed'); void orbitEl.offsetWidth; orbitEl.classList.add('disturbed');
    setTimeout(() => { orbitEl.classList.remove('disturbed'); orbitEl.classList.add('damaged'); }, 2400);
  };
  const play = () => {
    if (playing) return; playing = true; size();
    // on phones the sign covers the middle of the horizon, so the pickup happens left of it
    const stopX = W * (W < 700 ? 0.2 : 0.3), startX = -30, shipY = horizon - 118 * scale;
    const T = { walk: 5200, arrive: 1800, beam: 700, lift: 2000, off: 400, leave: 1100 };
    const t0 = performance.now(); let hit = false; const sX = orbitEl ? signX() : -1e9;
    man.style.opacity = 1; ship.style.opacity = 1;
    const step = (now) => {
      const t = now - t0; let k = t;
      // 1. he walks in along the far shore
      const walkT = Math.min(1, k / T.walk), mx = lerp(startX, stopX, walkT);
      const stride = walkT < 1 ? Math.sin(t / 110) : 0;
      limbs.l1.setAttribute('transform', `translate(-0.8,-6.8) rotate(${stride * 28})`);
      limbs.l2.setAttribute('transform', `translate(0.8,-6.8) rotate(${-stride * 28})`);
      limbs.a1.setAttribute('transform', `translate(-2.6,-13.6) rotate(${-stride * 24})`);
      limbs.a2.setAttribute('transform', `translate(2.6,-13.6) rotate(${stride * 24})`);
      let my = horizon + Math.abs(stride) * -0.6, ms = 1, mo = 1;
      // 2. the saucer glides in from the right and slows over him, starting before he stops
      const arriveStart = T.walk - T.arrive * 0.6;
      let sx = W + 60, sy = shipY - 40 * scale;
      if (k > arriveStart) {
        const a = Math.min(1, (k - arriveStart) / T.arrive);
        sx = lerp(W + 60, stopX, ease(a)); sy = lerp(shipY - 40 * scale, shipY, ease(a)) + Math.sin(t / 380) * 2;
      }
      const beamStart = arriveStart + T.arrive, liftStart = beamStart + T.beam, beamOff = liftStart + T.lift, leaveStart = beamOff + T.off;
      // 3. the beam comes down, 4. he floats up, shrinking into the ship
      if (k > beamStart && k < beamOff + T.off) {
        const on = Math.min(1, (k - beamStart) / T.beam), off = k > beamOff ? 1 - Math.min(1, (k - beamOff) / T.off) : 1;
        beam.setAttribute('opacity', (on * off * (0.75 + 0.25 * Math.sin(t / 60))).toFixed(2));
        const len = (horizon - shipY) / 100;
        beam.setAttribute('transform', `translate(${sx.toFixed(1)},${(shipY + 3 * scale).toFixed(1)}) scale(${scale.toFixed(3)},${len.toFixed(3)})`);
      } else beam.setAttribute('opacity', 0);
      if (k > liftStart) {
        const l = Math.min(1, (k - liftStart) / T.lift), e = ease(l);
        my = lerp(horizon, shipY + 6 * scale, e); ms = lerp(1, 0.35, e); mo = l > 0.85 ? 1 - (l - 0.85) / 0.15 : 1;
        const flail = Math.sin(t / 90) * 30;
        limbs.a1.setAttribute('transform', `translate(-2.6,-13.6) rotate(${150 + flail})`);
        limbs.a2.setAttribute('transform', `translate(2.6,-13.6) rotate(${-150 - flail})`);
      }
      // 5. and it's gone
      if (k > leaveStart) {
        const g = Math.min(1, (k - leaveStart) / T.leave), e = g * g;
        sx = lerp(stopX, -80, e) + 0; sy = lerp(shipY, shipY - 160 * scale, e);
        ship.style.opacity = 1 - Math.max(0, g - 0.7) / 0.3;
      }
      if (!hit && sx < sX + 40 && sx > sX - 60) { hit = true; disturb(); }
      place(man, mx, my, ms); man.style.opacity = mo;
      place(ship, sx, sy);
      lights.forEach((c, i) => c.setAttribute('fill', Math.floor(t / 140 + i) % 4 === 0 ? '#FFE9A8' : '#FF6A3D'));
      if (k < leaveStart + T.leave) requestAnimationFrame(step); else { hide(); playing = false; }
    };
    requestAnimationFrame(step);
  };
  // ---------------------------------------------------------------- the lake monster (an original, not anyone's trademark)
  const mon = document.createElementNS(NS, 'g');
  mon.innerHTML = `
    <clipPath id="above-water"><rect class="waterclip" x="-2000" y="-4000" width="8000" height="4000"/></clipPath>
    <g clip-path="url(#above-water)"><g class="monster" opacity="0">
      <g class="mbody" fill="#071319" stroke="rgba(124,211,224,.4)" stroke-width="1.2" stroke-linejoin="round">
        <polygon points="36,-30 52,-40 40,-48"/><polygon points="41,-62 58,-74 44,-80"/><polygon points="38,-94 56,-110 40,-112"/><polygon points="28,-122 44,-142 26,-140"/><polygon points="12,-146 22,-168 6,-160"/>
        <path d="M40,0 C46,-50 44,-95 30,-120 C22,-135 14,-150 0,-160 C-14,-170 -34,-172 -50,-166 L-62,-160 C-60,-154 -52,-151 -40,-150 C-30,-149 -22,-146 -18,-140 C-26,-110 -34,-60 -38,0 Z"/>
        <g class="jaw"><path d="M-18,-142 C-30,-140 -46,-142 -58,-146 L-56,-139 C-44,-133 -28,-131 -16,-134 Z"/></g>
        <g class="marm"><path d="M-26,-98 C-44,-96 -58,-90 -66,-80 L-74,-74 L-66,-75 L-70,-66 L-62,-73 L-60,-64 L-56,-77 C-48,-85 -38,-89 -24,-89 Z"/></g>
      </g>
      <circle class="meye" cx="-31" cy="-159" r="2.8" fill="#FFB060"/>
    </g></g>
    <g class="ripples" fill="none" stroke="rgba(207,230,242,.55)" stroke-width="1.2"><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/></g>`;
  svg.append(mon);
  const monster = mon.querySelector('.monster'), jaw = mon.querySelector('.jaw'), marm = mon.querySelector('.marm'), meye = mon.querySelector('.meye');
  const ripples = [...mon.querySelectorAll('.ripples ellipse')], waterclip = mon.querySelector('.waterclip');
  const stack = document.querySelector('.hero-stack');
  const playMonster = (done) => {
    size(); waterclip.setAttribute('height', String(4000 + horizon + 1));
    const o = orbitEl.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const signTop = o.top - h.top + o.height * 0.22, cx = o.left - h.left + o.width / 2;
    const ms = Math.max(0.6, (horizon - signTop) * (W < 700 ? 1.5 : 1.35) / 170);
    const mx = cx + o.width * (W < 700 ? 0.24 : 0.34);
    const T = { rise: 2200, roar: 1000, lean: 700, sink: 1600 };
    const t0 = performance.now(); let knocked = false;
    monster.setAttribute('opacity', 1);
    const step = (now) => {
      const k = now - t0;
      const rise = Math.min(1, k / T.rise), sinkK = k - (T.rise + T.roar + T.lean + 600), sink = sinkK > 0 ? Math.min(1, sinkK / T.sink) : 0;
      const y = horizon + 170 * ms * (1 - ease(rise)) + 175 * ms * ease(sink);
      let lean = 0, jawA = 0, arm = 0;
      const roarK = k - T.rise;
      if (roarK > 0 && roarK < T.roar) { jawA = Math.sin(Math.min(1, roarK / 250) * Math.PI / 2) * 22; if (!stack.classList.contains('quake')) stack.classList.add('quake'); }
      if (roarK >= T.roar) { stack.classList.remove('quake'); jawA = Math.max(0, 22 - (roarK - T.roar) / 20); }
      const leanK = k - T.rise - T.roar;
      if (leanK > 0) { const l = Math.min(1, leanK / T.lean); lean = -14 * ease(l) * (1 - ease(sink)); arm = -70 * ease(l); if (l > 0.55 && !knocked) { knocked = true; topple(); } }
      monster.setAttribute('transform', `translate(${mx.toFixed(1)},${y.toFixed(1)}) scale(${ms.toFixed(3)}) rotate(${lean.toFixed(1)})`);
      jaw.setAttribute('transform', `rotate(${(-jawA).toFixed(1)} -16 -140)`);
      marm.setAttribute('transform', `rotate(${arm.toFixed(1)} -26 -94)`);
      meye.setAttribute('opacity', (0.6 + 0.4 * Math.sin(k / 90)).toFixed(2));
      meye.style.filter = 'drop-shadow(0 0 4px #FF8A3D)';
      // rings on the water while it moves
      ripples.forEach((r, i) => { const ph = ((k / 900) + i * 0.5) % 1, on = (rise < 1 || sink > 0) ? 1 : 0.3;
        r.setAttribute('cx', mx); r.setAttribute('cy', horizon + 2); r.setAttribute('rx', (40 + 90 * ph) * ms); r.setAttribute('ry', (4 + 8 * ph) * ms); r.setAttribute('opacity', ((1 - ph) * on).toFixed(2)); });
      if (sink < 1) requestAnimationFrame(step); else { monster.setAttribute('opacity', 0); ripples.forEach((r) => r.setAttribute('opacity', 0)); setTimeout(restore, 900); setTimeout(done, 2600); }
    };
    requestAnimationFrame(step);
  };
  const topple = () => { if (!orbitEl) return; orbitEl.classList.add('toppled'); };
  const restore = () => { if (!orbitEl) return; orbitEl.classList.remove('toppled'); disturb(); };

  // ---------------------------------------------------------------- Bigfoot, the 1967 stroll
  const bf = document.createElementNS(NS, 'g');
  bf.innerHTML = `<g class="bigfoot" opacity="0" fill="#05070B">
      <g class="side">
        <g class="bleg b1"><rect x="-1.8" y="0" width="3.6" height="9.5" rx="1.6"/></g>
        <path d="M-5,-30 C-9,-24 -8,-13 -5,-8 L5,-8 C8,-14 8,-24 4,-31 Z"/>
        <path d="M-1,-39 C-5,-39 -6,-34 -4,-30 L4,-30 C6,-34 5,-39 1,-40 Z"/>
        <g class="barm r1"><rect x="-1.3" y="0" width="2.6" height="15" rx="1.3"/></g>
        <g class="bleg b2"><rect x="-1.8" y="0" width="3.6" height="9.5" rx="1.6"/></g>
      </g>
      <g class="front" opacity="0">
        <path d="M-7,-30 C-9,-20 -7,-12 -5,-8 L5,-8 C7,-12 9,-20 7,-30 C4,-32 -4,-32 -7,-30 Z"/>
        <ellipse cx="0" cy="-34.5" rx="4.2" ry="4.6"/>
        <rect x="-9.6" y="-29" width="2.8" height="16" rx="1.4"/><rect x="6.8" y="-29" width="2.8" height="16" rx="1.4"/>
        <rect x="-4.6" y="-9" width="3.6" height="9.5" rx="1.6"/><rect x="1" y="-9" width="3.6" height="9.5" rx="1.6"/>
        <circle class="eyes" cx="-1.6" cy="-35" r=".7" fill="#FFB060"/><circle class="eyes" cx="1.6" cy="-35" r=".7" fill="#FFB060"/>
      </g></g>`;
  svg.append(bf);
  const big = bf.querySelector('.bigfoot'), side = bf.querySelector('.side'), front = bf.querySelector('.front');
  const bl = { b1: bf.querySelector('.b1'), b2: bf.querySelector('.b2'), r1: bf.querySelector('.r1') };
  const playBigfoot = (done) => {
    size();
    const stopX = W * (W < 700 ? 0.15 : 0.22), bs = 1.25;
    const T = { walk1: 4200, look: 1700, walk2: 5200 };
    const t0 = performance.now();
    big.setAttribute('opacity', 1);
    const step = (now) => {
      const k = now - t0; let x, walking = true;
      if (k < T.walk1) x = lerp(-30, stopX, k / T.walk1);
      else if (k < T.walk1 + T.look) { x = stopX; walking = false; }
      else x = lerp(stopX, W + 40, Math.min(1, (k - T.walk1 - T.look) / T.walk2));
      const lookK = k - T.walk1, looking = lookK > 250 && lookK < T.look - 250;
      side.setAttribute('opacity', looking ? 0 : 1); front.setAttribute('opacity', looking ? 1 : 0);
      const st = walking ? Math.sin(k / 170) : 0;
      bl.b1.setAttribute('transform', `translate(-1,-9) rotate(${st * 26})`);
      bl.b2.setAttribute('transform', `translate(1,-9) rotate(${-st * 26})`);
      bl.r1.setAttribute('transform', `translate(1,-28) rotate(${-st * 32 - 6})`);
      big.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - Math.abs(st) * 0.5).toFixed(1)}) scale(${(bs * scale).toFixed(3)})`);
      if (k < T.walk1 + T.look + T.walk2) requestAnimationFrame(step); else { big.setAttribute('opacity', 0); done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the show: the saucer first, then the monster, then whatever you tap for
  let busy = false;
  const run = (fn) => { if (busy) return; busy = true; fn(() => { busy = false; }); };
  const ufoAct = (done) => { play(); const wait = () => (playing ? setTimeout(wait, 300) : done()); setTimeout(wait, 300); };
  const ACTS = [playMonster, playBigfoot, ufoAct];
  let next = 0;
  const session = (k) => { try { if (sessionStorage.getItem(k) === '1') return false; sessionStorage.setItem(k, '1'); } catch (e) {} return true; };
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  const when = (ms, fn) => setTimeout(function go() { if (!heroVisible() || busy) { setTimeout(go, 2000); return; } fn(); }, ms);
  if (session('ufo')) when(600, () => run(ufoAct));
  if (session('monster')) when(25000, () => { next = 1; run(playMonster); });
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', () => { if (busy) return; const act = ACTS[next]; next = (next + 1) % ACTS.length; run(act); }); }
  window.__acts = { ufo: () => run(ufoAct), monster: () => run(playMonster), bigfoot: () => run(playBigfoot) };
})();
