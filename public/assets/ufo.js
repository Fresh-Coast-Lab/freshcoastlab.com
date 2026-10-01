// Easter eggs in the hero, in 1950s B-movie style: a saucer beams up a walker, a little lake monster meets a comet, a cruise ship
// slips into the Lake Michigan Triangle, Bigfoot strolls the shore, the Michigan Dogman howls. Tap the sign to cycle through them.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const HZ = 0.36; // the lake horizon in the hero shader, as a fraction of height from the bottom
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ufo-layer'); svg.setAttribute('aria-hidden', 'true');
  // the abductee: a 1950s everyman in a fedora, jointed at the shoulders, elbows, hips and knees, with a faint rim of moonlight
  const RIM = 'stroke="#8FB3C8" stroke-opacity=".38" stroke-width=".6"';
  const limb = (cls, w1, l1, w2, l2, end) => `<g class="${cls}"><rect x="${-w1 / 2}" y="-1" width="${w1}" height="${l1 + 1}" rx="${w1 / 2}"/><g class="j"><rect x="${-w2 / 2}" y="-.6" width="${w2}" height="${l2}" rx="${w2 / 2}"/>${end}</g></g>`;
  const HAND = '<circle cx="0" cy="9" r="1.5"/>', SHOE = '<path d="M-1.8,10.2 h4.4 a1.3,1.3 0 0 1 0,2.4 h-4.4 z"/>';
  const FEDORA = `<ellipse cx=".8" cy="-49.4" rx="5.8" ry="1.1" ${RIM}/><path d="M-2.4,-49.6 L-2,-53.2 Q.8,-54.8 3.6,-53.2 L4,-49.6 Z" ${RIM}/><rect x="-2.3" y="-50.9" width="6.2" height="1" fill="#3A4652"/>`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="ufo-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#CFFFEF" stop-opacity=".85"/><stop offset=".6" stop-color="#3DF2B0" stop-opacity=".35"/><stop offset="1" stop-color="#3DF2B0" stop-opacity=".08"/>
      </linearGradient>
      <radialGradient id="ufo-dome" cx=".4" cy=".35"><stop offset="0" stop-color="#E8FBFF" stop-opacity=".95"/><stop offset="1" stop-color="#7CD3E0" stop-opacity=".35"/></radialGradient>
    </defs>
    <g class="beam" opacity="0"><polygon points="-12,0 12,0 44,100 -44,100" fill="url(#ufo-beam)"/><ellipse cx="0" cy="100" rx="44" ry="5" fill="#3DF2B0" opacity=".25"/></g>
    <g class="man">
      <g class="body" fill="#05070B" style="filter:drop-shadow(0 0 .9px rgba(160,200,222,.75))">
        ${limb('arm a2', 3.4, 9.5, 3, 9, HAND)}${limb('leg l2', 4.4, 12, 3.7, 11.4, SHOE)}
        <path d="M-5.8,-39 Q-6.6,-41.2 -3.8,-41.8 L4,-41.8 Q6.8,-41.2 6,-39 L5,-21.2 L-4.8,-21.2 Z"/>
        <rect x="-4.5" y="-25.6" width="9.1" height="1.3" fill="#2B3A46"/>
        <rect x="-1.3" y="-44.6" width="2.6" height="3.6"/>
        <ellipse cx=".7" cy="-47" rx="3.4" ry="3.8"/>
        <g class="mhat">${FEDORA}</g>
        ${limb('leg l1', 4.4, 12, 3.7, 11.4, SHOE)}${limb('arm a1', 3.4, 9.5, 3, 9, HAND)}
      </g>
    </g>
    <g class="fhat" fill="#05070B" opacity="0"><g transform="translate(-.8,51.5)">${FEDORA}</g></g>
    <g class="ship">
      <ellipse cx="0" cy="-5" rx="9" ry="7" fill="url(#ufo-dome)"/>
      <ellipse cx="0" cy="0" rx="24" ry="6" fill="#8FA3B3"/>
      <ellipse cx="0" cy="-1.2" rx="24" ry="3.4" fill="#C9D6DF"/>
      <ellipse cx="0" cy="2.6" rx="13" ry="2.4" fill="#4E5E6C"/>
      <g class="lights"><circle cx="-15" cy="1.2" r="1.5"/><circle cx="-5" cy="2.6" r="1.5"/><circle cx="5" cy="2.6" r="1.5"/><circle cx="15" cy="1.2" r="1.5"/></g>
    </g>`;
  hero.prepend(svg);
  const man = svg.querySelector('.man'), ship = svg.querySelector('.ship'), beam = svg.querySelector('.beam');
  const limbs = ['a1', 'a2', 'l1', 'l2'].reduce((o, c) => { const g = svg.querySelector('.' + c); o[c] = { g, j: g.querySelector('.j'), arm: c[0] === 'a' }; return o; }, {});
  const pose = (c, a, b) => { const L = limbs[c]; L.g.setAttribute('transform', `translate(0,${L.arm ? -39.5 : -23.4}) rotate(${a.toFixed(1)})`); L.j.setAttribute('transform', `translate(0,${L.arm ? 9 : 11}) rotate(${b.toFixed(1)})`); };
  const mhat = svg.querySelector('.mhat'), fhat = svg.querySelector('.fhat');
  const lights = [...svg.querySelectorAll('.lights circle')];
  let W = 0, H = 0, horizon = 0, scale = 1;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); scale = Math.max(1.1, Math.min(1.5, W / 800)); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size);
  const place = (el, x, y, s = 1, extra = '') => el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(s * scale).toFixed(3)}) ${extra}`);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const hide = () => { man.style.opacity = 0; ship.style.opacity = 0; beam.setAttribute('opacity', 0); fhat.setAttribute('opacity', 0); };
  hide();
  let playing = false;
  let curAbort = null; // the running act's clean-up, for window.__acts.abort() (the tornado)
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
    const phone = W < 700, stopX = W * (phone ? 0.2 : 0.3), startX = -30;
    const hs = (phone ? 1.05 : 1.25) * 0.85 * 57 / 51, manH = 51 * hs * scale; // about 85% of Bigfoot's height
    const SS = 2.2, shipY = horizon - manH - 72 * scale; // a big saucer, hovering high enough for a long beam
    const T = { walk: 5200, arrive: 1800, beam: 700, lift: 2200, off: 400, leave: 1100 };
    const legPx = 23.4 * hs * scale, cycles = Math.max(2, (stopX - startX) / (4 * legPx * Math.sin(0.42)));
    const t0 = performance.now(); let hit = false; const sX = orbitEl ? signX() : -1e9;
    let hatT = null, hx = 0, hy = 0, sunk = null, aborted = false, hatLand = null;
    const iceAtStart = !!(window.__iceSolid && window.__iceSolid());
    curAbort = () => { aborted = true; hide(); playing = false; curAbort = null; };
    man.style.opacity = 1; ship.style.opacity = 1; mhat.setAttribute('opacity', 1); fhat.setAttribute('opacity', 0);
    const step = (now) => {
      if (aborted) return;
      const t = now - t0; let k = t;
      // 1. he walks in along the far shore: arms swinging against the legs, knees bending on the swing
      const walkT = Math.min(1, k / T.walk), mx = sunk ? sunk.x : lerp(startX, stopX, walkT), ph = walkT * cycles * Math.PI * 2, walking = walkT < 1 && !sunk;
      // the ice gives way under him mid-walk: in he goes, his fedora floats, and the saucer fishes him out anyway
      if (!sunk && walking && iceAtStart && k > 300 && window.__iceThawed && window.__iceThawed() && window.__iceFall) {
        sunk = { x: mx, h: window.__iceFall({ el: man, x: mx, y: horizon, s: hs * scale, w: 11 * hs * scale, kind: 'man', dir: 1, hold: Math.max(3400, T.walk - k + T.arrive + T.beam + T.lift + 900) }) };
        mhat.setAttribute('opacity', 0); }
      ['l1', 'l2'].forEach((c, i) => { const p = ph + i * Math.PI;
        pose(c, walking ? 24 * Math.sin(p) : 0, walking ? 5 + 34 * Math.max(0, -Math.cos(p)) : 3);
        pose(i ? 'a2' : 'a1', walking ? -19 * Math.sin(p) : 4, walking ? -8 - 14 * Math.max(0, Math.sin(p)) : -6); });
      let my = horizon - (walking ? Math.abs(Math.cos(ph)) * 0.9 * hs : 0), ms = 1, mo = 1;
      // 2. the saucer glides in from the right and slows over him, starting before he stops
      const arriveStart = T.walk - T.arrive * 0.6;
      let sx = W + 60 * SS, sy = shipY - 40 * scale;
      if (k > arriveStart) {
        const a = Math.min(1, (k - arriveStart) / T.arrive);
        sx = lerp(W + 60 * SS, sunk ? sunk.x : stopX, ease(a)); sy = lerp(shipY - 40 * scale, shipY, ease(a)) + Math.sin(t / 380) * 2;
      }
      const beamStart = arriveStart + T.arrive, liftStart = beamStart + T.beam, beamOff = liftStart + T.lift, leaveStart = beamOff + T.off;
      // 3. the beam comes down and swallows him; he looks up, arms out
      if (k > beamStart && k < beamOff + T.off) {
        const on = Math.min(1, (k - beamStart) / T.beam), off = k > beamOff ? 1 - Math.min(1, (k - beamOff) / T.off) : 1;
        beam.setAttribute('opacity', (on * off * (0.75 + 0.25 * Math.sin(t / 60))).toFixed(2));
        const len = (horizon - shipY - 6 * scale) / 100;
        beam.setAttribute('transform', `translate(${sx.toFixed(1)},${(shipY + 6 * scale).toFixed(1)}) scale(${(scale * 1.1).toFixed(3)},${len.toFixed(3)})`);
        if (k < liftStart) { const u = on; pose('a1', -70 * u, -20 * u); pose('a2', -55 * u, -25 * u); }
        /* only Bigfoot gets his picture taken */
      } else beam.setAttribute('opacity', 0);
      // 4. he floats up, flailing and kicking, shrinking into the ship; his hat doesn't come along
      if (k > liftStart) {
        const l = Math.min(1, (k - liftStart) / T.lift), e = ease(l);
        my = lerp(horizon, shipY + 10 * scale, e); ms = lerp(1, 0.3, e); mo = l > 0.85 ? 1 - (l - 0.85) / 0.15 : 1;
        const f = Math.sin(t / 90);
        pose('a1', -150 + f * 30, -30 - f * 25); pose('a2', -165 - f * 30, -20 + f * 25);
        pose('l1', Math.sin(t / 110) * 26, 20 + Math.sin(t / 110 + 1) * 18); pose('l2', -Math.sin(t / 110) * 26, 20 - Math.sin(t / 110 + 1) * 18);
        if (sunk && sunk.h && !sunk.lifted) { sunk.lifted = true; sunk.h.lift(); }
        if (hatT === null && !sunk && l > 0.06) { hatT = now; hx = mx + 0.8 * hs * scale * ms; hy = my - 49.4 * hs * scale * ms; mhat.setAttribute('opacity', 0); }
      }
      // the hat: a pop, a tumble, a splash, and it floats
      if (hatT !== null) {
        const h = (now - hatT) / 1000, land = horizon - 1, g = 110 * scale;
        let fx = hx - 16 * scale * Math.min(h, 1.8) + Math.sin(h * 5) * 4 * scale, fy = hy - 26 * scale * h + 0.5 * g * h * h, rot = -h * 300;
        if (fy >= land) {
          if (iceAtStart || (window.__wx && window.__wx.ice > 0.25)) { // ice: a clack, a few chips, a skid and a wobble to a stop
            if (hatLand === null) { hatLand = { t: now, x: fx, r: rot }; if (window.__iceChips) window.__iceChips(fx, land, 0.25 * scale); }
            const u = (now - hatLand.t) / 1000, e = 1 - Math.exp(-2.4 * u);
            fy = land; fx = hatLand.x - 34 * scale * e; rot = hatLand.r - 260 * e + Math.sin(u * 14) * 10 * Math.exp(-2 * u);
          } else { fy = land + Math.sin(now / 420) * 0.8; rot = Math.sin(now / 500) * 8; fx = hx - 16 * scale * 1.8; }
        }
        const end = leaveStart + T.leave;
        fhat.setAttribute('opacity', (k > end - 400 ? Math.max(0, (end - k) / 400) : 1).toFixed(2));
        fhat.setAttribute('transform', `translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(hs * scale).toFixed(3)})`);
      }
      // 5. and it's gone
      if (k > leaveStart) {
        const g = Math.min(1, (k - leaveStart) / T.leave), e = g * g;
        sx = lerp(sunk ? sunk.x : stopX, -80 * SS, e); sy = lerp(shipY, shipY - 160 * scale, e);
        ship.style.opacity = 1 - Math.max(0, g - 0.7) / 0.3;
      }
      if (!hit && sx < sX + 40 && sx > sX - 60) { hit = true; disturb(); }
      place(man, mx, my, ms * hs); man.style.opacity = sunk && k < liftStart ? 0 : mo;
      if (sunk && k > liftStart && k < liftStart + T.lift * 0.8 && Math.random() < 0.5 && window.__iceFall) window.__iceFall.drip(mx + (Math.random() - 0.5) * 8 * hs * scale, my - Math.random() * 30 * hs * scale * ms, hs * scale);
      place(ship, sx, sy, SS);
      lights.forEach((c, i) => c.setAttribute('fill', Math.floor(t / 140 + i) % 4 === 0 ? '#FFE9A8' : '#FF6A3D'));
      if (k < leaveStart + T.leave) requestAnimationFrame(step); else { hide(); playing = false; curAbort = null; }
    };
    requestAnimationFrame(step);
  };
  const stack = document.querySelector('.hero-stack');
  const quake = (ms) => { stack.classList.add('quake'); setTimeout(() => stack.classList.remove('quake'), ms); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---------------------------------------------------------------- the lake: a cruise ship, a comet, and whatever comes up for air
  const sea = document.createElementNS(NS, 'g');
  const portholes = (y, x0, x1, step) => { let o = ''; for (let x = x0; x <= x1; x += step) o += `<rect class="pw" x="${x}" y="${y}" width="2.2" height="1.6" rx=".5"/>`; return o; };
  const HULL = 'M-60,-2 L-52,8 L52,8 L64,-6 L58,-6 L-60,-6 Z', DECKS = 'M-48,-6 L-48,-14 L40,-14 L46,-6 Z M-38,-14 L-38,-21 L28,-21 L32,-14 Z M-26,-21 L-26,-27 L14,-27 L16,-21 Z', FUNNEL = 'M-6,-27 L-4,-37 L6,-37 L8,-27 Z';
  sea.innerHTML = `
    <defs>
      <linearGradient id="comet-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C8321E" stop-opacity="0"/><stop offset=".45" stop-color="#FF5A1F" stop-opacity=".55"/><stop offset=".8" stop-color="#FFB040" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4C8"/></linearGradient><radialGradient id="comet-glow"><stop offset="0" stop-color="#FFF6D0"/><stop offset=".35" stop-color="#FFB040" stop-opacity=".85"/><stop offset="1" stop-color="#FF4A1A" stop-opacity="0"/></radialGradient>
      <radialGradient id="flash"><stop offset="0" stop-color="#FFF6E0"/><stop offset=".4" stop-color="#FFC27A" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></radialGradient>
      <filter id="tint-aqua" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="#3DF2B0"/><feComposite in2="SourceAlpha" operator="in"/></filter>
      <filter id="tint-ember" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="#FF6A3D"/><feComposite in2="SourceAlpha" operator="in"/></filter>
      ${[[-42, -28], [-28, -19.5], [-19.5, -11], [-11, -3], [-3, 12]].map(([a, b], i) => `<clipPath id="slice-${i}"><rect x="-70" y="${a}" width="140" height="${b - a}"/></clipPath>`).join('')}
    </defs>
    <clipPath id="sea-clip"><rect class="seaclip" x="-2000" y="-4000" width="8000" height="4000"/></clipPath>
    <g class="liner-refl" opacity="0"></g>
    <g clip-path="url(#sea-clip)"><g class="liner" opacity="0"><g id="liner-art">
      <path fill="#05080D" d="${HULL}"/>
      <path fill="#0A1018" d="${DECKS}"/>
      <path fill="#0A1018" d="${FUNNEL}"/><rect x="-6" y="-37" width="12" height="2.5" fill="#B4745A"/>
      <path stroke="#0A1018" stroke-width="1" d="M30,-21 L30,-34"/><circle class="mast" cx="30" cy="-35" r="1.4" fill="#FFF3C4"/>
      <g fill="#FFD27A">${portholes(-1.5, -50, 52, 5)}${portholes(-11, -44, 38, 4.5)}${portholes(-18, -34, 26, 4.5)}${portholes(-25, -22, 12, 4.5)}</g>
    </g></g>
      <g class="lglitch" opacity="0">
        <use class="gh" href="#liner-art" filter="url(#tint-aqua)" opacity=".35"/><use class="gh" href="#liner-art" filter="url(#tint-ember)" opacity=".3"/>
        ${[0, 1, 2, 3, 4].map((i) => `<g clip-path="url(#slice-${i})"><use class="sl" href="#liner-art"/></g>`).join('')}
      </g>
    </g>
    <g class="splash" opacity="0" fill="none" stroke="#E8F6FF" stroke-width="1.6" stroke-linecap="round"><path d="M-14,0 Q-18,-26 -26,-34"/><path d="M-4,0 Q-4,-34 -6,-46"/><path d="M8,0 Q12,-30 20,-38"/><path d="M16,0 Q26,-18 34,-20"/></g>
    <circle class="flash" r="60" fill="url(#flash)" opacity="0"/>
    <g class="comet" opacity="0"><path d="M0,-7 C-60,-7 -150,-2 -190,0 C-150,2 -60,7 0,7 Z" fill="url(#comet-tail)"/><path class="flick" d="M0,-3.5 C-40,-5 -95,-1 -120,0 C-95,1 -40,5 0,3.5 Z" fill="#FFD27A" opacity=".75"/><circle r="15" fill="url(#comet-glow)"/><circle r="4.6" fill="#FFF8E0"/></g><g class="embers"></g>
    <g class="sripples" fill="none" stroke="rgba(207,230,242,.55)" stroke-width="1.1"><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/><ellipse rx="0" ry="0"/></g>`;
  svg.append(sea);
  const liner = sea.querySelector('.liner'), comet = sea.querySelector('.comet'), flash = sea.querySelector('.flash'), splash = sea.querySelector('.splash');
  const seaclip = sea.querySelector('.seaclip'), refl = sea.querySelector('.liner-refl');
  const lglitch = sea.querySelector('.lglitch'), slices = [...sea.querySelectorAll('.sl')], ghosts = [...sea.querySelectorAll('.gh')];
  const flick = sea.querySelector('.flick'), embers = sea.querySelector('.embers');
  const pws = [...sea.querySelectorAll('.pw')], mast = sea.querySelector('.mast'), sripples = [...sea.querySelectorAll('.sripples ellipse')];
  // reflections of the lit decks, as short streaks on the water
  refl.innerHTML = '<linearGradient id="refl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD27A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></linearGradient>' + [-44, -30, -16, -2, 12, 26, 40].map((x, i) => `<rect x="${x}" y="${3 + (i % 2)}" width="5" height="${5 + (i % 3) * 2}" rx="1" fill="url(#refl-g)"/>`).join('');
  // the comet trails sparks that drift down and die
  const ember = (hx, hy, now, s) => {
    const em = document.createElementNS(NS, 'circle'); em.setAttribute('cx', (hx + (Math.random() - 0.5) * 6).toFixed(1)); em.setAttribute('cy', (hy + (Math.random() - 0.5) * 6).toFixed(1));
    em.setAttribute('r', (0.8 + Math.random() * 1.6) * s); em.setAttribute('fill', Math.random() < 0.5 ? '#FFB040' : '#FF5A1F'); embers.append(em);
    const born = now; (function fade(t2) { const a = 1 - (t2 - born) / 700; if (a <= 0 || !em.isConnected) { em.remove(); return; } em.setAttribute('opacity', a.toFixed(2)); em.setAttribute('cy', (+em.getAttribute('cy') + 0.25).toFixed(1)); requestAnimationFrame(fade); })(now);
  };
  const ripples = (x, k, s, a, r0 = 30, r1 = 80) => sripples.forEach((r, i) => { const ph = (k / 1300 + i * 0.33) % 1;
    r.setAttribute('cx', x.toFixed(1)); r.setAttribute('cy', (horizon + 2).toFixed(1)); r.setAttribute('rx', ((r0 + r1 * ph) * s).toFixed(1)); r.setAttribute('ry', ((3 + 7 * ph) * s * r0 / 30).toFixed(1));
    r.setAttribute('opacity', ((1 - ph) * a).toFixed(2)); });

  // things that live behind the ship and the comet: the Triangle, its fog and flare, and a little lake monster
  const behind = document.createElementNS(NS, 'g');
  const DG = '#05070B', DGL = '#05070B', DGD = '#05070B'; // silhouette, like everyone else on the shore
  const HAT = `<rect x="-3.2" y="-7.5" width="6.4" height="7.5" rx=".5" fill="#05070B"/><rect x="-5.4" y="-.7" width="10.8" height="1.5" rx=".75" fill="#05070B"/>`;
  behind.innerHTML = `
    <defs>
      <radialGradient id="tri-flare"><stop offset="0" stop-color="#CFFFEF" stop-opacity=".7"/><stop offset=".25" stop-color="#3DF2B0" stop-opacity=".35"/><stop offset="1" stop-color="#3DF2B0" stop-opacity="0"/></radialGradient>
      <filter id="fog-blur" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="5 2.5"/></filter>
      <pattern id="static-lines" width="8" height="3" patternUnits="userSpaceOnUse"><rect width="8" height="1" fill="#CFFFEF"/></pattern>
      <radialGradient id="static-fade"><stop offset="0" stop-color="#FFF"/><stop offset=".6" stop-color="#FFF" stop-opacity=".6"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>
      <mask id="static-mask"><rect class="stmask" fill="url(#static-fade)"/></mask>
      <clipPath id="tri-clip"><polygon class="triclip" points="0,0 0,0 0,0"/></clipPath>
    </defs>
    <ellipse class="flare" rx="1" ry="1" fill="url(#tri-flare)" opacity="0"/>
    <g class="tri" opacity="0" style="filter:drop-shadow(0 0 3px rgba(61,242,176,.8))">
      <g fill="none" stroke="#3DF2B0" stroke-width="1.6" stroke-linecap="round"><path class="tside" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/><path class="tside" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/><path class="tside" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></g>
      <g class="tlabels" fill="#9CFFD6" font-family="'JetBrains Mono',monospace" letter-spacing=".8">
        <g class="tv"><circle r="2" fill="#CFFFEF"/><text>MANITOWOC</text></g><g class="tv"><circle r="2" fill="#CFFFEF"/><text>LUDINGTON</text></g><g class="tv"><circle r="2" fill="#CFFFEF"/><text>BENTON HARBOR</text></g>
      </g>
    </g>
    <g class="fog" clip-path="url(#tri-clip)" opacity="0"><g filter="url(#fog-blur)" fill="#D8F2EA">${[0, 1, 2, 3, 4].map(() => '<ellipse rx="1" ry="1" opacity=".22"/>').join('')}</g></g>
    <g clip-path="url(#sea-clip)"><g class="dino" style="filter:drop-shadow(0 0 .9px rgba(160,200,222,.75))" opacity="0">
      <path d="M-34,3 Q-27,-10 -20,3 Z" fill="${DG}" stroke="${DGD}" stroke-width=".8"/>
      <path d="M-46,3 Q-43,-4 -38,-4 Q-41,-1 -40,3 Z" fill="${DG}" stroke="${DGD}" stroke-width=".8"/>
      <path d="M-2,4 C-3,-12 -1,-25 7,-33" fill="none" stroke="${DGD}" stroke-width="8.6" stroke-linecap="round"/>
      <g class="dhd">
        <ellipse cx="11" cy="-35" rx="7.5" ry="5.2" fill="${DG}" stroke="${DGD}" stroke-width=".8"/>
        <ellipse cx="17.5" cy="-33.4" rx="3.8" ry="3" fill="${DG}" stroke="${DGD}" stroke-width=".8"/>
      </g>
      <path d="M-2,4 C-3,-12 -1,-25 7,-33" fill="none" stroke="${DG}" stroke-width="7" stroke-linecap="round"/>
      <path d="M1.6,3 C0.8,-10 2.4,-22 8.6,-29" fill="none" stroke="${DGL}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      <circle cx="-3" cy="-9" r="1.1" fill="${DGD}" opacity=".45"/><circle cx="-2.6" cy="-17" r=".9" fill="${DGD}" opacity=".45"/><circle cx="0" cy="-24" r=".8" fill="${DGD}" opacity=".45"/>
      <g class="dhd">
        <ellipse cx="11.5" cy="-35" rx="6.4" ry="4.4" fill="${DG}"/>
        <ellipse cx="17.5" cy="-33.4" rx="3.2" ry="2.4" fill="${DG}"/>
        <circle cx="20" cy="-34.6" r=".55" fill="${DGD}"/>
        
        <g class="deye"><circle cx="11.6" cy="-36.8" r="1.1" fill="#FFB347" style="filter:drop-shadow(0 0 2px #FFB347)"/></g>
        <g class="dhat" transform="translate(9.5,-39.6) rotate(-12)">${HAT}</g>
      </g>
    </g></g>`;
  svg.insertBefore(behind, sea);
  const flare = behind.querySelector('.flare'), tri = behind.querySelector('.tri'), tsides = [...behind.querySelectorAll('.tside')], tverts = [...behind.querySelectorAll('.tv')];
  const fog = behind.querySelector('.fog'), fogs = [...behind.querySelectorAll('.fog ellipse')], triclip = behind.querySelector('.triclip'), stmask = behind.querySelector('.stmask');
  const dino = behind.querySelector('.dino'), dhds = [...behind.querySelectorAll('.dhd')], deye = behind.querySelector('.deye'), dhat = behind.querySelector('.dhat');

  // things that live in front: a puff, a hat, a word bubble, a compass, and the paperwork
  const fore = document.createElementNS(NS, 'g');
  const ticks = Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, r0 = i % 4 ? 16 : 14.5; return `<line x1="${(Math.sin(a) * r0).toFixed(1)}" y1="${(-Math.cos(a) * r0).toFixed(1)}" x2="${(Math.sin(a) * 18).toFixed(1)}" y2="${(-Math.cos(a) * 18).toFixed(1)}"/>`; }).join('');
  fore.innerHTML = `
    <g class="puff" opacity="0" fill="#E9EEF2"><circle cx="0" cy="0" r="7"/><circle cx="-7" cy="3" r="5"/><circle cx="7" cy="2.5" r="5.5"/><circle cx="-3" cy="-6" r="5"/><circle cx="4.5" cy="-5.5" r="4.5"/><circle cx="0" cy="5" r="4.5"/>
      <g fill="#FFE9A8"><path d="M-16,-10 l1,2.5 2.5,1 -2.5,1 -1,2.5 -1,-2.5 -2.5,-1 2.5,-1z"/><path d="M15,-12 l.8,2 2,.8 -2,.8 -.8,2 -.8,-2 -2,-.8 2,-.8z"/><path d="M13,9 l.7,1.7 1.7,.7 -1.7,.7 -.7,1.7 -.7,-1.7 -1.7,-.7 1.7,-.7z"/></g></g>
    <g class="flyhat" opacity="0">${HAT}</g>
    <g class="chirp" opacity="0"><path d="M0,0 L3,-5 L9,-5 Z" fill="#F4EFE4"/><rect class="cb" x="0" y="-15" width="30" height="11" rx="5.5" fill="#F4EFE4"/><text x="15" y="-7.4" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-weight="700" font-size="6.5" fill="#2A2420">chirp?</text></g>
    <g class="dcard" opacity="0">
      <rect x="-88" y="-31" width="176" height="62" rx="3" fill="#F4EFE4" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>
      <rect x="-83" y="-26" width="166" height="52" rx="2" fill="none" stroke="#C8321E" stroke-width="1.4"/>
      <rect x="-80.5" y="-23.5" width="161" height="47" fill="none" stroke="#C8321E" stroke-width=".5"/>
      <text x="0" y="-11" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="6.5" letter-spacing="1.6" fill="#C8321E">&#9733; SPECIAL BULLETIN &#9733;</text>
      <text x="0" y="5" text-anchor="middle" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="10.5" fill="#2A2420" letter-spacing=".3">EXTINCTION EVENT</text>
      <text x="0" y="16.5" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="6.6" letter-spacing=".6" fill="#2A2420">THE COMET IS NOW 2 FOR 2</text>
    </g>
    <rect class="static" fill="url(#static-lines)" mask="url(#static-mask)" opacity="0"/>
    <g class="pin" opacity="0"><circle r="7" fill="#3DF2B0" opacity=".35"/><circle r="2.2" fill="#F4FFFA"/></g>
    <g class="buoy" opacity="0">
      <g class="bring">
        <ellipse class="brip" cx="0" cy=".4" rx="10" ry="2.6" fill="none" stroke="rgba(207,230,242,.55)" stroke-width=".5"/><ellipse class="brip" cx="0" cy=".4" rx="10" ry="2.6" fill="none" stroke="rgba(207,230,242,.55)" stroke-width=".5"/>
        <path d="M-7.6,0 A7.6,2.5 0 0 1 7.6,0" fill="none" stroke="#E4DED2" stroke-width="2.6"/><path d="M-7.6,0 A7.6,2.5 0 0 1 7.6,0" fill="none" stroke="#B8321F" stroke-width="2.6" pathLength="4" stroke-dasharray="1 1" stroke-dashoffset=".5"/>
      </g>
      <g class="bman" fill="#05070B" style="filter:drop-shadow(0 0 .8px rgba(160,200,222,.75))">
        <path d="M-4.6,1 Q-5,-4.6 -3.4,-6.2 Q0,-7.6 3.4,-6.2 Q5,-4.6 4.6,1Z"/><rect x="-1" y="-8.4" width="2" height="2.4"/>
        <g class="rhead"><circle cx="0" cy="-10" r="2.6"/><path class="bnose" d="M2.2,-10.6 L3.5,-9.6 L2.3,-9.1Z"/><path d="M-2.6,-11.2 Q0,-13.6 2.6,-11.2" fill="none" stroke="#1C2733" stroke-width=".5"/></g>
      </g>
      <g class="bring">
        <path d="M-7.6,0 A7.6,2.5 0 0 0 7.6,0" fill="none" stroke="#E4DED2" stroke-width="2.6"/><path d="M-7.6,0 A7.6,2.5 0 0 0 7.6,0" fill="none" stroke="#B8321F" stroke-width="2.6" pathLength="4" stroke-dasharray="1 1" stroke-dashoffset=".5"/>
        <path d="M-6.6,1.9 A7.6,2.5 0 0 0 6.6,1.9" fill="none" stroke="rgba(6,18,28,.45)" stroke-width="1"/>
      </g>
      <g fill="none" stroke="#05070B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 .8px rgba(160,200,222,.75))">
        <path d="M-3.8,-5.2 Q-6,-2.4 -6,.9"/><g class="bwave"><path d="M3.8,-5.2 Q6,-2.4 6,.9"/><circle cx="6" cy="1.3" r="1" fill="#05070B" stroke="none"/></g>
      </g>
    </g>
    <g class="compass" opacity="0">
      <circle r="23" fill="#B4745A" stroke="#6A4A36" stroke-width="1.2"/><circle r="21" fill="none" stroke="#E8C38A" stroke-width=".6"/>
      <circle r="18.5" fill="#F4EAD2"/>
      <g stroke="#6A4A36" stroke-width=".6">${ticks}</g>
      <g font-family="'JetBrains Mono',monospace" font-weight="700" font-size="5" fill="#2A2420" text-anchor="middle"><text y="-9">N</text><text x="10.5" y="1.8">E</text><text y="12.6">S</text><text x="-10.5" y="1.8">W</text></g>
      <g class="cneedle"><path d="M0,-14 L2.3,0 L-2.3,0 Z" fill="#C8321E"/><path d="M0,14 L2.3,0 L-2.3,0 Z" fill="#2A2420"/><circle r="1.6" fill="#B4745A"/></g>
      <path d="M-13,-9 A16,16 0 0 1 3,-15.5" fill="none" stroke="#FFF" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>
    </g>
    <g class="casefile" opacity="0">
      <path d="M0,-11 H74 a3,3 0 0 1 3,3 V2 H0 Z" fill="#D7B46A"/>
      <text x="7" y="-3" font-family="'JetBrains Mono',monospace" font-size="6" letter-spacing=".8" fill="#4A3820">CASE No. 77-LMT</text>
      <rect x="0" y="0" width="240" height="104" rx="3" fill="#E8CD8E" stroke="#A8884A" stroke-width=".8"/>
      <g fill="#2A2018">
        <text x="14" y="21" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="10" letter-spacing=".2">THE LAKE MICHIGAN TRIANGLE</text>
        <text x="14" y="34" font-family="'JetBrains Mono',monospace" font-style="italic" font-size="7.6" opacity=".85">Michigan&#8217;s own Bermuda Triangle</text>
        <text x="14" y="56" font-family="'JetBrains Mono',monospace" font-weight="700" font-size="8.6" letter-spacing=".6">VESSEL:</text>
        <rect x="58" y="48.6" width="30" height="9" rx="1"/><rect x="91" y="48.6" width="44" height="9" rx="1"/><rect x="138" y="48.6" width="20" height="9" rx="1"/>
        <text x="14" y="72" font-family="'JetBrains Mono',monospace" font-weight="700" font-size="8.6" letter-spacing=".6">STATUS: <tspan fill="#B02A1A">MISSING</tspan></text>
        <text x="14" y="92" font-family="'JetBrains Mono',monospace" font-size="5.6" letter-spacing=".4" opacity=".7">SEE: J. GOURLEY, THE GREAT LAKES TRIANGLE (1977)</text>
      </g>
      <g class="stamp" opacity="0"><g transform="translate(180,66) rotate(-12)">
        <rect x="-42" y="-13" width="84" height="26" rx="3" fill="rgba(200,50,30,.06)" stroke="#C8321E" stroke-width="2.2"/>
        <rect x="-39" y="-10" width="78" height="20" rx="2" fill="none" stroke="#C8321E" stroke-width=".6"/>
        <text x="0" y="3.6" text-anchor="middle" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="9.4" fill="#C8321E" letter-spacing=".6">CASE OPEN</text>
      </g></g>
    </g>`;
  svg.append(fore);
  const puff = fore.querySelector('.puff'), flyhat = fore.querySelector('.flyhat'), chirp = fore.querySelector('.chirp'), chirpTxt = chirp.querySelector('text'), chirpBox = chirp.querySelector('.cb');
  const dcard = fore.querySelector('.dcard'), compassEl = fore.querySelector('.compass'), cneedle = fore.querySelector('.cneedle');
  const casefile = fore.querySelector('.casefile'), stamp = fore.querySelector('.stamp'), staticEl = fore.querySelector('.static'), pin = fore.querySelector('.pin'), buoy = fore.querySelector('.buoy'), bman = fore.querySelector('.bman'), rhead = fore.querySelector('.rhead'), rnose = fore.querySelector('.bnose'), bwave = fore.querySelector('.bwave'), brips = [...fore.querySelectorAll('.brip')], brings = [...fore.querySelectorAll('.bring')];

  // ---------------------------------------------------------------- a little lake monster pops up to say hi. The comet has other plans.
  const playDino = (done) => {
    size(); seaclip.setAttribute('height', String(4000 + horizon + 1));
    const phone = W < 700, dir = 1; // phones: the sign covers the middle, so he surfaces in the sliver of clear water on the right
    const ss = Math.max(0.8, Math.min(1.8, W / 700)), ds = ss * (phone ? 1.35 : 1.3), x = W * (phone ? 0.84 : 0.27);
    const T = { rise: 1900, fall: 1500, hit: 6000, card: 4400 };
    const fallStart = T.hit - T.fall, cardStart = T.hit + 1300, end = cardStart + T.card + 500;
    const hx = x + 12 * ds * dir, hy = horizon - 37 * ds; // his head, which is where the comet is headed
    const cx0 = phone ? W + 30 : W * 0.93, cy0 = phone ? 40 : Math.max(70, horizon * 0.22);
    const hatX = hx + 26 * ss * dir;
    const cs = phone ? 0.95 : 1.15, cardX = clamp(x + 10 * ss * dir, 88 * cs + 12, W - 88 * cs - 12), cardY = phone ? 118 : Math.max(110, hy - 30 * ss - 50 * cs);
    const t0 = performance.now(); let boomed = false, snapped = false, aborted = false;
    // a frozen lake: he comes up through a hole in the ice, and the comet hits ice (chips, no splash, no ripples)
    const frozen = !!(window.__wx && window.__wx.ice > 0.25);
    if (frozen && window.__iceHole) window.__iceHole(x + 4 * ds, horizon, ds * 0.9, end);
    const finishD = () => { [dino, flyhat, dcard, chirp, comet, flash, splash, puff].forEach((el) => el.setAttribute('opacity', 0)); sripples.forEach((s) => s.setAttribute('opacity', 0)); };
    curAbort = () => { aborted = true; finishD(); curAbort = null; };
    dino.setAttribute('opacity', 1); dhat.setAttribute('opacity', 1);
    const step = (now) => {
      if (aborted) return;
      const k = now - t0;
      // 1. rings on the water, then a head and a long neck come up out of the lake
      const r = Math.min(1, k / T.rise), e = 1 - Math.pow(1 - r, 3), bob = Math.sin(k / 520) * 1.2 * ds * e;
      dino.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon + (1 - e) * 50 * ds + bob).toFixed(1)}) scale(${(ds * dir).toFixed(3)},${ds.toFixed(3)})`);
      // 2. he blinks, looks around, says hello; then he spots it
      const seeK = k - (fallStart - 350), seeing = seeK > 0;
      const tilt = seeing ? lerp(Math.sin((fallStart - 350) / 650) * 7, -26, Math.min(1, seeK / 260)) : Math.sin(k / 650) * 7;
      dhds.forEach((h) => h.setAttribute('transform', `rotate(${tilt.toFixed(1)} 6 -32)`));
      const blink = (k > 2500 && k < 2630) || (k > 3350 && k < 3480) || (k > 3600 && k < 3730);
      deye.setAttribute('transform', `translate(11 -37) scale(${seeing ? 1.4 : 1},${blink ? 0.12 : seeing ? 1.4 : 1}) translate(-11 37)`);
      const talk = k > 2100 && k < 3500 ? 'chirp?' : seeing && k < T.hit ? '!' : '';
      if (talk) {
        if (chirpTxt.textContent !== talk) { chirpTxt.textContent = talk; const w = talk.length > 1 ? 30 : 12; chirpBox.setAttribute('width', w); chirpTxt.setAttribute('x', w / 2); }
        const pop = talk === '!' ? seeK : k - 2100, s = ss * (pop < 160 ? 0.6 + 0.4 * pop / 160 : 1);
        chirp.setAttribute('opacity', 0);
        chirp.setAttribute('transform', `translate(${(hx + (dir > 0 ? 4 : -4 - (talk.length > 1 ? 30 : 12)) * ss).toFixed(1)},${(hy - 7 * ds).toFixed(1)}) scale(${s.toFixed(3)})`);
        chirp.firstElementChild.setAttribute('transform', dir > 0 ? '' : `translate(${talk.length > 1 ? 30 : 12},0) scale(-1,1)`);
      } else chirp.setAttribute('opacity', 0);
      /* only Bigfoot gets his picture taken */
      // 3. the comet
      if (k > fallStart && k < T.hit + 60) {
        const f = Math.min(1, (k - fallStart) / T.fall), fe = f * f;
        const cx = lerp(cx0, hx, fe), cy = lerp(cy0, hy, fe), ang = Math.atan2(hy - cy0, hx - cx0) * 180 / Math.PI;
        comet.setAttribute('opacity', 1);
        comet.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${(ss * (0.6 + 0.6 * fe)).toFixed(3)})`);
        flick.setAttribute('opacity', (0.5 + 0.4 * Math.random()).toFixed(2));
        if (Math.random() < 0.6) ember(cx, cy, now, ss);
      } else comet.setAttribute('opacity', 0);
      // 4. impact: a flash, a splash, a puff of smoke, and nothing left but the hat
      if (k >= T.hit && !boomed) { boomed = true; disturb(); quake(380); dino.setAttribute('opacity', 0); if (frozen && window.__iceChips) window.__iceChips(x, horizon, ss); }
      if (k > T.hit && k < T.hit + 900) {
        const b = (k - T.hit) / 900;
        flash.setAttribute('opacity', (1 - b).toFixed(2)); flash.setAttribute('transform', `translate(${hx.toFixed(1)},${hy.toFixed(1)}) scale(${(ss * (0.5 + b * 1.4)).toFixed(3)})`);
        splash.setAttribute('opacity', frozen ? 0 : (1 - b).toFixed(2)); splash.setAttribute('transform', `translate(${x.toFixed(1)},${horizon.toFixed(1)}) scale(${(ss * (0.6 + b * 0.8)).toFixed(3)})`);
      } else { flash.setAttribute('opacity', 0); splash.setAttribute('opacity', 0); }
      if (k > T.hit && k < T.hit + 1400) { const p = (k - T.hit) / 1400;
        puff.setAttribute('opacity', (p < 0.1 ? p * 10 : 1 - Math.pow((p - 0.1) / 0.9, 1.5)).toFixed(2));
        puff.setAttribute('transform', `translate(${hx.toFixed(1)},${(hy - p * 10 * ss).toFixed(1)}) scale(${(ss * (0.8 + p * 1.1)).toFixed(3)})`);
      } else puff.setAttribute('opacity', 0);
      if (!frozen) ripples(x, k, ss, k < T.hit ? Math.max(0, 1 - k / (T.rise + 1600)) : Math.max(0, 1 - (k - T.hit) / 3500), k < T.hit ? 14 : 30, k < T.hit ? 40 : 80);
      // the hat pops up, see-saws down like a leaf, and floats
      const hk = k - T.hit;
      if (hk > 0) {
        let fx, fy, rot; const top = hy - 8 * ds - 34 * ss;
        if (hk < 600) { const p = Math.sin((hk / 600) * Math.PI / 2); fx = lerp(hx, hx + 10 * ss * dir, p); fy = lerp(hy - 8 * ds, top, p); rot = 330 * p * dir; }
        else if (hk < 3800) { const q = (hk - 600) / 3200, qe = ease(q); fx = lerp(hx + 10 * ss * dir, hatX, q) + Math.sin(q * Math.PI * 3) * 12 * ss * (1 - q * 0.6); fy = lerp(top, horizon - 0.5, qe); rot = Math.sin(q * Math.PI * 3 + 0.4) * 24 * (1 - q); }
        else { fx = hatX; fy = horizon - 0.5 + (frozen ? 0 : Math.sin(hk / 420) * 0.9); rot = frozen ? 0 : Math.sin(hk / 520) * 6; } // on ice it just sits there
        flyhat.setAttribute('opacity', (k > end - 500 ? (end - k) / 500 : 1).toFixed(2));
        flyhat.setAttribute('transform', `translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(ds * 1.15).toFixed(3)})`);
      }
      // 5. the bulletin
      const ck = k - cardStart;
      if (false && ck > 0) {
        dcard.setAttribute('opacity', (ck < 200 ? ck / 200 : ck > T.card ? Math.max(0, 1 - (ck - T.card) / 500) : 1).toFixed(2));
        dcard.setAttribute('transform', `translate(${cardX.toFixed(1)},${cardY.toFixed(1)}) rotate(-4) scale(${(cs * (ck < 220 ? 1.4 - 0.4 * ck / 220 : 1)).toFixed(3)})`);
      }
      if (k < end) requestAnimationFrame(step);
      else { finishD(); curAbort = null; done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the Lake Michigan Triangle (Ludington, Manitowoc, Benton Harbor; Jay Gourley, 1977)
  const staticPat = behind.querySelector('#static-lines');
  const playTriangle = (done) => {
    size(); seaclip.setAttribute('height', String(4000 + horizon + 1));
    const phone = W < 700, dir = phone ? -1 : 1; // phones: the clear water is right of the sign, so she sails in from the right
    const ss = Math.max(0.8, Math.min(1.8, W / 700)), tx = W * (phone ? 0.79 : 0.28);
    const T = { sail: 6400, trace: 700, side: 850, flare: 2200, fog: 2600, spin: 3000, stat: 3400, stutter: 5300, glitch: 6400, stretch: 7900, collapse: 8350, wink: 8650, card: 9100, stamp: 10300, buoy: 9700, end: 14200 };
    // the triangle, lying flat on the water: Manitowoc and Ludington across the far side, Benton Harbor nearest
    // (phones: drawn a little nearer, so it clears the corner of the sign)
    const tw = phone ? Math.min(60, W - tx - 8) : 95 * ss, far = horizon + (phone ? 9 : 3 + tw * 0.04);
    const V = [[tx - tw, far], [tx + tw, far], [tx + tw * 0.1, phone ? horizon + 50 : horizon + tw * 0.42]];
    tsides.forEach((s, i) => { const [a, b] = [V[i], V[(i + 1) % 3]]; s.setAttribute('d', `M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)}`); s.setAttribute('stroke-dashoffset', 1); });
    const fs = phone ? 5.6 : 8;
    tverts.forEach((g, i) => { const tEl = g.querySelector('text'); g.setAttribute('transform', `translate(${V[i][0].toFixed(1)},${V[i][1].toFixed(1)})`); g.setAttribute('opacity', 0);
      tEl.setAttribute('font-size', fs); tEl.setAttribute('text-anchor', ['start', 'end', 'middle'][i]); tEl.setAttribute('x', [-4, 4, 0][i]); tEl.setAttribute('y', (fs * 1.5).toFixed(1)); });
    triclip.setAttribute('points', V.map((v) => v.map((n) => n.toFixed(1)).join(',')).join(' '));
    const sx0 = tx - tw * 1.5, sy0 = horizon - tw * 1.3;
    [staticEl, stmask].forEach((r) => { r.setAttribute('x', sx0.toFixed(1)); r.setAttribute('y', sy0.toFixed(1)); r.setAttribute('width', (tw * 3).toFixed(1)); r.setAttribute('height', (tw * 1.9).toFixed(1)); });
    const x0 = phone ? W + 90 * ss : -90 * ss;
    const cs = phone ? 0.86 : 1.1, cw = 240 * cs, cardX = phone ? (W - cw) / 2 : clamp(tx - cw * 0.75, 16, W - cw - 16), cardY = phone ? 84 : 100;
    const ccx = phone ? 34 : 64, ccy = phone ? horizon + 112 : horizon + 200, ccs = phone ? 0.8 : 1.15;
    const t0 = performance.now(); let ang = 0, settle = null, stamped = false, winked = false, snappedT = false;
    let aborted = false;
    buoy.lit = false;
    curAbort = () => { aborted = true; [liner, refl, tri, flare, fog, staticEl, lglitch, compassEl, casefile, stamp, buoy, pin].forEach((el) => el.setAttribute('opacity', 0)); sripples.forEach((r) => r.setAttribute('opacity', 0)); curAbort = null; };
    liner.setAttribute('opacity', 1); refl.setAttribute('opacity', 1); tri.setAttribute('opacity', 1);
    compassEl.setAttribute('transform', `translate(${ccx},${ccy.toFixed(1)}) scale(${ccs})`);
    const step = (now) => {
      if (aborted) return;
      const k = now - t0;
      const out = k > T.end - 800 ? Math.max(0, (T.end - k) / 800) : 1, after = k > T.wink ? Math.min(1, (k - T.wink) / 1600) : 0;
      // 1. she sails in on calm water
      const lx = lerp(x0, tx, 1 - Math.pow(1 - Math.min(1, k / T.sail), 1.7));
      let sx = 1, sy = 1;
      if (k > T.stretch) { const s = ease(Math.min(1, (k - T.stretch) / (T.collapse - T.stretch))); sx = 1 - 0.92 * s; sy = 1 + 1.3 * s; }
      if (k > T.collapse) { const c = Math.min(1, (k - T.collapse) / (T.wink - T.collapse)); sx = 0.08 * (1 - c); sy = 2.3 * (1 - c); }
      const tf = `translate(${lx.toFixed(1)},${(horizon - 1).toFixed(1)}) scale(${(ss * dir * sx).toFixed(3)},${(ss * sy).toFixed(3)})`;
      // 2. the triangle draws itself on the water, side by side, then each town lights up
      tsides.forEach((s, i) => s.setAttribute('stroke-dashoffset', (1 - Math.min(1, Math.max(0, (k - T.trace - i * T.side) / T.side))).toFixed(3)));
      tverts.forEach((g, i) => g.setAttribute('opacity', Math.min(1, Math.max(0, (k - T.trace - i * T.side) / 300)).toFixed(2)));
      tri.setAttribute('opacity', ((1 - after) * (0.85 + 0.15 * Math.sin(k / 120))).toFixed(2));
      // 3. strangeness: a flare overhead, fog in the triangle, static in the air
      const fl = Math.min(1, Math.max(0, (k - T.flare) / 1500)) * (1 - after);
      flare.setAttribute('opacity', (fl * (0.75 + 0.25 * Math.sin(k / 170))).toFixed(2));
      flare.setAttribute('cx', tx.toFixed(1)); flare.setAttribute('cy', (horizon - tw * 0.75).toFixed(1)); flare.setAttribute('rx', (tw * (0.8 + 0.1 * Math.sin(k / 400))).toFixed(1)); flare.setAttribute('ry', (tw * 0.55).toFixed(1));
      fog.setAttribute('opacity', (Math.min(1, Math.max(0, (k - T.fog) / 1500)) * (1 - after)).toFixed(2));
      fogs.forEach((f, i) => { f.setAttribute('cx', (tx + (i - 2) * tw * 0.32 + Math.sin(k / 1400 + i * 1.7) * tw * 0.15).toFixed(1));
        f.setAttribute('cy', (far + tw * (0.08 + (i % 2) * 0.07)).toFixed(1)); f.setAttribute('rx', (tw * 0.38).toFixed(1)); f.setAttribute('ry', (tw * 0.05 + 4).toFixed(1)); });
      const st = k > T.stat && k < T.wink + 300 ? Math.min(1, (k - T.stat) / 2500) : 0;
      staticEl.setAttribute('opacity', st ? (st * (0.06 + Math.random() * 0.14)).toFixed(2) : 0);
      staticPat.setAttribute('patternTransform', `translate(0,${(Math.random() * 3).toFixed(1)})`);
      // 4. her lights stutter; the picture tears into slices with color ghosts; she stretches thin, shrinks to a point, and winks out
      const glitching = k > T.glitch && k < T.wink;
      /* only Bigfoot gets his picture taken */
      const stut = k > T.stutter && k < T.wink ? Math.min(1, (k - T.stutter) / 1000) : 0;
      pws.forEach((p, i) => p.setAttribute('opacity', (stut && Math.random() < stut * 0.5 ? 0.1 : 0.75 + 0.25 * ((i * 7) % 3 === 0 ? Math.sin(k / 400 + i) : 1)).toFixed(2)));
      mast.setAttribute('opacity', stut && Math.random() < stut * 0.5 ? 0.15 : Math.sin(k / 160) > 0 ? 1 : 0.3);
      liner.setAttribute('opacity', glitching || k >= T.wink ? 0 : 1); liner.setAttribute('transform', tf);
      lglitch.setAttribute('opacity', glitching ? (Math.random() < 0.12 ? 0.35 : 1) : 0);
      if (glitching) {
        const g = Math.min(1, (k - T.glitch) / 700) * (k > T.stretch ? 1 - (k - T.stretch) / (T.wink - T.stretch) * 0.7 : 1);
        lglitch.setAttribute('transform', tf);
        slices.forEach((s) => s.setAttribute('transform', `translate(${((Math.random() - 0.5) * 14 * g + (Math.random() < 0.15 ? (Math.random() - 0.5) * 30 * g : 0)).toFixed(1)},0)`));
        ghosts[0].setAttribute('transform', `translate(${(-3 - Math.random() * 4 * g).toFixed(1)},${(Math.random() - 0.5).toFixed(1)})`);
        ghosts[1].setAttribute('transform', `translate(${(3 + Math.random() * 4 * g).toFixed(1)},${(Math.random() - 0.5).toFixed(1)})`);
      }
      refl.setAttribute('opacity', (k < T.glitch ? 1 : k < T.wink ? (Math.random() < 0.5 ? 0.15 : 0.6) : 0).toFixed(2));
      refl.setAttribute('transform', `translate(${lx.toFixed(1)},${horizon.toFixed(1)}) scale(${ss.toFixed(3)})`);
      const pk = (k - T.collapse) / (T.wink - T.collapse + 260);
      if (pk > 0 && pk < 1) { pin.setAttribute('opacity', 1); pin.setAttribute('transform', `translate(${lx.toFixed(1)},${(horizon - 14 * ss).toFixed(1)}) scale(${(ss * (pk < 0.8 ? 0.4 + pk : 1.2 * (1 - pk) / 0.2)).toFixed(3)})`); }
      else pin.setAttribute('opacity', 0);
      if (k >= T.wink && !winked) { winked = true; disturb(); }
      const wk = (k - T.wink - 200) / 450;
      if (wk > 0 && wk < 1) { flash.setAttribute('opacity', (1 - wk).toFixed(2)); flash.setAttribute('transform', `translate(${lx.toFixed(1)},${(horizon - 14 * ss).toFixed(1)}) scale(${(ss * (0.15 + wk * 0.35)).toFixed(3)})`); }
      else flash.setAttribute('opacity', 0);
      // the ripples settle
      if (k > T.wink) ripples(lx, k - T.wink, ss, Math.max(0, 1 - (k - T.wink) / 3000) * 0.8, 16, 60); else sripples.forEach((r) => r.setAttribute('opacity', 0));
      // 5. the compass has opinions
      compassEl.setAttribute('opacity', (Math.min(1, Math.max(0, (k - 1200) / 500)) * out).toFixed(2));
      if (k < T.spin) ang = Math.sin(k / 380) * 7;
      else if (k < T.wink + 400) ang += (6 + 34 * Math.min(1, (k - T.spin) / 1600)) * (Math.random() < 0.12 ? -1.6 : 1);
      else { if (settle === null) settle = ang + ((((200 - ang) % 360) + 360) % 360) + 360; ang += (settle - ang) * 0.05; }
      cneedle.setAttribute('transform', `rotate(${(ang + (settle !== null ? Math.sin(k / 90) * 3 : 0)).toFixed(1)})`);
      // 6. the paperwork, and the stamp
      const fk = k - T.card;
      if (fk > 0) { const s = ease(Math.min(1, fk / 550));
        casefile.setAttribute('opacity', 0);
        casefile.setAttribute('transform', `translate(${lerp(-cw - 30, cardX, s).toFixed(1)},${cardY}) rotate(${lerp(-9, -2, s).toFixed(1)}) scale(${cs})`); }
      const sk = k - T.stamp;
      if (sk > 0) { if (!stamped) { stamped = true; quake(200); }
        stamp.setAttribute('opacity', 0);
        stamp.setAttribute('transform', `translate(180,66) scale(${sk < 160 ? 1.9 - 0.9 * sk / 160 : 1}) translate(-180,-66)`); }
      // 7. and one survivor in a life ring, bobbing on the empty water: a slow look around, then a bewildered little wave at you
      const ck = (k - T.buoy) / (T.end - T.buoy);
      if (ck > 0) {
        if (!buoy.lit) { buoy.lit = true; const day = (window.__wx && window.__wx.day) || 0; brings.forEach((r) => (r.style.filter = `brightness(${(0.62 + 0.38 * Math.min(1, day * 1.4)).toFixed(2)})`)); } // moonlit at night
        const bs = ss * (phone ? 2.3 : 2), up = Math.min(1, ck / 0.08), bob = Math.sin(k / 420) * 0.7 + (1 - up) * 5;
        buoy.setAttribute('opacity', (Math.min(1, ck * 8) * out).toFixed(2));
        buoy.setAttribute('transform', `translate(${(tx - dir * 30 * ss + dir * 40 * ss * ck).toFixed(1)},${(horizon + 2 + bob).toFixed(1)}) rotate(${(Math.sin(k / 650) * 4).toFixed(1)}) scale(${bs.toFixed(3)})`);
        bman.setAttribute('transform', `translate(0,${(Math.sin(k / 300 + 1) * 0.3).toFixed(2)})`);
        // the look: the head turns one way, holds, the other way, then back to you
        const look = ck < 0.12 ? 0 : ck < 0.3 ? -1 : ck < 0.48 ? 1 : 0, lk = Math.sin(k / 260) * 0.1;
        rhead.setAttribute('transform', `translate(${(look * 0.5).toFixed(2)},0) rotate(${(lk * 20).toFixed(1)} 0 -8)`);
        rnose.setAttribute('opacity', look ? 1 : 0); rnose.setAttribute('transform', `scale(${look || 1},1)`);
        // the wave: the arm comes up off the ring, waves twice, and drops back
        const wk = (ck - 0.55) / 0.3, wv = wk > 0 && wk < 1 ? Math.sin(Math.min(1, wk * 4) * Math.PI / 2) * (wk > 0.85 ? (1 - wk) / 0.15 : 1) : 0;
        bwave.setAttribute('transform', `rotate(${(-150 * wv + (wv > 0.5 ? Math.sin(k / 120) * 22 : 0)).toFixed(1)} 3.8 -5.2)`);
        brips.forEach((r, i) => { const p = (k / 1500 + i * 0.5) % 1; r.setAttribute('rx', (9 + p * 8).toFixed(2)); r.setAttribute('ry', (2.6 + p * 2).toFixed(2)); r.setAttribute('opacity', ((1 - p) * 0.9).toFixed(2)); });
      }
      if (k < T.end) requestAnimationFrame(step);
      else { [liner, refl, tri, flare, fog, staticEl, lglitch, compassEl, casefile, stamp, buoy, pin].forEach((el) => el.setAttribute('opacity', 0)); sripples.forEach((r) => r.setAttribute('opacity', 0)); curAbort = null; done(); }
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
  // Bigfoot is drawn like the 1967 Patterson-Gimlin subject: hulking, no neck, a conical crown, arms to the knees.
  // Local units, facing +x, feet on y=0; the hips sit at y=-21. Polygons run clockwise so shag() pushes the fur outward.
  const BINK = '#05070B', BFAR = '#0A0E13', BEDGE = '#26323E';
  // limbs get a hair-thin moonlit edge so an arm reads against the body; the body itself is pure silhouette
  // shag() with softer, heavier hair: each tuft hangs a little (gravity), leans back along the edge, and is drawn as a tapered
  // curve rather than a sawtooth, so the outline reads as long matted fur instead of spikes
  const shagHang = (pts, step = 1.6, amp = 2) => {
    const P = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / step)), tx = (x2 - x1) / len, ty = (y2 - y1) / len, nx = ty, ny = -tx;
      for (let k = 0; k < n; k++) { const t = k / n, bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t;
        if (k % 2) { const j = amp * (0.45 + ((i * 7 + k * 3) % 7) / 9), hang = ny > 0.3 ? 0.9 : 0.45;
          P.push([bx + nx * j - tx * j * 0.35, by + ny * j + j * hang, 1]); } else P.push([bx, by, 0]); }
    }
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let i = 1; i <= P.length; i++) { const [x, y, tip] = P[i % P.length], [px, py] = P[i - 1];
      // into a tip: bow inward so the strand tapers; out of a tip: a straight-ish return to the hide
      const cx = tip ? px + (x - px) * 0.2 : px + (x - px) * 0.75, cy = tip ? py + (y - py) * 0.75 : py + (y - py) * 0.2;
      d += ` Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`; }
    return d + 'Z';
  };
  const hairy = (pts, amp, fill = BINK, step = 1.6, edge = fill) => `<path d="${shagHang(pts, step, amp)}" fill="${fill}" stroke="${edge}" stroke-width=".4" stroke-linejoin="round"/>`;
  const B = {
    thigh: [[-5.8, -3], [5, -3], [4.8, 5], [3.2, 12], [-3.2, 12.6], [-5.6, 5]],
    shin: [[-3.6, -1.3], [3.2, -1.3], [2.6, 6], [2, 12], [-2, 12], [-4.2, 4.5]],
    foot: [[-3.4, -1.2], [1.8, -1.2], [8.2, .5], [9, 2.2], [-4, 2.2]],
    upper: [[-4.4, -3.6], [4.4, -3.6], [4, 6], [3, 12.5], [-3, 12.5], [-4.2, 6]],
    fore: [[-3.2, -1], [3.2, -1], [2.8, 7], [2.3, 11], [-2.3, 11], [-3.2, 6]],
    hand: [[-2.8, -.6], [3, -.6], [3.6, 4], [1.8, 6.8], [-1.6, 6.2], [-3, 3]],
    torso: [[-7.5, -24.5], [-12, -28.5], [-13.6, -33.5], [-14, -40], [-12.6, -46], [-9.2, -50.6], [-4.5, -52.6], [-.5, -52.2], [2.5, -49.5], [6.5, -45.8], [11, -42.4], [12.8, -37], [12, -31.5], [9, -27], [4, -24.2], [-2, -23.8]],
    head: [[-1.5, -49], [0, -54], [3, -58.4], [6, -57], [9, -54], [11.8, -52.2], [11.2, -50.8], [12.9, -49.6], [14.1, -47.6], [13.3, -45.6], [10.6, -44.4], [7, -45.2], [3, -47]],
    // the look back: the chest and shoulders squared to the camera, the head low between them
    ftorso: [[-15, -45], [-12, -50.5], [-6, -53], [6, -53], [12, -50.5], [15, -45], [15.6, -38], [13.8, -31], [11, -26], [5.5, -23.8], [-5.5, -23.8], [-11, -26], [-13.8, -31], [-15.6, -38]],
    fhead: [[-5.6, -46.5], [-5.4, -51.5], [-2.8, -55.6], [0, -58], [2.8, -55.6], [5.4, -51.5], [5.6, -46.5], [3.8, -43.2], [0, -42.2], [-3.8, -43.2]],
    farm: [[-18.2, -45.5], [-12, -46.5], [-11.8, -34], [-12.2, -22], [-11, -15.5], [-12.6, -11.5], [-16.2, -11.8], [-17.6, -16], [-18.2, -24], [-19.2, -35]],
  };
  const mir = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const bleg = (cls, x, fill) => `<g class="${cls}" transform="translate(${x},-27)"><g class="th">${hairy(B.thigh, 1.9, fill, 1.6)}<g class="sh">${hairy(B.shin, 1.6, fill, 1.5)}<g class="ft">${hairy(B.foot, .7, fill, 1.6)}</g></g></g></g>`;
  const barm = (cls, x, y, fill) => `<g class="${cls}" transform="translate(${x},${y})"><g class="ua">${hairy(B.upper, 2, fill, 1.6)}<g class="fa">${hairy(B.fore, 1.9, fill, 1.5)}<g class="hd">${hairy(B.hand, .8, fill, 1.6)}</g></g></g></g>`;
  const EYE = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="2.1" fill="#FF9E3D" opacity=".28"/><circle class="bfeye" cx="${cx}" cy="${cy}" r=".85" fill="#FFC870"/>`;
  const bf = document.createElementNS(NS, 'g');
  bf.innerHTML = `<g class="bfprints"></g>
    <clipPath id="bf-signclip" clipPathUnits="userSpaceOnUse"><path class="bfclipp" d="M-9999,-9999 H99999 V99999 H-9999Z"/></clipPath>
    <g class="bfclipwrap" clip-path="url(#bf-signclip)">
    <g class="bigfoot" opacity="0">
      <g class="bfrim" style="filter:drop-shadow(0 0 .9px rgba(160,200,222,.75))"><g class="bfbody">
        <g class="sd bfa-far">${barm('arm', 0, -46.5, BFAR)}</g>
        ${bleg('leg lf', -2, BFAR)}
        <g class="sd bfcore">${hairy(B.torso, 2.3, BINK, 1.7)}
          <g class="bhead">${hairy(B.head, 1.1, BINK, 1.3)}<g class="bfeyes-s">${EYE(11.3, -50.5)}</g></g></g>
        ${bleg('leg ln', 1, BINK)}
        <g class="sd bfa-near"><g class="bfedge">${barm('arm', 3, -45.5, BINK)}</g></g>
        <g class="bffront" opacity="0">
          <g class="bfedge bfarms-f">${hairy(B.farm, 1.9, BINK)}${hairy(mir(B.farm), 1.9, BINK)}</g>
          ${hairy(B.ftorso, 2.3, BINK, 1.7)}
          <g class="bfhead-f">${hairy(B.fhead, 1.5, BINK, 1.4)}<path d="M-4.6,-51 Q-2.3,-52.4 0,-51 Q2.3,-52.4 4.6,-51" fill="none" stroke="${BEDGE}" stroke-width=".8"/>
            <g class="bfeyes-f">${EYE(-2.2, -49.6)}${EYE(2.2, -49.6)}</g></g>
        </g>
      </g></g>
    </g></g>
    <filter id="bf-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2 1"/></filter>
    <rect class="bfflash" x="-4000" y="-4000" width="9000" height="9000" fill="#FFFDF4" opacity="0"/>
    <g class="polaroid" opacity="0">
      <rect x="-40" y="-74" width="80" height="74" fill="#FFD9A0" opacity=".14"/>
      <path fill-rule="evenodd" d="M-46,-80 H46 V24 H-46 Z M-40,-74 V0 H40 V-74 Z" fill="#F4EFE4" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>
      <text x="0" y="15" text-anchor="middle" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="9" fill="#2A2420" letter-spacing=".5">IS THAT HIM?</text>
    </g>`;
  // Bigfoot gets his own layer above the sign, so he can hide behind its edge (by the clip) and not under its glow
  const bfsvg = document.createElementNS(NS, 'svg');
  bfsvg.setAttribute('class', 'bf-layer'); bfsvg.setAttribute('aria-hidden', 'true');
  bfsvg.append(bf); hero.append(bfsvg);
  const big = bf.querySelector('.bigfoot'), bbody = bf.querySelector('.bfbody'), bfront = bf.querySelector('.bffront');
  const bsides = [...bf.querySelectorAll('.sd')], bhead = bf.querySelector('.bhead'), bfheadF = bf.querySelector('.bfhead-f');
  const bfeyesF = bf.querySelector('.bfeyes-f'), bfeyesS = bf.querySelector('.bfeyes-s'), bfarmsF = bf.querySelector('.bfarms-f');
  const bclipP = bf.querySelector('.bfclipp');
  const BL = ['ln', 'lf'].map((c) => { const g = bf.querySelector('.' + c); return { th: g.querySelector('.th'), sh: g.querySelector('.sh'), ft: g.querySelector('.ft') }; });
  const BA = ['bfa-near', 'bfa-far'].map((c) => { const g = bf.querySelector('.' + c); return { ua: g.querySelector('.ua'), fa: g.querySelector('.fa'), hd: g.querySelector('.hd') }; });
  const prints = bf.querySelector('.bfprints'), bfflash = bf.querySelector('.bfflash'), polaroid = bf.querySelector('.polaroid');
  const polCap = polaroid.querySelector('text');
  svg.append(bf.querySelector('.bfflash'), polaroid); // on top of every act, not just Bigfoot's
  // every act ends the same way: somebody snaps a picture, and it comes out blurry
  let snapRaf = 0, snapTimer = 0, snapSubjects = [];
  const snapStop = () => { cancelAnimationFrame(snapRaf); clearTimeout(snapTimer); snapRaf = snapTimer = 0;
    snapSubjects.forEach((el) => el && el.removeAttribute('filter')); snapSubjects = []; bfflash.setAttribute('opacity', 0); polaroid.setAttribute('opacity', 0); };
  const snap = (subjects, x, baseY, s, caption, layer = svg) => {
    snapStop();
    layer.append(bfflash, polaroid); // always on top of whatever is in the shot
    polCap.textContent = caption;
    polCap.setAttribute('font-size', Math.min(9, 82 / (caption.length * 0.98)).toFixed(2)); // long captions shrink to fit the frame
    x = Math.max(50 * s + 8, Math.min(W - 50 * s - 8, x)); // keep the whole print on screen
    polaroid.setAttribute('transform', `translate(${x.toFixed(1)},${baseY.toFixed(1)}) scale(${s.toFixed(3)}) rotate(-6)`);
    snapSubjects = subjects; subjects.forEach((el) => el && el.setAttribute('filter', 'url(#bf-blur)'));
    snapTimer = setTimeout(() => { subjects.forEach((el) => el && el.removeAttribute('filter')); snapSubjects = []; }, 1900);
    const t0 = performance.now();
    (function shot(t2) { const f = (t2 - t0) / 1900;
      bfflash.setAttribute('opacity', Math.max(0, 0.7 - f * 6).toFixed(2));
      polaroid.setAttribute('opacity', (f < 0.1 ? f * 10 : f > 0.75 ? Math.max(0, (1 - f) / 0.25) : 1).toFixed(2));
      if (f < 1) snapRaf = requestAnimationFrame(shot); else { snapRaf = 0; polaroid.setAttribute('opacity', 0); } })(t0);
  };
  // the gait: thigh a, knee b and foot c (degrees, foot absolute) for a leg at phase q. Stance pushes the foot back; swing folds the knee.
  // A long, bent-knee "compliant" walk, and a loping run with a flight phase and the knees high.
  const GWALK = { S: 0.58, A: 34, K: 16, Kb: 8, Ksw: 44, toe: 26, T: 1650, arm: 1.05, elb: -12, lean: 9 };
  const GRUN = { S: 0.38, A: 42, K: 22, Kb: 10, Ksw: 92, toe: 34, T: 560, arm: 1.05, elb: -62, lean: 20 };
  const D2R = Math.PI / 180;
  const bgait = (q, G) => {
    q = ((q % 1) + 1) % 1;
    if (q < G.S) { const u = q / G.S; return [-G.A + 2 * G.A * u, G.K + G.Kb * Math.sin(Math.PI * u), u > 0.72 ? (u - 0.72) / 0.28 * G.toe : 0]; }
    const v = (q - G.S) / (1 - G.S), e = v * v * (3 - 2 * v);
    return [G.A - 2 * G.A * e, G.K + G.Ksw * Math.sin(Math.PI * Math.min(1, v * 1.12)), G.toe * (1 - v) * (1 - v) - 10 * Math.sin(Math.PI * v)];
  };
  const ankle = ([a, b]) => [-12 * Math.sin(a * D2R) - 12 * Math.sin((a + b) * D2R), 12 * Math.cos(a * D2R) + 12 * Math.cos((a + b) * D2R)];
  const footLow = (ang) => { const c = ang[2] * D2R; return -27 + ankle(ang)[1] + Math.max(-4 * Math.sin(c) + 2.2 * Math.cos(c), 9 * Math.sin(c) + 2.2 * Math.cos(c)); };
  const stride = (G) => (ankle(bgait(0, G))[0] - ankle(bgait(G.S - 1e-4, G))[0]) / G.S; // body travel per cycle, feet planted
  // poses the whole rig; m blends the gait in from a standing pose. Returns the two leg angle sets (near, far).
  const bpose = (p, G, m = 1, lean = 0, side = 1) => {
    const legs = [bgait(p, G), bgait(p + 0.5, G)].map(([a, b, c]) => [a * m, 8 + (b - 8) * m, c * m]);
    const dy = -Math.max(footLow(legs[0]), footLow(legs[1]));
    bbody.setAttribute('transform', `translate(0,${dy.toFixed(2)})`);
    legs.forEach(([a, b, c], i) => { BL[i].th.setAttribute('transform', `rotate(${a.toFixed(1)})`); BL[i].sh.setAttribute('transform', `translate(0,12) rotate(${b.toFixed(1)})`); BL[i].ft.setAttribute('transform', `translate(0,12) rotate(${(c - a - b).toFixed(1)})`); });
    // arms swing against the legs on the same side; when running the elbows bend and pump
    legs.forEach(([a], i) => { const s = -G.arm * a + 4, e = G.elb * m + Math.min(0, s) * 0.5 * m;
      BA[i].ua.setAttribute('transform', `rotate(${s.toFixed(1)})`); BA[i].fa.setAttribute('transform', `translate(0,12.5) rotate(${e.toFixed(1)})`); BA[i].hd.setAttribute('transform', `translate(0,11) rotate(${(-e * 0.4).toFixed(1)})`); });
    const sway = Math.sin(p * Math.PI * 2) * 1.6 * m, L = lean + sway;
    bsides.forEach((g) => { g.setAttribute('transform', `rotate(${L.toFixed(2)} 0 -27) scale(${Math.max(0.04, side).toFixed(3)},1)`); g.setAttribute('opacity', side > 0.02 ? 1 : 0); });
    bhead.setAttribute('transform', `rotate(${(Math.sin(p * Math.PI * 4) * 2.2 * m - lean * 0.4).toFixed(2)} 3 -47)`);
    return legs;
  };
  // the sign's left edge (traced from the artwork, in its 440x411 pixels), so he can hide behind it and peek round it
  const SIGN_EDGE = [[40, 60], [38, 90], [29, 125], [33, 150], [40, 170], [46, 190], [52, 210], [58, 230], [65, 250], [68, 260], [72, 270], [77, 280], [89, 290], [100, 296]];
  const playBigfoot = (done) => {
    size(); bfsvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const phone = W < 700, sc = (phone ? 1.1 : 1.15) * scale, gY = horizon - 1, dir = -1; // he walks to the left
    const neon = hero.querySelector('.orbit .neon'), hr = hero.getBoundingClientRect();
    const nr = neon ? neon.getBoundingClientRect() : null, f = nr ? nr.width / 440 : 0;
    const edgePts = nr && nr.width > 20 && !orbitEl.classList.contains('toppled') ? SIGN_EDGE.map(([x, y]) => [nr.left - hr.left + x * f, nr.top - hr.top + y * f]) : null;
    const edgeX = (y) => { if (!edgePts) return W * 0.45; if (y <= edgePts[0][1]) return edgePts[0][0];
      for (let i = 1; i < edgePts.length; i++) if (y <= edgePts[i][1]) { const [x1, y1] = edgePts[i - 1], [x2, y2] = edgePts[i]; return lerp(x1, x2, (y - y1) / (y2 - y1)); }
      return edgePts[edgePts.length - 1][0]; };
    // everything left of the sign's edge shows; he stays behind it until he steps out
    bclipP.setAttribute('d', edgePts ? `M-9999,-9999 H${edgePts[0][0].toFixed(1)} ${edgePts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} V99999 H-9999Z` : 'M-9999,-9999 H99999 V99999 H-9999Z');
    const headY = gY - 51 * sc, hideX = Math.max(edgeX(gY), edgeX(headY - 6 * sc)) + 21 * sc;
    const LEAN = 15, peekX = edgeX(headY) + Math.sin(LEAN * D2R) * 51 * sc - 5.5 * sc; // half his head and a shoulder clear the edge
    const Dw = stride(GWALK) * sc, Dr = stride(GRUN) * sc;
    const half = edgePts ? (phone ? W * 0.25 : edgeX(gY) / 2) : W * 0.3;
    const cyc = Math.max(1, Math.min(phone ? 2 : 3.5, Math.round((hideX - half) / Dw * 2) / 2)); // whole half-strides: both feet land planted
    const stopX = hideX - cyc * Dw, Tw = cyc * GWALK.T / 0.84, runV = Dr / GRUN.T;
    const T = { p1: 300, p1h: 800, d1: 2000, d1h: 2350, p2: 2950, p2h: 3300, out: 4350, walk: 4700 };
    T.look = T.walk + Tw; T.flash = T.look + 650; T.back = T.look + 1900; T.run = T.back + 220;
    T.end = T.run + (stopX + 60 * sc) / runV + 250;
    const iceAtStart = !!(window.__wx && window.__wx.ice > 0.97);
    const t0 = performance.now(); let snapped = false, lastQ = [0, 0.5], fell = false, aborted = false;
    curAbort = () => { aborted = true; big.setAttribute('opacity', 0); curAbort = null; };
    big.setAttribute('opacity', 1);
    const vel = (u) => (u < 0.12 ? u * u / 0.24 : u < 0.8 ? 0.06 + (u - 0.12) : 0.74 + (0.1 - (1 - u) * (1 - u) / 0.4)) / 0.84; // ease in, cruise, ease out
    const footprint = (x, near) => {
      const fp = document.createElementNS(NS, 'ellipse'); fp.setAttribute('cx', x.toFixed(1)); fp.setAttribute('cy', (horizon + (near ? 3.2 : 2) ).toFixed(1));
      fp.setAttribute('rx', (3.4 * sc).toFixed(1)); fp.setAttribute('ry', (0.9 * sc).toFixed(1)); fp.setAttribute('fill', 'rgba(0,0,0,.5)'); prints.append(fp);
      const born = performance.now(); (function fade(t2) { const a = 1 - (t2 - born) / 3600; if (a <= 0 || !fp.isConnected) { fp.remove(); return; } fp.setAttribute('opacity', a.toFixed(2)); requestAnimationFrame(fade); })(born);
    };
    const step = (now) => {
      if (aborted) return;
      const k = now - t0; let x = hideX, p = 0, G = GWALK, m = 0, lean = 0, rot = 0, side = 0, front = 1, jump = 0, walking = false, look = 0;
      const sm = (a, b) => { const t = Math.min(1, Math.max(0, (k - a) / (b - a))); return t * t * (3 - 2 * t); };
      if (k < T.out) {
        // 1. the peek: he leans out from behind the sign, holds, ducks back, then looks again
        const o = sm(T.p1, T.p1h) * (1 - sm(T.d1, T.d1h)) + sm(T.p2, T.p2h) * (1 - sm(T.out - 250, T.out));
        x = lerp(hideX, peekX, o); rot = -LEAN * o;
        const blink = (k > 1650 && k < 1770) || (k > 3900 && k < 4000);
        bfeyesF.setAttribute('transform', `translate(0,-49.6) scale(1,${blink ? 0.12 : 1}) translate(0,49.6)`);
        bfheadF.setAttribute('transform', `rotate(${(o * (-6 + Math.sin(k / 420) * 3)).toFixed(1)} 0 -46)`);
      } else if (k < T.look) {
        // 2. he turns side-on and steps out: slow, heavy, deliberate
        const u = Math.min(1, (k - T.walk) / Tw), tk = sm(T.out, T.walk);
        side = tk >= 0.5 ? 0.55 + 0.45 * tk : 0; front = tk < 0.5 ? 1 - 0.45 * tk : 0; bfheadF.removeAttribute('transform');
        if (k >= T.walk) { p = cyc * vel(u); x = hideX - p * Dw; m = Math.min(1, p * 2.5); walking = true; lean = GWALK.lean; }
      } else if (k < T.run) {
        // 3. the look back over the shoulder, the flash, and a startled flinch
        p = cyc; x = stopX; m = 1; lean = GWALK.lean;
        const tl = sm(T.look, T.look + 380), tb = sm(T.back, T.run), tt = tl * (1 - tb);
        // frame 352: the legs stay mid-stride and side-on, the chest twists a third of the way round, the head comes all the way
        side = 1; front = 0; look = tt;
        const fl = k - T.flash; if (fl > 0 && fl < 420) jump = Math.sin(fl / 420 * Math.PI) * 2.4;
        bfeyesF.setAttribute('transform', `translate(0,-49.6) scale(${fl > 0 ? 1.25 : 1},${fl > 0 && fl < 160 ? 0.15 : fl > 0 ? 1.25 : 1}) translate(0,49.6)`);
        bfheadF.setAttribute('transform', `translate(2.6,1.2) scale(${(1 / 0.62).toFixed(3)},1) rotate(${(fl > 0 ? -4 : 3).toFixed(1)} 0 -46)`);
      } else {
        // 4. and he is gone: a loping run, arms pumping, straight off the left edge
        const tr = k - T.run, d = tr < 300 ? runV * tr * tr / 600 : runV * (tr - 150);
        x = stopX - d; p = cyc + d / Dr; G = GRUN; m = Math.min(1, tr / 200); lean = lerp(GWALK.lean, GRUN.lean, m); side = 1; front = 0; walking = true;
      }
      const legs = bpose(p, G, m, lean, side);
      if (look > 0.02) { // the three-quarter look back: a narrowed chest over the side-on body, the face turned full on
        bfront.setAttribute('opacity', look > 0.35 ? 1 : 0); bfront.setAttribute('transform', `rotate(${(lean * 0.6).toFixed(1)} 0 -27) scale(0.62,1)`);
        bfarmsF.setAttribute('opacity', 0); bhead.setAttribute('opacity', look > 0.35 ? 0 : 1);
      } else {
        bfront.setAttribute('opacity', front > 0.02 ? 1 : 0); bfarmsF.setAttribute('opacity', 1); bhead.setAttribute('opacity', 1);
        bfront.setAttribute('transform', `scale(${Math.max(0.04, front).toFixed(3)},1)`);
      }
      bfeyesS.setAttribute('opacity', side > 0.5 && look < 0.35 ? 1 : 0);
      big.setAttribute('transform', `translate(${x.toFixed(1)},${(gY - jump * sc).toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${(sc * dir).toFixed(3)},${sc.toFixed(3)})`);
      // footprints in the sand (or the snow on the ice) at every heel strike, fading behind him
      if (walking) [0, 1].forEach((i) => { const q = (((p + i * 0.5) % 1) + 1) % 1; if (q < lastQ[i] && m > 0.5) footprint(x + dir * (ankle(legs[i])[0] + 2) * sc, i === 0); lastQ[i] = q; });
      // he turns, the flash goes off, and the evidence develops
      if (!snapped && k > T.flash) { snapped = true; snap([big], x, horizon - 4, sc * 0.95, 'IS THAT HIM?', bfsvg); }
      // out on the ice when it thaws: through he goes
      if (iceAtStart && k > T.walk && window.__iceThawed && window.__iceThawed() && window.__iceFall) { fell = true;
        window.__iceFall({ el: big, x, y: gY, s: sc, w: 16 * sc, kind: 'bigfoot', dir, done }); big.setAttribute('opacity', 0); curAbort = null; return; }
      if (k < T.end && x > -80 * sc) requestAnimationFrame(step); else { big.setAttribute('opacity', 0); curAbort = null; done(); }
    };
    requestAnimationFrame(step);
  };


  // ---------------------------------------------------------------- the Michigan Dogman (Wexford County, 1887; WTCM-FM, April 1, 1987)
  // A heavy wolf-like body in silhouette: deep chest, tucked waist, big shoulders and haunches, jointed legs with hocks and paws,
  // a thick ruff, a bushy tail, a long snout with a hinged jaw, tall ears. Side view faces +x with the paws on y=0.
  const DFAR = '#0B1118', DEDGE = '#2A3846', DMOON = 'rgba(150,190,214,.32)';
  // edge: a hair-thin moonlit outline, so a near limb reads against the body behind it (that overlap is what gives him volume)
  const dhair = (pts, amp, fill = BINK, step = 1.5, edge) => `<path d="${shagHang(pts, step, amp)}" fill="${fill}"${edge ? ` stroke="${edge}" stroke-width=".5" stroke-linejoin="round"` : ''}/>`;
  // Side view, facing +x, paws on y=0. Shoulder pivot (13,-27.4), hip pivot (-14,-28.2); the body shapes are drawn 4.4 low and lifted. Polygons run clockwise (fur pushes outward).
  const DM = {
    // the body: a deep ribcage dropping to the elbows, a sharp tuck up to the loin, heavy rounded haunches
    chest: [[-3, -30], [4, -30.8], [10, -33.8], [14.6, -34.2], [18.6, -30], [21, -24], [20.6, -18.4], [18, -14.4], [14, -12], [9, -12.2], [4, -14.4], [-1, -18], [-3, -20]],
    hind: [[-22.4, -25.4], [-19, -29.4], [-12, -31], [-4, -30.2], [0, -29.8], [1, -19.6], [-4, -19.6], [-8.6, -18.8], [-13, -17], [-17.6, -17.6], [-21.6, -20.6]],
    // a thick ruff over the shoulders, then a long wolf's head: tall ears, a long snout, a hinged jaw
    neck: [[10.6, -32.6], [13.8, -38], [18.6, -42.6], [24.6, -42.6], [27, -37], [25.6, -30], [22.6, -23.4], [17.6, -21], [14, -25.4]],
    skull: [[20.4, -43], [23.4, -46], [27.8, -45.8], [31.6, -43.6], [36.8, -41.8], [40, -40.6], [40.8, -39], [39.6, -38], [34, -37.8], [29, -37], [24.6, -36.4], [21, -38.6]],
    jaw: [[25.4, -37.4], [32, -37.8], [38.6, -37.8], [37.8, -36.4], [32, -35], [27, -34.4], [24.8, -35.4]],
    ear1: [[21.8, -44.6], [22.8, -54.6], [26.6, -45.6]], ear2: [[24.6, -45.4], [27.4, -55], [28.8, -45]],
    tail: [[-21, -27.6], [-25.6, -29], [-31, -27], [-35, -21.4], [-36.6, -15], [-33.6, -12.8], [-30.6, -17.4], [-26.4, -22], [-21.4, -23]],
    // the legs, each segment hung from its joint: humerus to the elbow (0,10.4), then forearm, pastern and paw
    fu: [[-4.6, -3.8], [3.8, -4.2], [3.4, 3], [2, 8.8], [.4, 11.6], [-2.6, 11.2], [-3.8, 6]],
    fl: [[-2, -.8], [1.8, -.8], [1.3, 8], [1.1, 12.4], [1.9, 14.2], [4.8, 15], [5.2, 16.4], [-1.9, 16.4], [-1.6, 13.8], [-1.5, 8]],
    // thigh to the stifle (3.6,10.6), gaskin to the hock (-4.4,9.4), then the long hind foot
    hu: [[-8, -4], [2.4, -5.6], [6, -1.4], [6.6, 4.4], [5.6, 9.4], [2.8, 12.4], [-.4, 11.6], [-4, 8], [-7, 3]],
    hs: [[-1.8, -1.6], [2.4, -1], [.6, 3.6], [-2.2, 8], [-4.4, 10.6], [-6, 9.2], [-4.6, 5], [-2.8, 1.2]],
    hm: [[-1.3, -.8], [1, -.6], [1, 5.6], [2, 6.4], [4.6, 6.8], [5, 8.2], [-1.6, 8.2], [-1.5, 5.6]],
  };
  // the near legs carry a moonlit muscle line (the triceps, the front of the haunch) that moves with the joint, not a box outline
  const dleg = (cls, fore, fill, near) => fore
    ? `<g class="${cls}">${dhair(DM.fu, 1.2, fill, 1.3)}${near ? `<path d="M-4.2,-1 Q-4.8,6 -2.4,11" stroke="${DEDGE}" stroke-width=".55" fill="none"/>` : ''}<g class="lo">${dhair(DM.fl, .6, fill, 1.2)}</g></g>`
    : `<g class="${cls}">${dhair(DM.hu, 1.5, fill, 1.3)}${near ? `<path d="M1.4,-4.4 Q7,0 5.4,9.6 Q4.4,11.6 2.6,12.2" stroke="${DEDGE}" stroke-width=".6" fill="none"/>` : ''}<g class="lo">${dhair(DM.hs, .8, fill, 1.2)}<g class="mt">${dhair(DM.hm, .5, fill, 1.2)}</g></g></g>`;
  const lift4 = (pts) => pts.map(([x, y]) => [x, y - 4.4]); // the body rides 4.4 higher than it was drawn, on the longer legs
  const DGLOW = (cx, cy, r = 1) => `<circle class="glow" cx="${cx}" cy="${cy}" r="${2.4 * r}" fill="#FFB347" opacity=".2"/><circle class="core" cx="${cx}" cy="${cy}" r="${1.05 * r}" fill="#FFC45E"/>`;
  // looking straight at you: tall ears, cheek ruff flaring wide, the snout foreshortened toward the camera, a hinged jaw
  const dface = (cls) => `<g class="${cls}">
      ${dhair([[-6.4, -31.6], [-9.6, -35], [-11.6, -38.6], [-9.8, -42], [-8.6, -45.6], [-11.8, -55], [-5.6, -49], [-2.6, -48.4], [2.6, -48.4], [5.6, -49], [11.8, -55], [8.6, -45.6], [9.8, -42], [11.6, -38.6], [9.6, -35], [6.4, -31.6], [0, -30]], 1.2, BINK, 1.3)}
      <path d="M-10.2,-53 L-6.6,-48.4 M10.2,-53 L6.6,-48.4" stroke="${DEDGE}" stroke-width=".9"/>
      <path d="M-9.4,-41.6 Q-7.6,-37 -4.6,-34.4 M9.4,-41.6 Q7.6,-37 4.6,-34.4" stroke="${DEDGE}" stroke-width=".5" fill="none"/>
      <g class="mouth" opacity="0"><path d="M-3.4,-35.2 Q0,-30.4 3.4,-35.2 Q0,-33.6 -3.4,-35.2Z" fill="#000"/><path d="M-2.2,-35 l.5,1.4 .5,-1.3 M2.2,-35 l-.5,1.4 -.5,-1.3 M-1.5,-31.9 l.4,-1.1 .4,1.1 M1.5,-31.9 l-.4,-1.1 -.4,1.1" stroke="#E8E0D0" stroke-width=".45" fill="none"/></g>
      <g class="jaw"><path d="M-3.2,-35.4 Q0,-31.8 3.2,-35.4 Q0,-34 -3.2,-35.4Z" fill="#0B1016" stroke="${DEDGE}" stroke-width=".5"/></g>
      <g class="muz"><path d="M-3.8,-44 Q-4.8,-36.2 0,-35 Q4.8,-36.2 3.8,-44Z" fill="#0B1016" stroke="${DEDGE}" stroke-width=".55"/><ellipse cx="0" cy="-37.2" rx="1.9" ry="1.2" fill="#000"/><path d="M-1.4,-43 L0,-38.8 L1.4,-43" stroke="${DEDGE}" stroke-width=".5" fill="none"/></g>
      <g class="eyes">${DGLOW(-4, -43.8)}${DGLOW(4, -43.8)}</g>
      <path class="glint" d="M4,-48 l.6,3.9 3.9,.6 -3.9,.6 -.6,3.9 -.6,-3.9 -3.9,-.6 3.9,-.6z" fill="#FFF6DA" opacity="0"/>
    </g>`;
  // front on: shoulders wider than the hips, the chest pushed at you, the far hind legs set back (smaller, higher), a ruffed bib
  const mx = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const FR = {
    hleg: [[-6.4, -17], [-2.8, -17], [-2.6, -8], [-2.2, -4], [-1.4, -1.8], [-6.6, -1.8], [-6.4, -4], [-6.8, -8]],
    tail: [[-.6, -19], [3, -19], [3.8, -12], [3.2, -6.6], [1, -5], [-1, -7.4], [-1.4, -12]],
    // a V: heavy rounded shoulders, the ribcage narrowing hard to the brisket
    torso: [[-19, -37], [-15, -42], [-7, -44], [7, -44], [15, -42], [19, -37], [18.6, -31], [15.4, -25.4], [11, -20.6], [6, -17.4], [0, -16.4], [-6, -17.4], [-11, -20.6], [-15.4, -25.4], [-18.6, -31]],
    fleg: [[-15.4, -31], [-8.6, -31], [-6.6, -22], [-6.4, -12], [-6, -4.6], [-4.8, -2], [-4.2, 0], [-12.8, 0], [-12, -2], [-10.8, -4.6], [-11.2, -12], [-13, -21]],
    bib: [[-13.6, -42], [-7.4, -48.6], [0, -50], [7.4, -48.6], [13.6, -42], [11.6, -33], [6.4, -25], [0, -20.6], [-6.4, -25], [-11.6, -33]],
  };
  const dm = document.createElementNS(NS, 'g');
  dm.innerHTML = `
    <rect class="dmdim" x="-4000" y="-4000" width="9000" height="9000" fill="#02040A" opacity="0"/>
    <g class="dogman" opacity="0"><g style="filter:drop-shadow(0 0 .9px rgba(160,200,222,.75))">
      <g class="dside" opacity="0"><g class="dlean">
        <g transform="translate(13,-27.4)">${dleg('lg ff', 1, DFAR)}</g>
        <g class="dhq"><g transform="translate(-14,-28.2)">${dleg('lg fh', 0, DFAR)}</g>
          <g class="dtail">${dhair(lift4(DM.tail), 1.8, BINK, 1.7)}</g>
          ${dhair(lift4(DM.hind), 1.9, BINK, 1.6)}
          <g transform="translate(-14,-28.2)">${dleg('lg nh', 0, BINK, 1)}</g></g>
        <g class="dch">${dhair(lift4(DM.chest), 2, BINK, 1.6)}
          <g transform="translate(0,-4.4)"><path d="M15.6,-33.4 Q10.6,-27.4 11.8,-18.4" stroke="${DEDGE}" stroke-width=".55" fill="none"/>
          <path d="M-21,-27.8 Q-14,-31.8 -5,-30.6 Q3,-31.4 10.4,-34.2" stroke="${DMOON}" stroke-width=".8" fill="none" stroke-linecap="round"/></g>
          <g class="dneck"><g transform="translate(0,-4.4)">${dhair(DM.neck, 2.8, BINK, 1.3)}
            <g class="shead">
              <g class="sprof">${dhair(DM.ear2, .6, DFAR, 1.1, DEDGE)}
                <g class="sjaw">${dhair(DM.jaw, .5, BINK, 1.2)}<path d="M30,-37.6 l.5,1.1 .5,-1.1 M34.6,-37.8 l.5,1.1 .5,-1.1" stroke="#E8E0D0" stroke-width=".4" fill="none"/></g>
                ${dhair(DM.skull, .9, BINK, 1.2)}${dhair(DM.ear1, .6, BINK, 1.1)}
                <path d="M22.8,-52.4 L24.4,-46.4" stroke="${DEDGE}" stroke-width=".7"/>
                <circle cx="40.4" cy="-39.6" r="1.15" fill="#000"/><path d="M30,-37.9 L38.8,-38.3" stroke="${DEDGE}" stroke-width=".5"/>
                <g class="seye">${DGLOW(29.2, -42.2, .95)}</g>
                <g class="howl" opacity="0" fill="none" stroke="rgba(232,238,242,.7)" stroke-width="1.1" stroke-linecap="round"><path d="M44,-42 q4,4 0,8"/><path d="M49,-45 q6,7 0,14"/><path d="M54,-48 q8,10 0,20"/></g>
              </g>
              <g class="sface" opacity="0"><g transform="translate(28,-41.5) scale(.84) translate(0,40)">${dface('sf')}</g></g>
            </g>
          </g></g>
          <g transform="translate(13,-27.4)">${dleg('lg nf', 1, BINK, 1)}</g></g>
      </g></g>
      <g class="dfront" opacity="0">
        ${dhair(FR.hleg, .8, DFAR, 1.2)}${dhair(mx(FR.hleg), .8, DFAR, 1.2)}${dhair(FR.tail, 1.3, DFAR, 1.3)}
        ${dhair(FR.torso, 2, BINK, 1.5)}
        ${dhair(FR.fleg, 1, BINK, 1.25)}${dhair(mx(FR.fleg), 1, BINK, 1.25)}
        <path d="M-7.2,-21 Q-7,-12 -6.4,-4.6 M7.2,-21 Q7,-12 6.4,-4.6 M-18.2,-36 Q-17,-28 -12.6,-21.4 M18.2,-36 Q17,-28 12.6,-21.4" stroke="${DEDGE}" stroke-width=".55" fill="none"/>
        ${dhair(FR.bib, 2.4, BINK, 1.2)}
        <path d="M-18.4,-38.4 Q-14.6,-43 -7.4,-44.4 M18.4,-38.4 Q14.6,-43 7.4,-44.4" stroke="${DMOON}" stroke-width=".7" fill="none" stroke-linecap="round"/>
        <g class="qhead"><g transform="translate(0,-38) scale(1.14) translate(0,30)">${dface('qf')}</g></g>
      </g>
      <g class="eyesonly" opacity="0"><circle cx="27.8" cy="-46.4" r="3" fill="#FFB347" opacity=".25"/><circle cx="32.2" cy="-46.4" r="3" fill="#FFB347" opacity=".25"/><circle cx="27.8" cy="-46.4" r="1.3" fill="#FFC45E"/><circle cx="32.2" cy="-46.4" r="1.3" fill="#FFC45E"/></g>
    </g></g>
    <g class="radio" opacity="0">
      <rect x="0" y="0" width="300" height="46" rx="10" fill="rgba(20,14,10,.92)" stroke="#B4745A" stroke-width="1"/>
      <rect x="12" y="10" width="60" height="26" rx="4" fill="#2A1E16" stroke="#6A4A36"/>
      <g stroke="#E8C38A" stroke-width=".8">${Array.from({ length: 11 }, (_, i) => `<line x1="${16 + i * 5}" y1="${i % 2 ? 30 : 27}" x2="${16 + i * 5}" y2="33"/>`).join('')}</g>
      <line class="needle" x1="40" y1="13" x2="40" y2="34" stroke="#FF6A3D" stroke-width="1.6"/>
      <text x="84" y="20" font-family="'Archivo Expanded',sans-serif" font-weight="700" font-size="11" fill="#F4E6CC">&#9835; &#8220;The Legend&#8221;</text>
      <text x="84" y="35" font-family="'JetBrains Mono',monospace" font-size="8" letter-spacing=".8" fill="#C9A57A">WTCM-FM &#183; TRAVERSE CITY &#183; APR 1, 1987</text>
    </g>`;
  svg.append(dm);
  const $ = (s) => dm.querySelector(s);
  const dogman = $('.dogman'), dside = $('.dside'), dlean = $('.dlean'), dhq = $('.dhq'), dch = $('.dch'), dneck = $('.dneck'), dtail = $('.dtail');
  const shead = $('.shead'), sprof = $('.sprof'), sface = $('.sface'), sjaw = $('.sjaw'), howl = $('.howl');
  const dfront = $('.dfront'), qhead = $('.qhead'), eyesonly = $('.eyesonly');
  const qjaw = $('.qf .jaw'), qmouth = $('.qf .mouth'), qeyes = $('.qf .eyes'), qglint = $('.qf .glint');
  const qglow = [...dm.querySelectorAll('.qf .glow')], qcore = [...dm.querySelectorAll('.qf .core')];
  const dmdim = $('.dmdim'), radio = $('.radio'), needle = $('.needle');
  // the gait: a lateral-sequence walk (hind, fore, hind, fore on alternate sides), or a rotary gallop with the spine bunching and
  // stretching. Hip and shoulder swing the leg; on the swing the elbow/stifle fold and the wrist/hock tuck the paw up under him.
  const DL = { nh: [$('.nh'), 0], nf: [$('.nf'), 0.25], fh: [$('.fh'), 0.5], ff: [$('.ff'), 0.75] };
  DL.nh.push(DL.nh[0].querySelector('.lo'), DL.nh[0].querySelector('.mt')); DL.fh.push(DL.fh[0].querySelector('.lo'), DL.fh[0].querySelector('.mt'));
  DL.nf.push(DL.nf[0].querySelector('.lo')); DL.ff.push(DL.ff[0].querySelector('.lo'));
  const LOPE = { nh: 0, fh: 0.12, nf: 0.5, ff: 0.62 };
  const dgait = (ph, A, lope) => {
    for (const c in DL) {
      const [g, o, lo, mt] = DL[c], a = (ph + (lope ? LOPE[c] : o)) * Math.PI * 2, sw = A ? Math.max(0, -Math.cos(a)) : 0;
      if (c[1] === 'f') { g.setAttribute('transform', `rotate(${(A * 1.05 * Math.sin(a) - 2).toFixed(1)})`); lo.setAttribute('transform', `translate(0,11) rotate(${((lope ? 84 : 58) * sw).toFixed(1)})`); }
      else { g.setAttribute('transform', `rotate(${(A * Math.sin(a) + 3).toFixed(1)})`); lo.setAttribute('transform', `translate(3.6,10.6) rotate(${((lope ? 34 : 24) * sw).toFixed(1)})`);
        mt.setAttribute('transform', `translate(-4.4,9.4) rotate(${(-(lope ? 52 : 34) * sw).toFixed(1)})`); }
    }
    const b = ph * Math.PI * 2, flex = lope ? 7 : 1.6;
    dhq.setAttribute('transform', `rotate(${(-flex * Math.sin(b + 0.6)).toFixed(2)} -1 -29.4)`);
    dch.setAttribute('transform', `rotate(${(flex * 0.8 * Math.sin(b + 0.6)).toFixed(2)} -1 -29.4)`);
    return A ? (lope ? 3 * Math.max(0, Math.sin(b + 1.1)) : 0.7 * Math.abs(Math.sin(b * 2))) : 0; // body lift
  };
  const playDogman = (done) => {
    size();
    const phone = W < 700, ds = (phone ? 1.05 : 1.2) * scale;
    const x0 = W * (phone ? 0.13 : 0.22), xs = phone ? -14 * ds : W * 0.03; // phones: the sign covers the middle, so he keeps to the left edge
    const T = { eyes: 1600, walk: 4000, look: 500, hold: 700, turn: 500, eyesOn: 900, howl: 2100, back: 350, lope: 1500 };
    const t1 = T.eyes, t2 = t1 + T.walk, t3 = t2 + T.look, t4 = t3 + T.hold, t5 = t4 + T.turn, t6 = t5 + T.eyesOn, t7 = t6 + T.howl, t8 = t7 + T.back, t9 = t8 + T.lope;
    const rStart = t6 + 200, rEnd = t9, end = t9 + 400;
    const cycles = Math.max(2.5, Math.abs(x0 - xs) / (30 * ds)); // stride length sets the step rate, so the paws don't skate
    const iceAtStart = !!(window.__iceSolid && window.__iceSolid());
    const t0 = performance.now(); let quaked = false;
    dogman.setAttribute('opacity', 1); dside.setAttribute('opacity', 0); dfront.setAttribute('opacity', 0); sface.setAttribute('opacity', 0); sprof.setAttribute('opacity', 1);
    radio.setAttribute('transform', `translate(${phone ? 12 : 24},${phone ? Math.round(horizon + 70) : 84}) scale(${phone ? 0.95 : 1.1})`);
    const finish = () => { [dogman, dside, dfront, radio, dmdim, eyesonly].forEach((el) => el.setAttribute('opacity', 0)); qeyes.style.filter = ''; };
    let aborted = false;
    curAbort = () => { aborted = true; finish(); curAbort = null; };
    const step = (now) => {
      if (aborted) return;
      const k = now - t0; let x = x0, dir = 1, ph = 0, A = 0, lope = false;
      dmdim.setAttribute('opacity', (k < t7 ? Math.min(0.35, k / 2000) + (k > t6 ? 0.1 * Math.min(1, (k - t6) / 400) : 0) : Math.max(0, 0.45 - (k - t7) / 1400)).toFixed(2));
      // 1. two eyes on the dark shore, blinking
      const blink = Math.floor(k / 120) % 9 === 4 || Math.floor(k / 120) % 9 === 6;
      eyesonly.setAttribute('opacity', (k < t1 ? (blink ? 0 : Math.min(1, k / 500)) : Math.max(0, 1 - (k - t1) / 300)).toFixed(2));
      // 2. he walks in like a dog: lateral sequence, joints folding, the body rising and settling, the tail swaying
      if (k < t2) { const c = Math.max(0, (k - t1) / T.walk); x = lerp(xs, x0, c); ph = c * cycles; A = c > 0 && c < 1 ? 22 : 0; }
      // 3. he stops and his head turns to you
      const lk = (k - t2) / T.look, lookP = lk <= 0 ? 0 : Math.min(1, lk), howlSide = k > t6 && k < t7;
      const faceOn = k < t6 && lookP >= 0.5;
      sprof.setAttribute('opacity', faceOn ? 0 : 1); sface.setAttribute('opacity', faceOn ? 1 : 0);
      sprof.setAttribute('transform', faceOn || k > t6 ? '' : `translate(27 0) scale(${Math.max(0.3, 1 - lookP * 1.4).toFixed(3)},1) translate(-27 0)`);
      sface.setAttribute('transform', `translate(27 0) scale(${Math.max(0.3, lookP * 1.4 - 0.4).toFixed(3)},1) translate(-27 0)`);
      // 4. then the whole body comes round: on all fours, facing the camera. 6. for the howl he turns side-on again, head thrown back
      const tk = (k - t4) / T.turn, hs = (k - t6) / 260, bk = (k - t7) / T.back;
      let sideW = 1, frontW = 0;
      if (tk > 0) { sideW = tk < 0.5 ? 1 - tk * 0.9 : 0; frontW = tk >= 0.5 ? 0.55 + 0.45 * Math.min(1, tk) : 0; }
      if (hs > 0) { sideW = hs >= 0.5 ? 0.55 + 0.45 * Math.min(1, hs) : 0; frontW = hs < 0.5 ? 1 - hs * 0.9 : 0; }
      if (k > t7) { sideW = bk < 0.5 ? 1 - bk * 0.9 : 0.55 + 0.45 * Math.min(1, bk); dir = bk < 0.5 ? 1 : -1; frontW = 0; }
      if (k > t1 - 250) dside.setAttribute('opacity', sideW > 0 ? Math.min(1, (k - t1 + 250) / 500).toFixed(2) : 0);
      dside.setAttribute('transform', `scale(${Math.max(0.04, sideW).toFixed(3)},1)`);
      dfront.setAttribute('opacity', frontW > 0 ? 1 : 0);
      dfront.setAttribute('transform', `scale(${Math.max(0.04, frontW).toFixed(3)},1)`);
      // 5. the eyes light up
      const ek = Math.min(1, Math.max(0, (k - t5) / 500));
      qglow.forEach((c) => { c.setAttribute('r', (2 + 0.7 * ek + (ek === 1 ? 0.25 * Math.sin(k / 140) : 0)).toFixed(2)); c.setAttribute('opacity', (0.18 + 0.3 * ek).toFixed(2)); });
      qcore.forEach((c) => { c.setAttribute('r', (1.05 + 0.2 * ek).toFixed(2)); c.setAttribute('fill', ek > 0.5 ? '#FFE08A' : '#FFC45E'); });
      qeyes.style.filter = ek > 0 ? `drop-shadow(0 0 ${(1 + 1.6 * ek).toFixed(1)}px #FFB347)` : '';
      const snarl = ek > 0.6 && k < t6; qmouth.setAttribute('opacity', snarl ? 1 : 0); qjaw.setAttribute('opacity', snarl ? 0 : 1); // the lip curls back
      const gk = (k - t5 - 550) / 380;
      qglint.setAttribute('opacity', gk > 0 && gk < 1 ? Math.sin(gk * Math.PI).toFixed(2) : 0);
      qglint.setAttribute('transform', `translate(3.8 -44) rotate(${(gk * 90).toFixed(0)}) scale(${(gk > 0 && gk < 1 ? 0.4 + Math.sin(gk * Math.PI) * 0.6 : 0).toFixed(2)}) translate(-3.8 44)`);
      // 6. the howl: forelegs braced, the neck arched up, the head thrown back, the jaw open
      const hk = (k - t6 - 200) / (T.howl - 200), howling = hk > 0 && hk < 1;
      const up = howling ? Math.sin(Math.min(1, hk * 3) * Math.PI / 2) * (hk > 0.85 ? (1 - hk) / 0.15 : 1) : 0;
      dlean.setAttribute('transform', `rotate(${(-7 * up).toFixed(2)} -14 0)`);
      dneck.setAttribute('transform', `rotate(${(-28 * up).toFixed(1)} 14 -34.4)`);
      shead.setAttribute('transform', `rotate(${(-40 * up + (A ? Math.sin(ph * Math.PI * 4) * 2.5 : 0)).toFixed(1)} 23 -40)`);
      sjaw.setAttribute('transform', `rotate(${(30 * up + (A ? 4 + 3 * Math.sin(k / 160) : 0)).toFixed(1)} 25.4 -37)`);
      howl.setAttribute('opacity', howling ? (up * (0.5 + 0.5 * Math.sin(k / 70))).toFixed(2) : 0);
      howl.setAttribute('transform', `translate(${(((k / 22) % 6)).toFixed(1)},0)`);
      if (howling && hk > 0.15 && !quaked) { quaked = true; quake(300); }
      qhead.removeAttribute('transform');
      // 7. he wheels round and lopes off into the dark, faster
      if (k > t8) { const r = Math.min(1, (k - t8) / T.lope); x = x0 - r * r * (x0 + 90 * ds); ph = (k - t8) / 420; A = 34; lope = true;
        dogman.setAttribute('opacity', (r > 0.85 ? (1 - r) / 0.15 : 1).toFixed(2)); }
      const lift = dgait(ph, A, lope);
      dlean.setAttribute('transform', `translate(0,${(-lift).toFixed(2)}) rotate(${(-7 * up).toFixed(2)} -14 0)`);
      dtail.setAttribute('transform', `rotate(${(Math.sin(k / (lope ? 90 : 300)) * 10 + (lope ? -14 : 0) + up * 12).toFixed(1)} -21 -29.4)`);
      dogman.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - 1).toFixed(1)}) scale(${(dir * ds).toFixed(3)},${ds.toFixed(3)})`);
      // 8. and somewhere, a Traverse City radio station plays the song
      const rk = k - rStart;
      radio.setAttribute('opacity', 0 && (rk < 0 ? 0 : rk < 400 ? rk / 400 : k > rEnd ? Math.max(0, 1 - (k - rEnd) / 400) : 1).toFixed(2));
      needle.setAttribute('x1', (20 + 40 * Math.min(1, Math.max(0, rk / 1200))).toFixed(1)); needle.setAttribute('x2', needle.getAttribute('x1'));
      // the lake thaws under him: a yelp, and through he goes
      if (iceAtStart && k > t1 && k < t8 + 300 && window.__iceThawed && window.__iceThawed() && window.__iceFall) {
        window.__iceFall({ el: dogman, x: x + 4 * ds * dir, y: horizon - 1, s: ds, w: 22 * ds, kind: 'dogman', dir, done: () => { finish(); done(); } });
        dogman.setAttribute('opacity', 0); eyesonly.setAttribute('opacity', 0); curAbort = null; return; }
      if (k < end) requestAnimationFrame(step);
      else { finish(); curAbort = null; done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the Abominable Snowman: only in a whiteout (coldest, windiest, snowiest)
  // Unlike everyone else he is pale, with a cold blue rim, so he reads against the blizzard. Front-on, so he can come at you.
  // Local units, feet on y=0, about 76 tall; the arms pivot at the shoulders, the legs lift and bend at the knee.
  const YF = '#D8E1E7', YFAR = '#BAC6CF', YFACE = '#8796A3';
  const yhair = (pts, amp, fill = YF, step = 1.7) => `<path d="${shagHang(pts, step, amp)}" fill="${fill}"/>`;
  const YARM = [[-4.6, -3], [4.4, -3], [4.6, 10], [3.6, 22], [5, 30], [1.2, 34], [-3.6, 33], [-4.6, 26], [-4.2, 12]];
  const YLEG = [[-6, -2], [6, -2], [6.4, 10], [5.2, 22], [8.4, 27.6], [8.6, 30], [-6.4, 30], [-6, 22], [-6.8, 10]];
  const ysvg = document.createElementNS(NS, 'svg');
  ysvg.setAttribute('class', 'yeti-layer'); ysvg.setAttribute('aria-hidden', 'true');
  ysvg.innerHTML = `
    <g class="yeti" opacity="0"><g class="ybody" style="filter:drop-shadow(0 0 1.2px rgba(150,205,255,.95)) drop-shadow(0 0 7px rgba(120,180,255,.35))">
      <g class="yleg l" transform="translate(-10,-30)">${yhair(YLEG.map(([x, y]) => [-x, y]).reverse(), 2, YFAR)}<path d="M-1,6 l-.8,4 M2,14 l-.6,3.6" stroke="#9EADBA" stroke-width=".8" stroke-linecap="round"/></g>
      <g class="yleg r" transform="translate(10,-30)">${yhair(YLEG, 2, YFAR)}<path d="M1,6 l.8,4 M-2,14 l.6,3.6" stroke="#9EADBA" stroke-width=".8" stroke-linecap="round"/></g>
      <g class="ytorso">
        ${yhair([[-21, -55], [-14, -62], [-6, -64], [6, -64], [14, -62], [21, -55], [22, -45], [19, -35], [14, -28], [6, -25.6], [-6, -25.6], [-14, -28], [-19, -35], [-22, -45]], 3.2, YF, 1.8)}
        <ellipse cx="0" cy="-40" rx="11.5" ry="12.5" fill="#9FB0BE" opacity=".32"/>
        <path d="M-14,-47 l-1.4,4.2 M-8.6,-36 l-1,3.8 M8.6,-36 l1,3.8 M14,-47 l1.4,4.2 M-4,-31 l-.6,3.2 M4,-31 l.6,3.2 M-3,-50 l-.4,3 M3,-50 l.4,3" stroke="#A3B2BF" stroke-width=".8" stroke-linecap="round"/>
        <g class="yhead">
          ${yhair([[-15, -58], [-11, -66], [-6.4, -71], [0, -77], [6.4, -71], [11, -66], [15, -58], [10, -53], [0, -50], [-10, -53]], 3.4, YF, 1.6)}
          <path d="M-6,-66.4 Q0,-69 6,-66.4 L5.6,-58.6 Q0,-55 -5.6,-58.6Z" fill="${YFACE}"/>
          <path d="M-5.6,-65.4 Q-2.8,-67 0,-65.4 Q2.8,-67 5.6,-65.4" fill="none" stroke="#6C7C89" stroke-width=".9"/>
          <g class="ymouth"><ellipse cx="0" cy="-59.6" rx="2.6" ry=".5" fill="#26313B"/><path class="yfangs" d="M-1.8,-60.2 l.5,1.4 .5,-1.4 M1.8,-60.2 l-.5,1.4 -.5,-1.4" stroke="#F4F8FA" stroke-width=".5" fill="none" opacity="0"/></g>
          <g class="yeyes"><circle cx="-2.7" cy="-63.4" r="2.6" fill="#7FDFFF" opacity=".35"/><circle cx="2.7" cy="-63.4" r="2.6" fill="#7FDFFF" opacity=".35"/>
            <circle cx="-2.7" cy="-63.4" r="1.05" fill="#E6FBFF"/><circle cx="2.7" cy="-63.4" r="1.05" fill="#E6FBFF"/></g>
        </g>
      </g>
      <g class="yarm l" transform="translate(-19,-54)">${yhair(YARM.map(([x, y]) => [-x, y]).reverse(), 2.4, YF)}<ellipse cx="-.6" cy="31.4" rx="3.2" ry="3.6" fill="${YFACE}"/></g>
      <g class="yarm r" transform="translate(19,-54)">${yhair(YARM, 2.4, YF)}<ellipse cx=".6" cy="31.4" rx="3.2" ry="3.6" fill="${YFACE}"/><g class="yhold" opacity="0">${yhair([[-6, 29], [0, 26], [7, 28], [8, 35], [0, 38.4], [-6, 35]], 1.6, '#F4F8FA', 1.4)}</g></g>
    </g></g>
    <g class="yeyesonly" opacity="0" style="filter:drop-shadow(0 0 3px #8FE6FF)"><circle cx="-3" cy="0" r="1.3" fill="#E6FBFF"/><circle cx="3" cy="0" r="1.3" fill="#E6FBFF"/></g>
    <g class="ybreath"></g>
    <g class="yball" opacity="0">${yhair([[-6, -2], [-4, -5.4], [0, -6.4], [4, -5.4], [6, -2], [6, 2], [4, 5.4], [0, 6.4], [-4, 5.4], [-6, 2]], 0.8, '#F4F8FA', 1.4)}<path d="M-3,-2 Q0,-4 3,-1.6 M-2.6,2.4 Q.6,1 3.2,2.8" stroke="#C4D2DC" stroke-width=".5" fill="none"/></g>
    <g class="ysplat" opacity="0"></g>`;
  hero.append(ysvg);
  const Y = (s) => ysvg.querySelector(s);
  const yeti = Y('.yeti'), ytorso = Y('.ytorso'), yhead = Y('.yhead'), yfangs = Y('.yfangs'), ymouthE = Y('.ymouth ellipse'), yeyes = Y('.yeyes'), yeyesonly = Y('.yeyesonly');
  const yarmL = Y('.yarm.l'), yarmR = Y('.yarm.r'), ylegL = Y('.yleg.l'), ylegR = Y('.yleg.r'), yhold = Y('.yhold'), yball = Y('.yball'), ysplat = Y('.ysplat'), ybreath = Y('.ybreath');
  // the splat on the lens: a lumpy white star of snow with a few flung drops, drawn fresh each time
  const splatSVG = (R) => {
    let lobes = `<circle r="${(R * 0.62).toFixed(1)}"/>`;
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + Math.random() * 0.3, d = R * (0.5 + Math.random() * 0.32), r = R * (0.2 + Math.random() * 0.2);
      lobes += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d * 0.88).toFixed(1)}" r="${r.toFixed(1)}"/>`; }
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, d = R * (1.15 + Math.random() * 0.6);
      lobes += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d * 0.9).toFixed(1)}" r="${(R * (0.04 + Math.random() * 0.07)).toFixed(1)}"/>`; }
    return `<g fill="rgba(244,249,252,.97)" style="filter:drop-shadow(0 3px 8px rgba(30,50,70,.4))">${lobes}</g>
      <g fill="rgba(206,222,234,.55)"><circle cx="${(R * 0.12).toFixed(1)}" cy="${(R * 0.16).toFixed(1)}" r="${(R * 0.42).toFixed(1)}"/></g>
      <ellipse cx="${(-R * 0.22).toFixed(1)}" cy="${(-R * 0.26).toFixed(1)}" rx="${(R * 0.26).toFixed(1)}" ry="${(R * 0.14).toFixed(1)}" fill="#fff" opacity=".9"/>
      <g class="drips" fill="rgba(244,249,252,.92)">${[-0.42, -0.05, 0.3].map((dx, i) => `<rect x="${(dx * R).toFixed(1)}" y="${(R * 0.5).toFixed(1)}" width="${(R * (0.1 + i * 0.02)).toFixed(1)}" height="${(R * (0.45 + i * 0.12)).toFixed(1)}" rx="${(R * 0.05).toFixed(1)}"/>`).join('')}</g>`;
  };
  const puffs = []; // frost breath and blasted snow
  const ypuff = (x, y, vx, vy, r, life, fill = 'rgba(232,244,252,.75)') => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('fill', fill); ybreath.append(c); puffs.push({ c, x, y, vx, vy, r, life, age: 0 }); };
  const playYeti = (done) => {
    size(); ysvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const phone = W < 700, s = (phone ? 1.15 : 1.4) * scale;
    const nr = hero.querySelector('.orbit .neon') ? hero.querySelector('.orbit .neon').getBoundingClientRect() : null, hr = hero.getBoundingClientRect();
    const signL = nr ? nr.left - hr.left : W * 0.4, signT = nr ? nr.top - hr.top : horizon - 120, signW = nr ? nr.width : 200;
    const stopX = phone ? Math.max(30 * s, signL + signW * 0.12 - 4 * s) : signL - 20 * s, stopY = horizon + H * (phone ? 0.09 : 0.12);
    const farX = phone ? W * 0.12 : W * 0.16, farY = horizon + 2, farS = 0.22;
    const pileX = signL + signW * 0.2, pileY = signT + signW * 0.26; // the top of the panel, where the snow sits
    const T = { eyes: 1500, walk: 4200, beat: 1400, roar: 1500, scoop: 1000, pack: 700, wind: 450, fly: 750, back: 2300 };
    const t1 = T.eyes, t2 = t1 + T.walk, t3 = t2 + T.beat, t4 = t3 + T.roar, t5 = t4 + T.scoop, t6 = t5 + T.pack, t7 = t6 + T.wind, t8 = t7 + T.fly, end = t8 + T.back + 1600;
    const iceAtStart = !!(window.__iceSolid && window.__iceSolid());
    const t0 = performance.now(); let roared = false, scooped = false, splatAt = 0, aborted = false, last = t0;
    const finishY = () => { [yeti, yeyesonly, yball, ysplat].forEach((el) => el.setAttribute('opacity', 0)); puffs.splice(0).forEach((p) => p.c.remove()); orbitEl && orbitEl.classList.remove('disturbed'); };
    curAbort = () => { aborted = true; finishY(); curAbort = null; };
    ysplat.innerHTML = ''; yhold.setAttribute('opacity', 0);
    const arm = (g, side, a, ext = 0) => g.setAttribute('transform', `translate(${19 * side},-54) rotate(${(a * side).toFixed(1)}) scale(1,${(1 + ext).toFixed(3)})`);
    const step = (now) => {
      if (aborted) return;
      const k = now - t0, dt = Math.min(0.05, (now - last) / 1000); last = now;
      let x = farX, y = farY, sc = s * farS, walkP = 0, aL = 8, aR = 8, roarK = 0, bodyO = 0, dir = 1;
      // 1. two icy eyes, far out on the lake, in the whiteout
      yeyesonly.setAttribute('opacity', k < t1 + 300 ? ((Math.floor(k / 140) % 10 === 6 ? 0 : 1) * Math.min(1, k / 400) * (k > t1 ? 1 - (k - t1) / 300 : 1)).toFixed(2) : 0);
      yeyesonly.setAttribute('transform', `translate(${farX.toFixed(1)},${(farY - 64 * s * farS).toFixed(1)}) scale(${(s * farS * 1.4).toFixed(3)})`);
      // 2. he lumbers out of the snow toward the sign, swaying, getting bigger
      if (k > t1 && k < t2) { const u = (k - t1) / T.walk, e = 1 - Math.pow(1 - u, 1.6);
        x = lerp(farX, stopX, e); y = lerp(farY, stopY, e); sc = s * lerp(farS, 1, e); walkP = (k - t1) / 1300; bodyO = Math.min(1, u * 3); }
      else if (k >= t2 && k < t8 + 300) { x = stopX; y = stopY; sc = s; bodyO = 1; }
      else if (k >= t8 + 300) { const u = Math.min(1, (k - t8 - 300) / T.back); x = lerp(stopX, farX * 0.6, u); y = lerp(stopY, farY, u); sc = s * lerp(1, farS, u); walkP = (k - t8) / 1300; bodyO = 1 - u; dir = -1; }
      const sway = walkP ? Math.sin(walkP * Math.PI * 2) : 0, lift = (i) => walkP ? Math.max(0, Math.sin(walkP * Math.PI * 2 + i * Math.PI)) : 0;
      ylegL.setAttribute('transform', `translate(-10,${(-30 - lift(0) * 5).toFixed(1)}) scale(1,${(1 - lift(0) * 0.12).toFixed(3)})`);
      ylegR.setAttribute('transform', `translate(10,${(-30 - lift(1) * 5).toFixed(1)}) scale(1,${(1 - lift(1) * 0.12).toFixed(3)})`);
      if (walkP) { aL = 10 + sway * 14; aR = 10 - sway * 14; }
      // 3. he beats his chest
      if (k > t2 && k < t3) { const b = (k - t2) / 150, hit = Math.abs(Math.sin(b * Math.PI / 2));
        aL = Math.floor(b) % 2 ? 50 + hit * 26 : 46; aR = Math.floor(b) % 2 ? 46 : 50 + hit * 26; }
      // 4. the roar: head back, jaw wide, frost breath, the screen shakes, the sign flickers, snow blasts off it
      if (k > t3 && k < t4) { const r = (k - t3) / T.roar; roarK = Math.sin(Math.min(1, r * 4) * Math.PI / 2) * (r > 0.85 ? (1 - r) / 0.15 : 1); aL = aR = 8 - 50 * roarK;
        if (!roared && r > 0.12) { roared = true; quake(600); if (orbitEl) { orbitEl.classList.remove('disturbed'); void orbitEl.offsetWidth; orbitEl.classList.add('disturbed'); setTimeout(() => orbitEl.classList.remove('disturbed'), 2400); }
          if (window.__snowpile) window.__snowpile.set(window.__snowpile.depth * 0.35);
          for (let i = 0; i < 26; i++) ypuff(pileX + Math.random() * signW * 0.7, pileY + Math.random() * 6, (Math.random() - 0.2) * 120, -40 - Math.random() * 80, 1.5 + Math.random() * 2.5, 1.2, 'rgba(244,249,252,.95)'); }
        if (Math.random() < 0.8) { const mx = x, my = y - 60 * sc; ypuff(mx, my, (Math.random() - 0.5) * 30, -10 - Math.random() * 30, 2 + Math.random() * 3 * sc, 1.4); } }
      ymouthE.setAttribute('ry', (0.5 + 3 * roarK).toFixed(2)); yfangs.setAttribute('opacity', roarK > 0.3 ? 1 : 0);
      yhead.setAttribute('transform', `rotate(${(sway * 2).toFixed(1)} 0 -54) translate(0,${(-2 * roarK).toFixed(2)})`);
      yeyes.style.filter = `drop-shadow(0 0 ${(2 + 3 * roarK).toFixed(1)}px #8FE6FF)`;
      // 5. he scoops an armful of snow off the sign, packs it, winds up and lobs it at you
      if (k > t4 && k < t5) { const u = (k - t4) / T.scoop; aL = 8; aR = u < 0.6 ? -140 * Math.sin(u / 0.6 * Math.PI / 2) : lerp(-140, 60, (u - 0.6) / 0.4);
        if (!scooped && u > 0.55) { scooped = true; if (window.__snowpile) window.__snowpile.set(0); yhold.setAttribute('opacity', 1);
          for (let i = 0; i < 10; i++) ypuff(pileX + Math.random() * signW * 0.4, pileY, (Math.random() - 0.6) * 60, -20 - Math.random() * 30, 1.5 + Math.random() * 2, 0.8, 'rgba(244,249,252,.95)'); } }
      if (k > t5 && k < t6) { const p = Math.sin((k - t5) / 90); aL = 62 + p * 6; aR = 62 - p * 6; }
      if (k > t6 && k < t7) { const u = (k - t6) / T.wind; aR = lerp(62, -175, u); aL = 20; }
      if (k > t7 && k < t7 + 250) { const u = (k - t7) / 250; aR = lerp(-175, 70, u); aL = 20; }
      yhold.setAttribute('opacity', k > t4 + T.scoop * 0.55 && k < t7 ? 1 : 0);
      arm(yarmL, -1, aL); arm(yarmR, 1, aR);
      ytorso.setAttribute('transform', `rotate(${(sway * 3 + (k > t6 && k < t7 + 250 ? -6 : 0)).toFixed(1)} 0 -28)`);
      yeti.setAttribute('opacity', bodyO.toFixed(2));
      yeti.setAttribute('transform', `translate(${x.toFixed(1)},${(y - Math.abs(sway) * 1.2 * sc).toFixed(1)}) scale(${(sc * dir).toFixed(3)},${sc.toFixed(3)})`);
      // 6. the snowball comes at the camera, and SPLAT
      const tgX = W * (phone ? 0.5 : 0.56), tgY = H * (phone ? 0.42 : 0.4);
      if (k > t7 && k < t8) { const u = (k - t7) / T.fly, ux = u * u;
        const bx = lerp(x + 20 * s, tgX, ux), by = lerp(y - 80 * s, tgY, ux) - Math.sin(u * Math.PI) * 40 * s;
        yball.setAttribute('opacity', 1); yball.setAttribute('transform', `translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${(u * 540).toFixed(0)}) scale(${(s * 0.9 * (1 + 14 * Math.pow(u, 3))).toFixed(3)})`); }
      else yball.setAttribute('opacity', 0);
      if (k >= t8 && !splatAt) { splatAt = now; ysplat.innerHTML = splatSVG(Math.min(W, H) * (phone ? 0.3 : 0.24)); quake(200); }
      if (splatAt) { const u = (now - splatAt) / 3200;
        ysplat.setAttribute('opacity', (u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45)).toFixed(2));
        ysplat.setAttribute('transform', `translate(${tgX.toFixed(1)},${(tgY + Math.pow(Math.max(0, u - 0.12), 1.5) * H * 0.22).toFixed(1)}) scale(1,${(1 + Math.max(0, u - 0.12) * 0.25).toFixed(3)})`); }
      // breath and snow particles
      for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.age += dt; if (p.age > p.life) { p.c.remove(); puffs.splice(i, 1); continue; }
        p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.c.setAttribute('cx', p.x.toFixed(1)); p.c.setAttribute('cy', p.y.toFixed(1));
        p.c.setAttribute('r', (p.r * (1 + p.age)).toFixed(1)); p.c.setAttribute('opacity', (1 - p.age / p.life).toFixed(2)); }
      // the lake thaws under him (somebody nudged the slider): even a yeti goes through
      if (iceAtStart && k > t1 && k < t8 && window.__iceThawed && window.__iceThawed() && window.__iceFall) {
        window.__iceFall({ el: yeti, x, y, s: sc, w: 22 * sc, kind: 'yeti', dir, done: () => { finishY(); done(); } });
        yeti.setAttribute('opacity', 0); yball.setAttribute('opacity', 0); curAbort = null; return; }
      if (k < end) requestAnimationFrame(step); else { finishY(); curAbort = null; done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the show: a random act first, then whatever you tap for, and on its own when idle
  let busy = false, gen = 0, lastEnd = performance.now();
  const santa = () => !!(window.__holiday && window.__holiday.busy); // holidays.js: Santa's flyover has the stage
  const run = (fn) => {
    if (busy || window.__tornado || santa()) return false; // nothing starts while the twister (or Santa) is on stage
    busy = true; const g = ++gen;
    fn(() => { if (g !== gen) return; busy = false; lastEnd = performance.now(); });
    return true;
  };
  const ufoAct = (done) => { play(); const wait = () => (playing ? setTimeout(wait, 300) : done()); setTimeout(wait, 300); };
  const ACTS = [playDino, playBigfoot, playTriangle, ufoAct, playDogman];
  // weather first: a ship can't sail a frozen lake
  const allowed = (act) => act !== playTriangle || !(window.__wx && window.__wx.ice > 0.25);
  let next = 0;
  const pick = () => { for (let i = 0; i < ACTS.length; i++) { const a = ACTS[next]; next = (next + 1) % ACTS.length; if (allowed(a)) return a; } return playBigfoot; };
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  const when = (ms, fn) => setTimeout(function go() { if (!heroVisible() || busy || window.__tornado || santa()) { setTimeout(go, 1000); return; } fn(); }, ms);
  next = Math.floor(Math.random() * ACTS.length);
  when(600, () => run(pick())); // a random act opens the show on every load
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  // a tap during Santa's flight waits for him to land (the watcher below plays it), rather than being lost
  let tapped = false;
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', () => { if (busy) return; if (santa()) tapped = true; else run(pick()); }); }
  // idle auto-play: 30 s after the last act ends, the next one in the rotation plays by itself while the hero is on screen.
  // Tinkering with the sky sliders counts as watching, even if the panel pushes the hero partly off screen.
  const IDLE = 30000;
  let tinker = -1e9;
  document.querySelectorAll('#sk-h,#sk-t,#sk-p,#sk-w').forEach((r) => r.addEventListener('input', () => { tinker = performance.now(); }));
  // the yeti comes out only in a whiteout: temperature at the bottom, wind and snow at the top (with the tornado's slack)
  const slider = (id) => { const r = document.getElementById(id); return r ? +r.value : NaN; };
  let yetiDone = false, wasSanta = false;
  setInterval(() => {
    const now = performance.now(), watching = !document.hidden && (heroVisible() || now - tinker < 30000);
    // Santa's flight counts as an act: the idle clock restarts when he lands
    if (santa()) { wasSanta = true; lastEnd = now; return; }
    if (wasSanta) { wasSanta = false; lastEnd = now; }
    if (tapped) { tapped = false; if (!busy && !window.__tornado) { run(pick()); return; } }
    const yetiOn = typeof window.__tempF === 'number' && window.__tempF <= -8 && slider('sk-w') >= 42 && slider('sk-p') >= 95;
    window.__yeti = yetiOn;
    if (!yetiOn) yetiDone = false;
    else if (!yetiDone && !busy && !window.__tornado && watching && now - lastEnd > 4000) { if (run(playYeti)) yetiDone = true; return; } // a breath after the last act
    if (!busy && !window.__tornado && watching && now - lastEnd > IDLE) run(pick());
  }, 1000);
  // the tornado ends whatever is on stage
  const abort = () => { if (curAbort) curAbort(); curAbort = null; ++gen; busy = false; playing = false; hide(); big.setAttribute('opacity', 0);
    snapStop(); prints.replaceChildren(); embers.replaceChildren(); puffs.splice(0).forEach((p) => p.c.remove()); ysplat.replaceChildren(); ysplat.setAttribute('opacity', 0);
    lastEnd = performance.now(); };
  window.__acts = { dogman: () => run(playDogman), ufo: () => run(ufoAct), dino: () => run(playDino), comet: () => run(playDino), triangle: () => run(playTriangle), ship: () => run(playTriangle), bigfoot: () => run(playBigfoot), yeti: () => run(playYeti), abort };
})();
