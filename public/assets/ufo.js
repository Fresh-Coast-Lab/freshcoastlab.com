// A small Easter egg in the hero: a walker on the far shore gets beamed up by a 1950s saucer.
// Plays once per visit, a few seconds after the sign lights. Tap the sign to see it again.
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
  // once per visit, after the sign has lit and flickered on
  let seen = false; try { seen = sessionStorage.getItem('ufo') === '1'; } catch (e) {}
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  if (!seen) setTimeout(function go() { if (!heroVisible()) { setTimeout(go, 3000); return; } try { sessionStorage.setItem('ufo', '1'); } catch (e) {} play(); }, 600);
  // tap the sign to see it again
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', play); }
})();
