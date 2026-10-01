// Easter eggs in the hero, in 1950s B-movie style: a saucer beams up a walker (on load), a comet sinks a cruise ship
// (once, later; a lifeboat rows away), Bigfoot strolls the shore. Tap the sign to cycle through them.
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
  const stack = document.querySelector('.hero-stack');
  // ---------------------------------------------------------------- a cruise ship, a comet, and a lifeboat (everyone's fine)
  const sea = document.createElementNS(NS, 'g');
  const portholes = (y, x0, x1, step) => { let o = ''; for (let x = x0; x <= x1; x += step) o += `<rect class="pw" x="${x}" y="${y}" width="2.2" height="1.6" rx=".5"/>`; return o; };
  sea.innerHTML = `
    <defs>
      <linearGradient id="comet-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C8321E" stop-opacity="0"/><stop offset=".45" stop-color="#FF5A1F" stop-opacity=".55"/><stop offset=".8" stop-color="#FFB040" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4C8"/></linearGradient><radialGradient id="comet-glow"><stop offset="0" stop-color="#FFF6D0"/><stop offset=".35" stop-color="#FFB040" stop-opacity=".85"/><stop offset="1" stop-color="#FF4A1A" stop-opacity="0"/></radialGradient>
      <radialGradient id="flash"><stop offset="0" stop-color="#FFF6E0"/><stop offset=".4" stop-color="#FFC27A" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></radialGradient>
    </defs>
    <clipPath id="sea-clip"><rect class="seaclip" x="-2000" y="-4000" width="8000" height="4000"/></clipPath>
    <g class="liner-refl" opacity="0"></g>
    <g clip-path="url(#sea-clip)"><g class="liner" opacity="0">
      <path fill="#05080D" d="M-60,-2 L-52,8 L52,8 L64,-6 L58,-6 L-60,-6 Z"/>
      <path fill="#0A1018" d="M-48,-6 L-48,-14 L40,-14 L46,-6 Z M-38,-14 L-38,-21 L28,-21 L32,-14 Z M-26,-21 L-26,-27 L14,-27 L16,-21 Z"/>
      <path fill="#0A1018" d="M-6,-27 L-4,-37 L6,-37 L8,-27 Z"/><rect x="-6" y="-37" width="12" height="2.5" fill="#B4745A"/>
      <path stroke="#0A1018" stroke-width="1" d="M30,-21 L30,-34"/><circle class="mast" cx="30" cy="-35" r="1.4" fill="#FFF3C4"/>
      <g fill="#FFD27A">${portholes(-1.5, -50, 52, 5)}${portholes(-11, -44, 38, 4.5)}${portholes(-18, -34, 26, 4.5)}${portholes(-25, -22, 12, 4.5)}</g>
    </g></g>
    <g class="splash" opacity="0" fill="none" stroke="#E8F6FF" stroke-width="1.6" stroke-linecap="round"><path d="M-14,0 Q-18,-26 -26,-34"/><path d="M-4,0 Q-4,-34 -6,-46"/><path d="M8,0 Q12,-30 20,-38"/><path d="M16,0 Q26,-18 34,-20"/></g>
    <circle class="flash" r="60" fill="url(#flash)" opacity="0"/>
    <g class="comet" opacity="0"><path d="M0,-7 C-60,-7 -150,-2 -190,0 C-150,2 -60,7 0,7 Z" fill="url(#comet-tail)"/><path class="flick" d="M0,-3.5 C-40,-5 -95,-1 -120,0 C-95,1 -40,5 0,3.5 Z" fill="#FFD27A" opacity=".75"/><circle r="15" fill="url(#comet-glow)"/><circle r="4.6" fill="#FFF8E0"/></g><g class="embers"></g>
    <g class="lifeboat" opacity="0"><ellipse cx="0" cy="-5" rx="5" ry="4" fill="#FFD27A" opacity=".25"/><path d="M-8,0 L8,0 L6,3 L-6,3 Z" fill="#E0703F"/><path d="M-8,0 L8,0" stroke="#FFF3E0" stroke-width=".6"/><circle cx="-2" cy="-2.2" r="1.3" fill="#AFC3CF"/><circle cx="2.5" cy="-2.2" r="1.3" fill="#AFC3CF"/><path class="oar" stroke="#AFC3CF" stroke-width=".9" d="M0,-1 L-9,3"/><circle cx="0" cy="-5" r="1.1" fill="#FFE9A8"/><rect x="-1" y="3.5" width="2" height="5" rx="1" fill="#FFD27A" opacity=".3"/></g>
    <g class="sripples" fill="none" stroke="rgba(207,230,242,.55)" stroke-width="1.1"><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/></g>`;
  svg.append(sea);
  const liner = sea.querySelector('.liner'), comet = sea.querySelector('.comet'), flash = sea.querySelector('.flash'), splash = sea.querySelector('.splash');
  const lifeboat = sea.querySelector('.lifeboat'), oar = sea.querySelector('.oar'), seaclip = sea.querySelector('.seaclip'), refl = sea.querySelector('.liner-refl');
  const flick = sea.querySelector('.flick'), embers = sea.querySelector('.embers');
  const pws = [...sea.querySelectorAll('.pw')], mast = sea.querySelector('.mast'), sripples = [...sea.querySelectorAll('.sripples ellipse')];
  // reflections of the lit decks, as short streaks on the water
  refl.innerHTML = '<linearGradient id="refl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD27A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></linearGradient>' + [-44, -30, -16, -2, 12, 26, 40].map((x, i) => `<rect x="${x}" y="${3 + (i % 2)}" width="5" height="${5 + (i % 3) * 2}" rx="1" fill="url(#refl-g)"/>`).join('');
  const playComet = (done) => {
    size(); seaclip.setAttribute('height', String(4000 + horizon + 1));
    const phone = W < 700, dir = phone ? -1 : 1; // phones: the sign tilts up to the right, so the clear water is on the right
    const ss = Math.max(0.8, Math.min(1.8, W / 700)), hitX = W * (phone ? 0.8 : 0.28);
    const T = { sail: 5600, fall: 1500, dark: 900, sink: 2200, row: 4200 };
    const fallStart = T.sail - T.fall, hit = T.sail, sinkStart = hit + T.dark, rowStart = hit + 1400;
    const t0 = performance.now(); let boomed = false;
    liner.setAttribute('opacity', 1); refl.setAttribute('opacity', 1);
    const cx0 = phone ? W * 0.05 : W * 0.92, cy0 = Math.max(70, horizon * 0.22);
    const step = (now) => {
      const k = now - t0;
      // the liner glides in from the left and is hit just as it reaches the clear water left of the sign
      const sailT = Math.min(1, k / T.sail), x = lerp(phone ? W + 90 * ss : -90 * ss, hitX, 1 - Math.pow(1 - sailT, 1.6));
      let y = horizon - 1, tilt = 0;
      if (k > sinkStart) { const g = Math.min(1, (k - sinkStart) / T.sink), e = g * g; tilt = -22 * Math.min(1, g * 2.2); y = horizon + 48 * e; }
      liner.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(ss * dir).toFixed(3)},${ss.toFixed(3)}) rotate(${tilt.toFixed(1)} 40 6)`);
      refl.setAttribute('transform', `translate(${x.toFixed(1)},${horizon.toFixed(1)}) scale(${ss.toFixed(3)})`);
      // lights: steady, then they sputter and die after the hit
      const lit = k < hit ? 1 : k < sinkStart ? (Math.random() > (k - hit) / T.dark ? 1 : 0.15) : 0.08;
      pws.forEach((p, i) => p.setAttribute('opacity', (lit * (k < hit ? (0.75 + 0.25 * ((i * 7) % 3 === 0 ? Math.sin(k / 400 + i) : 1)) : 1)).toFixed(2)));
      mast.setAttribute('opacity', lit > 0.5 ? (0.5 + 0.5 * Math.sin(k / 160) > 0 ? 1 : 0.3) : 0.1);
      refl.setAttribute('opacity', (k < hit ? 1 : Math.max(0, 1 - (k - hit) / T.dark)).toFixed(2));
      // the comet
      if (k > fallStart && k < hit + 60) {
        const f = Math.min(1, (k - fallStart) / T.fall), e = f * f;
        const hx = lerp(cx0, x, e), hy = lerp(cy0, horizon - 8 * ss, e), ang = Math.atan2(horizon - 8 * ss - cy0, x - cx0) * 180 / Math.PI;
        comet.setAttribute('opacity', 1);
        comet.setAttribute('transform', `translate(${hx.toFixed(1)},${hy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${(ss * (0.6 + 0.6 * e)).toFixed(3)})`);
        flick.setAttribute('opacity', (0.5 + 0.4 * Math.random()).toFixed(2));
        if (Math.random() < 0.6) { const em = document.createElementNS(NS, 'circle'); em.setAttribute('cx', (hx + (Math.random() - 0.5) * 6).toFixed(1)); em.setAttribute('cy', (hy + (Math.random() - 0.5) * 6).toFixed(1));
          em.setAttribute('r', (0.8 + Math.random() * 1.6) * ss); em.setAttribute('fill', Math.random() < 0.5 ? '#FFB040' : '#FF5A1F'); embers.append(em);
          const born = now; (function fade(t2) { const a = 1 - (t2 - born) / 700; if (a <= 0) { em.remove(); return; } em.setAttribute('opacity', a.toFixed(2)); em.setAttribute('cy', (+em.getAttribute('cy') + 0.25).toFixed(1)); requestAnimationFrame(fade); })(now); }
      } else comet.setAttribute('opacity', 0);
      // impact
      if (k >= hit && !boomed) { boomed = true; disturb(); stack.classList.add('quake'); setTimeout(() => stack.classList.remove('quake'), 380); }
      if (k > hit && k < hit + 900) {
        const b = (k - hit) / 900;
        flash.setAttribute('opacity', (1 - b).toFixed(2)); flash.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - 6).toFixed(1)}) scale(${(ss * (0.5 + b * 1.4)).toFixed(3)})`);
        splash.setAttribute('opacity', (1 - b).toFixed(2)); splash.setAttribute('transform', `translate(${x.toFixed(1)},${horizon.toFixed(1)}) scale(${(ss * (0.6 + b * 0.8)).toFixed(3)})`);
      } else { flash.setAttribute('opacity', 0); splash.setAttribute('opacity', 0); }
      // rings where it went down
      sripples.forEach((r, i) => { if (k <= hit) { r.setAttribute('opacity', 0); return; } const on = 1, ph = ((k - hit) / 1300 + i * 0.33) % 1;
        r.setAttribute('cx', x); r.setAttribute('cy', horizon + 2); r.setAttribute('rx', ((30 + 80 * ph) * ss).toFixed(1)); r.setAttribute('ry', ((3 + 7 * ph) * ss).toFixed(1));
        r.setAttribute('opacity', (on * (1 - ph) * Math.max(0, 1 - (k - sinkStart - T.sink) / 2500)).toFixed(2)); });
      // and a lifeboat rows away, lantern lit
      if (k > rowStart) {
        const r = Math.min(1, (k - rowStart) / T.row);
        lifeboat.setAttribute('opacity', (r < 0.1 ? r * 10 : r > 0.85 ? (1 - r) / 0.15 : 1).toFixed(2));
        lifeboat.setAttribute('transform', `translate(${lerp(x + 20 * ss * dir, x + 120 * ss * dir * -1 * (phone ? -1 : 1), r).toFixed(1)},${(horizon + 3).toFixed(1)}) scale(${(ss * 1.2 * dir).toFixed(3)},${(ss * 1.2).toFixed(3)})`);
        oar.setAttribute('transform', `rotate(${(Math.sin(k / 260) * 22).toFixed(1)})`);
      }
      if (k < rowStart + T.row) requestAnimationFrame(step);
      else { liner.setAttribute('opacity', 0); refl.setAttribute('opacity', 0); lifeboat.setAttribute('opacity', 0); done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- Bigfoot: shaggy, hunched, caught on film
  // shag(): walk a polygon, add fur tufts along every edge
  const shag = (pts, step = 2.2, amp = 1.5) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / step)), nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
      for (let k = 0; k < n; k++) { const t = k / n, j = k % 2 ? amp * (0.6 + ((i * 7 + k * 3) % 5) / 8) : 0;
        out.push(`${(x1 + (x2 - x1) * t + nx * j).toFixed(1)},${(y1 + (y2 - y1) * t + ny * j).toFixed(1)}`); }
    }
    return 'M' + out.join(' L') + 'Z';
  };
  const FUR = '#2A1B12', TIP = '#5A3E2A';
  const fur = (pts, cls = '', amp) => `<path class="${cls}" d="${shag(pts, 2.2, amp)}" fill="${FUR}" stroke="${TIP}" stroke-width=".7" stroke-linejoin="round"/>`;
  const bf = document.createElementNS(NS, 'g');
  bf.innerHTML = `<g class="bfprints"></g>
    <g class="bigfoot" opacity="0">
      <g class="side">
        <g class="bleg b1">${fur([[-3, 0], [3, 0], [3.4, 10], [5.5, 11.5], [-3, 11.5]], '', 1)}</g>
        ${fur([[-6, -10], [-9, -22], [-7, -33], [-2, -37], [3, -36], [7, -31], [8, -22], [6, -12], [3, -8], [-3, -8]], 'torso', 1.8)}
        ${fur([[-2, -36], [-2, -43], [2, -46], [6, -44], [7.5, -39], [5, -36]], 'head', 1.4)}
        <path d="M6.2,-41 L8,-40.4 L6.6,-39.6Z" fill="${TIP}"/>
        <g class="barm r1">${fur([[-2.2, 0], [2.2, 0], [2.6, 20], [4, 23], [-1, 23], [-2.6, 20]], '', 1.2)}</g>
        <g class="bleg b2">${fur([[-3, 0], [3, 0], [3.4, 10], [5.5, 11.5], [-3, 11.5]], '', 1)}</g>
      </g>
      <g class="front" opacity="0">
        ${fur([[-9, -10], [-11, -24], [-8, -33], [8, -33], [11, -24], [9, -10], [4, -8], [-4, -8]], '', 1.8)}
        ${fur([[-5, -33], [-5.5, -42], [0, -46], [5.5, -42], [5, -33]], '', 1.4)}
        ${fur([[-12, -31], [-9, -31], [-9, -9], [-13, -8]], '', 1.2)}${fur([[9, -31], [12, -31], [13, -8], [9, -9]], '', 1.2)}
        ${fur([[-6, -10], [-1, -10], [-1, 3], [-7, 3]], '', 1)}${fur([[1, -10], [6, -10], [7, 3], [1, 3]], '', 1)}
        <circle class="eyes" cx="-2" cy="-39.5" r=".9" fill="#FFB060"/><circle class="eyes" cx="2" cy="-39.5" r=".9" fill="#FFB060"/>
      </g>
    </g>
    <filter id="bf-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2 1"/></filter>
    <rect class="bfflash" x="-4000" y="-4000" width="9000" height="9000" fill="#FFFDF4" opacity="0"/>
    <g class="polaroid" opacity="0">
      <rect x="-40" y="-74" width="80" height="74" fill="#FFD9A0" opacity=".14"/>
      <path fill-rule="evenodd" d="M-46,-80 H46 V24 H-46 Z M-40,-74 V0 H40 V-74 Z" fill="#F4EFE4" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>
      <text x="0" y="15" text-anchor="middle" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="9" fill="#2A2420" letter-spacing=".5">IS THAT HIM?</text>
    </g>`;
  svg.append(bf);
  const big = bf.querySelector('.bigfoot'), side = bf.querySelector('.side'), front = bf.querySelector('.front');
  const bl = { b1: bf.querySelector('.b1'), b2: bf.querySelector('.b2'), r1: bf.querySelector('.r1') };
  const prints = bf.querySelector('.bfprints'), bfflash = bf.querySelector('.bfflash'), polaroid = bf.querySelector('.polaroid');
  const playBigfoot = (done) => {
    size();
    const stopX = W * (W < 700 ? 0.17 : 0.22), bs = W < 700 ? 1.05 : 1.25;
    const T = { walk1: 4400, look: 2600, walk2: 5200 };
    const t0 = performance.now(); let lastStep = 0, snapped = false;
    big.setAttribute('opacity', 1);
    const step = (now) => {
      const k = now - t0; let x, walking = true;
      if (k < T.walk1) x = lerp(-40, stopX, k / T.walk1);
      else if (k < T.walk1 + T.look) { x = stopX; walking = false; }
      else x = lerp(stopX, W + 50, Math.min(1, (k - T.walk1 - T.look) / T.walk2));
      const lookK = k - T.walk1, looking = lookK > 250 && lookK < T.look - 300;
      side.setAttribute('opacity', looking ? 0 : 1); front.setAttribute('opacity', looking ? 1 : 0);
      const st = walking ? Math.sin(k / 190) : 0, sc = bs * scale;
      bl.b1.setAttribute('transform', `translate(-2,-10) rotate(${st * 24})`);
      bl.b2.setAttribute('transform', `translate(2,-10) rotate(${-st * 24})`);
      bl.r1.setAttribute('transform', `translate(1,-31) rotate(${-st * 30 - 4})`);
      big.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - 2 - Math.abs(st) * 0.8).toFixed(1)}) scale(${sc.toFixed(3)})`);
      // footprints in the sand, fading behind him
      if (walking && Math.abs(st) > 0.97 && now - lastStep > 260) { lastStep = now;
        const fp = document.createElementNS(NS, 'ellipse'); fp.setAttribute('cx', (x + (st > 0 ? 3 : -2) * sc).toFixed(1)); fp.setAttribute('cy', (horizon + 3).toFixed(1));
        fp.setAttribute('rx', (3.2 * sc).toFixed(1)); fp.setAttribute('ry', (0.9 * sc).toFixed(1)); fp.setAttribute('fill', 'rgba(0,0,0,.45)'); prints.append(fp);
        const born = now; (function fade(t2) { const a = 1 - (t2 - born) / 3200; if (a <= 0) { fp.remove(); return; } fp.setAttribute('opacity', a.toFixed(2)); requestAnimationFrame(fade); })(now); }
      // he turns, the flash goes off, and the evidence develops
      if (looking && !snapped && lookK > 700) { snapped = true;
        polaroid.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - 4).toFixed(1)}) scale(${(sc * 0.95).toFixed(3)}) rotate(-6)`);
        big.setAttribute('filter', 'url(#bf-blur)'); // nobody ever gets a clear picture
        setTimeout(() => big.removeAttribute('filter'), 1900);
        (function shot(t2) { const f = (t2 - now) / 1900;
          bfflash.setAttribute('opacity', Math.max(0, 0.7 - f * 6).toFixed(2));
          polaroid.setAttribute('opacity', (f < 0.1 ? f * 10 : f > 0.75 ? Math.max(0, (1 - f) / 0.25) : 1).toFixed(2));
          if (f < 1) requestAnimationFrame(shot); else polaroid.setAttribute('opacity', 0); })(now); }
      if (k < T.walk1 + T.look + T.walk2) requestAnimationFrame(step); else { big.setAttribute('opacity', 0); done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the show: the saucer first, then the monster, then whatever you tap for
  let busy = false;
  const run = (fn) => { if (busy) return; busy = true; fn(() => { busy = false; }); };
  const ufoAct = (done) => { play(); const wait = () => (playing ? setTimeout(wait, 300) : done()); setTimeout(wait, 300); };
  const ACTS = [playComet, playBigfoot, ufoAct];
  let next = 0;
  const session = (k) => { try { if (sessionStorage.getItem(k) === '1') return false; sessionStorage.setItem(k, '1'); } catch (e) {} return true; };
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  const when = (ms, fn) => setTimeout(function go() { if (!heroVisible() || busy) { setTimeout(go, 2000); return; } fn(); }, ms);
  const first = Math.floor(Math.random() * ACTS.length); next = (first + 1) % ACTS.length;
  when(600, () => run(ACTS[first])); // a random act opens the show on every load
  if (ACTS[first] !== playComet && session('comet')) when(25000, () => run(playComet));
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', () => { if (busy) return; const act = ACTS[next]; next = (next + 1) % ACTS.length; run(act); }); }
  window.__acts = { ufo: () => run(ufoAct), comet: () => run(playComet), ship: () => run(playComet), bigfoot: () => run(playBigfoot) };
})();
