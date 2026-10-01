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
      <linearGradient id="comet-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9FE8FF" stop-opacity="0"/><stop offset=".85" stop-color="#E8FBFF" stop-opacity=".75"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
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
    <g class="comet" opacity="0"><rect x="-150" y="-1.6" width="150" height="3.2" rx="1.6" fill="url(#comet-tail)"/><circle r="4.2" fill="#FFFFFF"/><circle r="9" fill="#BFF4FF" opacity=".35"/></g>
    <g class="lifeboat" opacity="0"><ellipse cx="0" cy="-5" rx="5" ry="4" fill="#FFD27A" opacity=".25"/><path d="M-8,0 L8,0 L6,3 L-6,3 Z" fill="#E0703F"/><path d="M-8,0 L8,0" stroke="#FFF3E0" stroke-width=".6"/><circle cx="-2" cy="-2.2" r="1.3" fill="#AFC3CF"/><circle cx="2.5" cy="-2.2" r="1.3" fill="#AFC3CF"/><path class="oar" stroke="#AFC3CF" stroke-width=".9" d="M0,-1 L-9,3"/><circle cx="0" cy="-5" r="1.1" fill="#FFE9A8"/><rect x="-1" y="3.5" width="2" height="5" rx="1" fill="#FFD27A" opacity=".3"/></g>
    <g class="sripples" fill="none" stroke="rgba(207,230,242,.55)" stroke-width="1.1"><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/></g>`;
  svg.append(sea);
  const liner = sea.querySelector('.liner'), comet = sea.querySelector('.comet'), flash = sea.querySelector('.flash'), splash = sea.querySelector('.splash');
  const lifeboat = sea.querySelector('.lifeboat'), oar = sea.querySelector('.oar'), seaclip = sea.querySelector('.seaclip'), refl = sea.querySelector('.liner-refl');
  const pws = [...sea.querySelectorAll('.pw')], mast = sea.querySelector('.mast'), sripples = [...sea.querySelectorAll('.sripples ellipse')];
  // reflections of the lit decks, as short streaks on the water
  refl.innerHTML = '<linearGradient id="refl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD27A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></linearGradient>' + [-44, -30, -16, -2, 12, 26, 40].map((x, i) => `<rect x="${x}" y="${3 + (i % 2)}" width="5" height="${5 + (i % 3) * 2}" rx="1" fill="url(#refl-g)"/>`).join('');
  const playComet = (done) => {
    size(); seaclip.setAttribute('height', String(4000 + horizon + 1));
    const phone = W < 700, dir = phone ? -1 : 1; // phones: the sign tilts up to the right, so the clear water is on the right
    const ss = Math.max(0.8, Math.min(1.8, W / 700)), hitX = W * (phone ? 0.8 : 0.28);
    const T = { sail: 5200, fall: 900, dark: 900, sink: 2200, row: 4200 };
    const fallStart = T.sail - T.fall, hit = T.sail, sinkStart = hit + T.dark, rowStart = hit + 1400;
    const t0 = performance.now(); let boomed = false;
    liner.setAttribute('opacity', 1); refl.setAttribute('opacity', 1);
    const cx0 = phone ? W * 0.02 : W * 0.98, cy0 = horizon - 260 * ss;
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
        const hx = lerp(cx0, x, e), hy = lerp(cy0, horizon - 8 * ss, e), ang = Math.atan2(horizon - cy0, x - cx0) * 180 / Math.PI;
        comet.setAttribute('opacity', 1);
        comet.setAttribute('transform', `translate(${hx.toFixed(1)},${hy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${(ss * (0.6 + 0.6 * e)).toFixed(3)})`);
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
  const ACTS = [playComet, playBigfoot, ufoAct];
  let next = 0;
  const session = (k) => { try { if (sessionStorage.getItem(k) === '1') return false; sessionStorage.setItem(k, '1'); } catch (e) {} return true; };
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  const when = (ms, fn) => setTimeout(function go() { if (!heroVisible() || busy) { setTimeout(go, 2000); return; } fn(); }, ms);
  if (session('ufo')) when(600, () => run(ufoAct));
  if (session('comet')) when(25000, () => { next = 1; run(playComet); });
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', () => { if (busy) return; const act = ACTS[next]; next = (next + 1) % ACTS.length; run(act); }); }
  window.__acts = { ufo: () => run(ufoAct), comet: () => run(playComet), ship: () => run(playComet), bigfoot: () => run(playBigfoot) };
})();
