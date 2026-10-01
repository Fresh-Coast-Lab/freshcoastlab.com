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
    let hatT = null, hx = 0, hy = 0;
    man.style.opacity = 1; ship.style.opacity = 1; mhat.setAttribute('opacity', 1); fhat.setAttribute('opacity', 0);
    const step = (now) => {
      const t = now - t0; let k = t;
      // 1. he walks in along the far shore: arms swinging against the legs, knees bending on the swing
      const walkT = Math.min(1, k / T.walk), mx = lerp(startX, stopX, walkT), ph = walkT * cycles * Math.PI * 2, walking = walkT < 1;
      ['l1', 'l2'].forEach((c, i) => { const p = ph + i * Math.PI;
        pose(c, walking ? 24 * Math.sin(p) : 0, walking ? 5 + 34 * Math.max(0, -Math.cos(p)) : 3);
        pose(i ? 'a2' : 'a1', walking ? -19 * Math.sin(p) : 4, walking ? -8 - 14 * Math.max(0, Math.sin(p)) : -6); });
      let my = horizon - (walking ? Math.abs(Math.cos(ph)) * 0.9 * hs : 0), ms = 1, mo = 1;
      // 2. the saucer glides in from the right and slows over him, starting before he stops
      const arriveStart = T.walk - T.arrive * 0.6;
      let sx = W + 60 * SS, sy = shipY - 40 * scale;
      if (k > arriveStart) {
        const a = Math.min(1, (k - arriveStart) / T.arrive);
        sx = lerp(W + 60 * SS, stopX, ease(a)); sy = lerp(shipY - 40 * scale, shipY, ease(a)) + Math.sin(t / 380) * 2;
      }
      const beamStart = arriveStart + T.arrive, liftStart = beamStart + T.beam, beamOff = liftStart + T.lift, leaveStart = beamOff + T.off;
      // 3. the beam comes down and swallows him; he looks up, arms out
      if (k > beamStart && k < beamOff + T.off) {
        const on = Math.min(1, (k - beamStart) / T.beam), off = k > beamOff ? 1 - Math.min(1, (k - beamOff) / T.off) : 1;
        beam.setAttribute('opacity', (on * off * (0.75 + 0.25 * Math.sin(t / 60))).toFixed(2));
        const len = (horizon - shipY - 6 * scale) / 100;
        beam.setAttribute('transform', `translate(${sx.toFixed(1)},${(shipY + 6 * scale).toFixed(1)}) scale(${(scale * 1.1).toFixed(3)},${len.toFixed(3)})`);
        if (k < liftStart) { const u = on; pose('a1', -70 * u, -20 * u); pose('a2', -55 * u, -25 * u); }
      } else beam.setAttribute('opacity', 0);
      // 4. he floats up, flailing and kicking, shrinking into the ship; his hat doesn't come along
      if (k > liftStart) {
        const l = Math.min(1, (k - liftStart) / T.lift), e = ease(l);
        my = lerp(horizon, shipY + 10 * scale, e); ms = lerp(1, 0.3, e); mo = l > 0.85 ? 1 - (l - 0.85) / 0.15 : 1;
        const f = Math.sin(t / 90);
        pose('a1', -150 + f * 30, -30 - f * 25); pose('a2', -165 - f * 30, -20 + f * 25);
        pose('l1', Math.sin(t / 110) * 26, 20 + Math.sin(t / 110 + 1) * 18); pose('l2', -Math.sin(t / 110) * 26, 20 - Math.sin(t / 110 + 1) * 18);
        if (hatT === null && l > 0.06) { hatT = now; hx = mx + 0.8 * hs * scale * ms; hy = my - 49.4 * hs * scale * ms; mhat.setAttribute('opacity', 0); }
      }
      // the hat: a pop, a tumble, a splash, and it floats
      if (hatT !== null) {
        const h = (now - hatT) / 1000, land = horizon - 1, g = 110 * scale;
        let fx = hx - 16 * scale * Math.min(h, 1.8) + Math.sin(h * 5) * 4 * scale, fy = hy - 26 * scale * h + 0.5 * g * h * h, rot = -h * 300;
        if (fy >= land) { fy = land + Math.sin(now / 420) * 0.8; rot = Math.sin(now / 500) * 8; fx = hx - 16 * scale * 1.8; }
        const end = leaveStart + T.leave;
        fhat.setAttribute('opacity', (k > end - 400 ? Math.max(0, (end - k) / 400) : 1).toFixed(2));
        fhat.setAttribute('transform', `translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(hs * scale).toFixed(3)})`);
      }
      // 5. and it's gone
      if (k > leaveStart) {
        const g = Math.min(1, (k - leaveStart) / T.leave), e = g * g;
        sx = lerp(stopX, -80 * SS, e); sy = lerp(shipY, shipY - 160 * scale, e);
        ship.style.opacity = 1 - Math.max(0, g - 0.7) / 0.3;
      }
      if (!hit && sx < sX + 40 && sx > sX - 60) { hit = true; disturb(); }
      place(man, mx, my, ms * hs); man.style.opacity = mo;
      place(ship, sx, sy, SS);
      lights.forEach((c, i) => c.setAttribute('fill', Math.floor(t / 140 + i) % 4 === 0 ? '#FFE9A8' : '#FF6A3D'));
      if (k < leaveStart + T.leave) requestAnimationFrame(step); else { hide(); playing = false; }
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
    const born = now; (function fade(t2) { const a = 1 - (t2 - born) / 700; if (a <= 0) { em.remove(); return; } em.setAttribute('opacity', a.toFixed(2)); em.setAttribute('cy', (+em.getAttribute('cy') + 0.25).toFixed(1)); requestAnimationFrame(fade); })(now);
  };
  const ripples = (x, k, s, a, r0 = 30, r1 = 80) => sripples.forEach((r, i) => { const ph = (k / 1300 + i * 0.33) % 1;
    r.setAttribute('cx', x.toFixed(1)); r.setAttribute('cy', (horizon + 2).toFixed(1)); r.setAttribute('rx', ((r0 + r1 * ph) * s).toFixed(1)); r.setAttribute('ry', ((3 + 7 * ph) * s * r0 / 30).toFixed(1));
    r.setAttribute('opacity', ((1 - ph) * a).toFixed(2)); });

  // things that live behind the ship and the comet: the Triangle, its fog and flare, and a little lake monster
  const behind = document.createElementNS(NS, 'g');
  const DG = '#62B98C', DGL = '#9ADBB2', DGD = '#1D4A37';
  const HAT = `<rect x="-3.2" y="-7.5" width="6.4" height="7.5" rx=".5" fill="#17131C" stroke="#8C8498" stroke-width=".45"/><rect x="-3.2" y="-2.6" width="6.4" height="1.5" fill="#D8433A"/><rect x="-5.4" y="-.7" width="10.8" height="1.5" rx=".75" fill="#17131C" stroke="#8C8498" stroke-width=".45"/>`;
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
    <g clip-path="url(#sea-clip)"><g class="dino" opacity="0">
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
        <path d="M14.2,-31.6 q2.6,1.9 5.2,0" stroke="${DGD}" stroke-width=".7" fill="none" stroke-linecap="round"/>
        <ellipse cx="13.6" cy="-32.4" rx="1.7" ry="1" fill="#FF8FA3" opacity=".75"/>
        <g class="deye"><circle cx="11" cy="-37" r="2.3" fill="#FFF" stroke="${DGD}" stroke-width=".5"/><circle cx="11.8" cy="-37" r="1.15" fill="#111"/><circle cx="12.2" cy="-37.5" r=".4" fill="#FFF"/></g>
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
    <g class="chair" opacity="0">
      <path d="M-7.4,-12 L-3,0 M-4.8,-5 L8.4,-5 M7.4,-5 L8.6,0 M-2.6,-5 L-1,0" stroke="#B08A5A" stroke-width="1" stroke-linecap="round" fill="none"/>
      <path d="M-6.8,-11.8 L-3.9,-4.4 L7.6,-4.4 L7.6,-6.6 L-2.4,-6.6 L-4.9,-12.4 Z" fill="#F4EFE4"/>
      <path d="M-6.3,-10.2 L-4.4,-10.8 M-5.4,-8 L-3.5,-8.6 M-4.5,-5.8 L-2.7,-6.2 M0,-4.6 L0,-6.4 M3,-4.6 L3,-6.4 M6,-4.6 L6,-6.4" stroke="#D8433A" stroke-width="1.1"/>
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
  const casefile = fore.querySelector('.casefile'), stamp = fore.querySelector('.stamp'), staticEl = fore.querySelector('.static'), pin = fore.querySelector('.pin'), chair = fore.querySelector('.chair');

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
    const t0 = performance.now(); let boomed = false;
    dino.setAttribute('opacity', 1); dhat.setAttribute('opacity', 1);
    const step = (now) => {
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
        chirp.setAttribute('opacity', 1);
        chirp.setAttribute('transform', `translate(${(hx + (dir > 0 ? 4 : -4 - (talk.length > 1 ? 30 : 12)) * ss).toFixed(1)},${(hy - 7 * ds).toFixed(1)}) scale(${s.toFixed(3)})`);
        chirp.firstElementChild.setAttribute('transform', dir > 0 ? '' : `translate(${talk.length > 1 ? 30 : 12},0) scale(-1,1)`);
      } else chirp.setAttribute('opacity', 0);
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
      if (k >= T.hit && !boomed) { boomed = true; disturb(); quake(380); dino.setAttribute('opacity', 0); }
      if (k > T.hit && k < T.hit + 900) {
        const b = (k - T.hit) / 900;
        flash.setAttribute('opacity', (1 - b).toFixed(2)); flash.setAttribute('transform', `translate(${hx.toFixed(1)},${hy.toFixed(1)}) scale(${(ss * (0.5 + b * 1.4)).toFixed(3)})`);
        splash.setAttribute('opacity', (1 - b).toFixed(2)); splash.setAttribute('transform', `translate(${x.toFixed(1)},${horizon.toFixed(1)}) scale(${(ss * (0.6 + b * 0.8)).toFixed(3)})`);
      } else { flash.setAttribute('opacity', 0); splash.setAttribute('opacity', 0); }
      if (k > T.hit && k < T.hit + 1400) { const p = (k - T.hit) / 1400;
        puff.setAttribute('opacity', (p < 0.1 ? p * 10 : 1 - Math.pow((p - 0.1) / 0.9, 1.5)).toFixed(2));
        puff.setAttribute('transform', `translate(${hx.toFixed(1)},${(hy - p * 10 * ss).toFixed(1)}) scale(${(ss * (0.8 + p * 1.1)).toFixed(3)})`);
      } else puff.setAttribute('opacity', 0);
      ripples(x, k, ss, k < T.hit ? Math.max(0, 1 - k / (T.rise + 1600)) : Math.max(0, 1 - (k - T.hit) / 3500), k < T.hit ? 14 : 30, k < T.hit ? 40 : 80);
      // the hat pops up, see-saws down like a leaf, and floats
      const hk = k - T.hit;
      if (hk > 0) {
        let fx, fy, rot; const top = hy - 8 * ds - 34 * ss;
        if (hk < 600) { const p = Math.sin((hk / 600) * Math.PI / 2); fx = lerp(hx, hx + 10 * ss * dir, p); fy = lerp(hy - 8 * ds, top, p); rot = 330 * p * dir; }
        else if (hk < 3800) { const q = (hk - 600) / 3200, qe = ease(q); fx = lerp(hx + 10 * ss * dir, hatX, q) + Math.sin(q * Math.PI * 3) * 12 * ss * (1 - q * 0.6); fy = lerp(top, horizon - 0.5, qe); rot = Math.sin(q * Math.PI * 3 + 0.4) * 24 * (1 - q); }
        else { fx = hatX; fy = horizon - 0.5 + Math.sin(hk / 420) * 0.9; rot = Math.sin(hk / 520) * 6; }
        flyhat.setAttribute('opacity', (k > end - 500 ? (end - k) / 500 : 1).toFixed(2));
        flyhat.setAttribute('transform', `translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(ds * 1.15).toFixed(3)})`);
      }
      // 5. the bulletin
      const ck = k - cardStart;
      if (ck > 0) {
        dcard.setAttribute('opacity', (ck < 200 ? ck / 200 : ck > T.card ? Math.max(0, 1 - (ck - T.card) / 500) : 1).toFixed(2));
        dcard.setAttribute('transform', `translate(${cardX.toFixed(1)},${cardY.toFixed(1)}) rotate(-4) scale(${(cs * (ck < 220 ? 1.4 - 0.4 * ck / 220 : 1)).toFixed(3)})`);
      }
      if (k < end) requestAnimationFrame(step);
      else { dino.setAttribute('opacity', 0); flyhat.setAttribute('opacity', 0); dcard.setAttribute('opacity', 0); chirp.setAttribute('opacity', 0); sripples.forEach((s) => s.setAttribute('opacity', 0)); done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the Lake Michigan Triangle (Ludington, Manitowoc, Benton Harbor; Jay Gourley, 1977)
  const staticPat = behind.querySelector('#static-lines');
  const playTriangle = (done) => {
    size(); seaclip.setAttribute('height', String(4000 + horizon + 1));
    const phone = W < 700, dir = phone ? -1 : 1; // phones: the clear water is right of the sign, so she sails in from the right
    const ss = Math.max(0.8, Math.min(1.8, W / 700)), tx = W * (phone ? 0.79 : 0.28);
    const T = { sail: 6400, trace: 700, side: 850, flare: 2200, fog: 2600, spin: 3000, stat: 3400, stutter: 5300, glitch: 6400, stretch: 7900, collapse: 8350, wink: 8650, card: 9100, stamp: 10300, chair: 9700, end: 14200 };
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
    const t0 = performance.now(); let ang = 0, settle = null, stamped = false, winked = false;
    liner.setAttribute('opacity', 1); refl.setAttribute('opacity', 1); tri.setAttribute('opacity', 1);
    compassEl.setAttribute('transform', `translate(${ccx},${ccy.toFixed(1)}) scale(${ccs})`);
    const step = (now) => {
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
        casefile.setAttribute('opacity', out.toFixed(2));
        casefile.setAttribute('transform', `translate(${lerp(-cw - 30, cardX, s).toFixed(1)},${cardY}) rotate(${lerp(-9, -2, s).toFixed(1)}) scale(${cs})`); }
      const sk = k - T.stamp;
      if (sk > 0) { if (!stamped) { stamped = true; quake(200); }
        stamp.setAttribute('opacity', (Math.min(0.92, sk / 90) * out).toFixed(2));
        stamp.setAttribute('transform', `translate(180,66) scale(${sk < 160 ? 1.9 - 0.9 * sk / 160 : 1}) translate(-180,-66)`); }
      // 7. and one deck chair, drifting across the empty water
      const ck = (k - T.chair) / (T.end - T.chair);
      if (ck > 0) { chair.setAttribute('opacity', (Math.min(1, ck * 6) * out).toFixed(2));
        chair.setAttribute('transform', `translate(${(tx - dir * 34 * ss + dir * 64 * ss * ck).toFixed(1)},${(horizon + 1.5 + Math.sin(k / 450) * 0.8).toFixed(1)}) rotate(${(Math.sin(k / 600) * 5).toFixed(1)}) scale(${(ss * (phone ? 2 : 1.7) * dir).toFixed(3)},${(ss * (phone ? 2 : 1.7)).toFixed(3)})`); }
      if (k < T.end) requestAnimationFrame(step);
      else { [liner, refl, tri, flare, fog, staticEl, lglitch, compassEl, casefile, stamp, chair, pin].forEach((el) => el.setAttribute('opacity', 0)); sripples.forEach((r) => r.setAttribute('opacity', 0)); done(); }
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


  // ---------------------------------------------------------------- the Michigan Dogman (Wexford County, 1887; WTCM-FM, April 1, 1987)
  const DFUR = '#140D0A', DTIP = '#3A2A20', DFAR = '#0A0605';
  const dfur = (pts, amp = 1.4, fill = DFUR) => `<path d="${shag(pts, 2, amp)}" fill="${fill}" stroke="${DTIP}" stroke-width=".6" stroke-linejoin="round"/>`;
  const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const both = (pts, amp, fill) => dfur(pts, amp, fill) + dfur(mirror(pts), amp, fill);
  // legs: an upper segment hinged at the hip, a lower segment hinged at the knee, paw forward
  const UPF = [[-2.4, 0], [2.4, 0], [2, 9.4], [-1.8, 9.4]], UPH = [[-3.8, -1.5], [3.4, -1.5], [2.2, 9.4], [-1.8, 9.4]];
  const LOW = [[-1.7, 0], [1.7, 0], [1.5, 7.6], [3.8, 8.8], [-2, 8.8]];
  const leg = (cls, up, fill) => `<g class="${cls}">${dfur(up, 0.9, fill)}<g class="lo">${dfur(LOW, 0.8, fill)}</g></g>`;
  // a dog's face, looking straight at you: ears up, muzzle toward the camera, eyes, a hinged jaw
  const face = (cls) => `<g class="${cls}">
      ${dfur([[-6.5, -37], [-8.5, -45], [-8, -50], [-11, -60], [-3.5, -52], [3.5, -52], [11, -60], [8, -50], [8.5, -45], [6.5, -37], [0, -34]], 1)}
      <path d="M-8.6,-56.5 L-5.6,-52 M8.6,-56.5 L5.6,-52" stroke="#5A3A2A" stroke-width="1.2" opacity=".7"/>
      <g class="mouth" opacity="0"><ellipse cx="0" cy="-37.6" rx="2.7" ry="2.6" fill="#000"/><path d="M-2,-39.4 l.5,1.1 .5,-1.1 M2,-39.4 l-.5,1.1 -.5,-1.1" stroke="#E8E0D0" stroke-width=".45" fill="none"/></g>
      <g class="jaw"><path d="M-3,-38.6 Q0,-35.4 3,-38.6 Q0,-37.4 -3,-38.6 Z" fill="#24170F" stroke="${DTIP}" stroke-width=".5"/></g>
      <g class="muz"><path d="M-3.4,-45 Q-4.6,-38.6 0,-37.6 Q4.6,-38.6 3.4,-45 Z" fill="#2E1F16" stroke="${DTIP}" stroke-width=".5"/><ellipse cx="0" cy="-39.6" rx="1.7" ry="1.1" fill="#000"/><path d="M-1.4,-44.6 L0,-40.8 L1.4,-44.6" stroke="#4A3426" stroke-width=".5" fill="none"/></g>
      <g class="eyes"><circle class="glow" cx="-3.7" cy="-46" r="2.4" fill="#FFB347" opacity=".2"/><circle class="glow" cx="3.7" cy="-46" r="2.4" fill="#FFB347" opacity=".2"/>
        <circle class="core" cx="-3.7" cy="-46" r="1.1" fill="#FFC45E"/><circle class="core" cx="3.7" cy="-46" r="1.1" fill="#FFC45E"/></g>
      <path class="glint" d="M3.7,-50.5 l.6,3.9 3.9,.6 -3.9,.6 -.6,3.9 -.6,-3.9 -3.9,-.6 3.9,-.6z" fill="#FFF6DA" opacity="0"/>
    </g>`;
  const dm = document.createElementNS(NS, 'g');
  dm.innerHTML = `
    <rect class="dmdim" x="-4000" y="-4000" width="9000" height="9000" fill="#02040A" opacity="0"/>
    <g class="dogman" opacity="0">
      <g class="dside" opacity="0">
        ${leg('lg fh', UPH, DFAR)}${leg('lg ff', UPF, DFAR)}
        <g class="dbody">
          <g class="dtail">${dfur([[1, -1], [-5, -6], [-13, -7], [-20, -3], [-23, 3], [-18, 1], [-15, 4], [-10, 2], [-4, 3]], 1.5)}</g>
          ${dfur([[-22, -19], [-20, -26], [-9, -29], [5, -28], [13, -31], [18, -27], [18, -19], [11, -15], [-6, -16], [-18, -15]], 1.6)}
          <g class="shead">
            <g class="sprof">
              ${dfur([[10, -27], [15, -37], [21, -38], [24, -30], [17, -22]], 1.3)}
              ${dfur([[16, -40], [21, -43], [26, -41], [37, -38.5], [39.5, -35.5], [37, -33], [27, -32], [20, -31], [16, -35]], 1)}
              ${dfur([[18, -41], [19.5, -51], [23.5, -42]], 0.7)}${dfur([[21.5, -42], [24.5, -49.5], [25.8, -41]], 0.7)}
              <circle cx="39" cy="-36.3" r="1.1" fill="#000"/><path d="M28,-33.2 L37,-34" stroke="#3A2A20" stroke-width=".5"/>
              <circle cx="25" cy="-38.3" r="2.2" fill="#FFB347" opacity=".22"/><circle cx="25" cy="-38.3" r=".95" fill="#FFC45E"/>
            </g>
            <g class="sface" opacity="0"><g transform="translate(20,-36) scale(.82) translate(0,44)">${dfur([[-10, -28], [-4, -40], [4, -40], [10, -28]], 1.3)}${face('sf')}</g></g>
          </g>
        </g>
        ${leg('lg nh', UPH, DFUR)}${leg('lg nf', UPF, DFUR)}
      </g>
      <g class="dfront" opacity="0">
        ${dfur([[-13, -11], [-14, -19], [-10, -23], [10, -23], [14, -19], [13, -11]], 1.3, DFAR)}
        ${both([[-14.5, 0], [-9.5, 0], [-10.5, -9], [-13.5, -10]], 0.8, DFAR)}
        ${both([[-9.6, 0], [-3.4, 0], [-3.8, -4], [-4, -20], [-9.4, -20], [-8.6, -4]], 1)}
        ${dfur([[-10, -16], [-13, -24], [-12, -29], [-6, -32], [6, -32], [12, -29], [13, -24], [10, -16], [6, -13], [3, -15], [0, -11], [-3, -15], [-6, -13]], 1.8)}
        <g class="qhead"><g transform="translate(0,-31) scale(1.22) translate(0,36)">${face('qf')}</g></g>
        <g class="howl" opacity="0" fill="none" stroke="rgba(232,238,242,.65)" stroke-width="1.1" stroke-linecap="round"><path d="M-5,-66 q5,-4 10,0"/><path d="M-9,-72 q9,-7 18,0"/><path d="M-13,-78 q13,-10 26,0"/></g>
      </g>
      <g class="eyesonly" opacity="0"><circle cx="24" cy="-38" r="3" fill="#FFB347" opacity=".25"/><circle cx="28.5" cy="-38" r="3" fill="#FFB347" opacity=".25"/><circle cx="24" cy="-38" r="1.3" fill="#FFC45E"/><circle cx="28.5" cy="-38" r="1.3" fill="#FFC45E"/></g>
    </g>
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
  const dogman = $('.dogman'), dside = $('.dside'), dbody = $('.dbody'), dtail = $('.dtail'), shead = $('.shead'), sprof = $('.sprof'), sface = $('.sface');
  const dfront = $('.dfront'), qhead = $('.qhead'), eyesonly = $('.eyesonly'), howl = $('.howl');
  const qmuz = $('.qf .muz'), qjaw = $('.qf .jaw'), qmouth = $('.qf .mouth'), qeyes = $('.qf .eyes'), qglint = $('.qf .glint');
  const qglow = [...dm.querySelectorAll('.qf .glow')], qcore = [...dm.querySelectorAll('.qf .core')];
  const dmdim = $('.dmdim'), radio = $('.radio'), needle = $('.needle');
  // diagonal pairs move together: near hind with far fore, far hind with near fore
  const LEGS = [['.nh', -15, -17.4, 0, -20, 35], ['.ff', 9, -18.2, 0, 0, 0], ['.fh', -18, -17.4, Math.PI, -20, 35], ['.nf', 12, -18.2, Math.PI, 0, 0]]
    .map(([c, x, y, p, r1, r2]) => ({ el: $(c), lo: $(c + ' .lo'), x, y, p, r1, r2 }));
  const gait = (ph, amp, lift) => LEGS.forEach((g) => { const s = ph + g.p, swing = Math.max(0, -Math.cos(s));
    g.el.setAttribute('transform', `translate(${g.x},${g.y}) rotate(${(g.r1 + amp * Math.sin(s)).toFixed(1)})`);
    g.lo.setAttribute('transform', `translate(0,9.4) rotate(${(g.r2 + lift * swing).toFixed(1)})`); });
  const playDogman = (done) => {
    size();
    const phone = W < 700, ds = (phone ? 1.05 : 1.25) * scale;
    const x0 = W * (phone ? 0.13 : 0.22), xs = phone ? -14 * ds : W * 0.03; // phones: the sign covers the middle, so he keeps to the left edge
    const T = { eyes: 1600, walk: 4000, look: 500, hold: 700, turn: 500, eyesOn: 900, howl: 2100, back: 350, lope: 1500 };
    const t1 = T.eyes, t2 = t1 + T.walk, t3 = t2 + T.look, t4 = t3 + T.hold, t5 = t4 + T.turn, t6 = t5 + T.eyesOn, t7 = t6 + T.howl, t8 = t7 + T.back, t9 = t8 + T.lope;
    const rStart = t6 + 200, rEnd = t9, end = t9 + 400;
    const cycles = Math.max(2.5, Math.abs(x0 - xs) / (26 * ds)); // stride length sets the step rate, so the paws don't skate
    const t0 = performance.now(); let quaked = false;
    dogman.setAttribute('opacity', 1); dside.setAttribute('opacity', 0); dfront.setAttribute('opacity', 0); sface.setAttribute('opacity', 0); sprof.setAttribute('opacity', 1);
    radio.setAttribute('transform', `translate(${phone ? 12 : 24},${phone ? Math.round(horizon + 70) : 84}) scale(${phone ? 0.95 : 1.1})`);
    const step = (now) => {
      const k = now - t0; let x = x0, dir = 1, ph = 0, amp = 0, lift = 0;
      dmdim.setAttribute('opacity', (k < t7 ? Math.min(0.35, k / 2000) + (k > t6 ? 0.1 * Math.min(1, (k - t6) / 400) : 0) : Math.max(0, 0.45 - (k - t7) / 1400)).toFixed(2));
      // 1. two eyes on the dark shore, blinking
      const blink = Math.floor(k / 120) % 9 === 4 || Math.floor(k / 120) % 9 === 6;
      eyesonly.setAttribute('opacity', (k < t1 ? (blink ? 0 : Math.min(1, k / 500)) : Math.max(0, 1 - (k - t1) / 300)).toFixed(2));
      // 2. he walks in like a dog: diagonal pairs, knees lifting, head and body bobbing, tail swaying
      if (k < t2) { const c = Math.max(0, (k - t1) / T.walk); x = lerp(xs, x0, c); ph = c * cycles * Math.PI * 2; amp = c > 0 && c < 1 ? 20 : 0; lift = 38;
        dside.setAttribute('opacity', Math.min(1, Math.max(0, (k - t1 + 250) / 500)).toFixed(2)); }
      // 3. he stops and his head turns to you
      const lk = (k - t2) / T.look, lookP = lk <= 0 ? 0 : Math.min(1, lk);
      sprof.setAttribute('transform', `translate(18 0) scale(${k > t8 ? 1 : Math.max(0.05, 1 - lookP * 2).toFixed(3)},1) translate(-18 0)`);
      sprof.setAttribute('opacity', k > t8 ? 1 : lookP < 0.5 ? 1 : 0);
      sface.setAttribute('opacity', k < t8 && lookP >= 0.5 ? 1 : 0);
      sface.setAttribute('transform', `translate(20 0) scale(${Math.max(0.05, lookP * 2 - 1).toFixed(3)},1) translate(-20 0)`);
      // 4. then the whole body comes round: on all fours, facing the camera
      const tk = (k - t4) / T.turn, bk = (k - t7) / T.back;
      let sideW = tk <= 0 ? 1 : Math.max(0, 1 - tk * 2), frontW = tk <= 0.5 ? 0 : Math.min(1, (tk - 0.5) * 2);
      if (k > t7) { frontW = Math.max(0, 1 - bk * 2); sideW = bk <= 0.5 ? 0 : Math.min(1, (bk - 0.5) * 2); dir = -1; }
      if (k > t1 + 300) dside.setAttribute('opacity', sideW > 0 ? 1 : 0);
      dside.setAttribute('transform', `scale(${Math.max(0.04, sideW).toFixed(3)},1)`);
      dfront.setAttribute('opacity', frontW > 0 ? 1 : 0);
      dfront.setAttribute('transform', `scale(${Math.max(0.04, frontW).toFixed(3)},1)`);
      // 5. the eyes light up
      const ek = Math.min(1, Math.max(0, (k - t5) / 500));
      qglow.forEach((c) => { c.setAttribute('r', (2.2 + 1.3 * ek + (ek === 1 ? 0.25 * Math.sin(k / 140) : 0)).toFixed(2)); c.setAttribute('opacity', (0.18 + 0.3 * ek).toFixed(2)); });
      qcore.forEach((c) => { c.setAttribute('r', (1.1 + 0.35 * ek).toFixed(2)); c.setAttribute('fill', ek > 0.5 ? '#FFE08A' : '#FFC45E'); });
      qeyes.style.filter = ek > 0 ? `drop-shadow(0 0 ${(1 + 2.5 * ek).toFixed(1)}px #FFB347)` : '';
      const gk = (k - t5 - 550) / 380;
      qglint.setAttribute('opacity', gk > 0 && gk < 1 ? Math.sin(gk * Math.PI).toFixed(2) : 0);
      qglint.setAttribute('transform', `translate(3.7 -46.5) rotate(${(gk * 90).toFixed(0)}) scale(${(gk > 0 && gk < 1 ? 0.4 + Math.sin(gk * Math.PI) * 0.6 : 0).toFixed(2)}) translate(-3.7 46.5)`);
      // 6. head tips back, jaw drops, and he howls at you
      const hk = (k - t6) / T.howl, howling = hk > 0 && hk < 1;
      const up = howling ? Math.sin(Math.min(1, hk * 3) * Math.PI / 2) * (hk > 0.85 ? (1 - hk) / 0.15 : 1) : 0;
      qhead.setAttribute('transform', `translate(0,${(-3.5 * up).toFixed(2)}) translate(0 -38) scale(${(1 + 0.04 * up).toFixed(3)},${(1 - 0.2 * up).toFixed(3)}) translate(0 38)`);
      qmuz.setAttribute('transform', `translate(0,${(-4 * up).toFixed(2)})`);
      qjaw.setAttribute('transform', `translate(0,${(3.2 * up).toFixed(2)})`);
      qmouth.setAttribute('opacity', Math.min(1, up * 1.5).toFixed(2));
      qmouth.setAttribute('transform', `translate(0 -39) scale(1,${(0.2 + 0.8 * up).toFixed(2)}) translate(0 39)`);
      qeyes.setAttribute('transform', `translate(0 -46) scale(1,${(1 - 0.55 * up).toFixed(2)}) translate(0 46)`);
      howl.setAttribute('opacity', howling ? (up * (0.5 + 0.5 * Math.sin(k / 70))).toFixed(2) : 0);
      howl.setAttribute('transform', `translate(0,${(-3 * up - ((k / 18) % 8)).toFixed(1)})`);
      if (howling && hk > 0.15 && !quaked) { quaked = true; quake(300); }
      // 7. he wheels round and lopes off into the dark, faster
      if (k > t8) { const r = Math.min(1, (k - t8) / T.lope); x = x0 - r * r * (x0 + 90 * ds); ph = (k - t8) / 55; amp = 30; lift = 50;
        dogman.setAttribute('opacity', (r > 0.85 ? (1 - r) / 0.15 : 1).toFixed(2)); }
      gait(ph, amp, lift);
      const bob = amp ? Math.abs(Math.sin(ph)) : 0;
      dbody.setAttribute('transform', `translate(0,${(-bob * 0.9).toFixed(2)})`);
      shead.setAttribute('transform', `rotate(${(amp ? Math.sin(ph * 2) * 3 : 0).toFixed(1)} 14 -27)`);
      dtail.setAttribute('transform', `translate(-20,-24) rotate(${(Math.sin(k / (amp > 25 ? 90 : 300)) * 12 + (amp > 25 ? -18 : 0)).toFixed(1)})`);
      dogman.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon - 1).toFixed(1)}) scale(${(dir * ds).toFixed(3)},${ds.toFixed(3)})`);
      // 8. and somewhere, a Traverse City radio station plays the song
      const rk = k - rStart;
      radio.setAttribute('opacity', (rk < 0 ? 0 : rk < 400 ? rk / 400 : k > rEnd ? Math.max(0, 1 - (k - rEnd) / 400) : 1).toFixed(2));
      needle.setAttribute('x1', (20 + 40 * Math.min(1, Math.max(0, rk / 1200))).toFixed(1)); needle.setAttribute('x2', needle.getAttribute('x1'));
      if (k < end) requestAnimationFrame(step);
      else { [dogman, dside, dfront, radio, dmdim, eyesonly].forEach((el) => el.setAttribute('opacity', 0)); qeyes.style.filter = ''; done(); }
    };
    requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------- the show: a random act first, the lake monster later, then whatever you tap for
  let busy = false;
  const run = (fn) => { if (busy) return; busy = true; fn(() => { busy = false; }); };
  const ufoAct = (done) => { play(); const wait = () => (playing ? setTimeout(wait, 300) : done()); setTimeout(wait, 300); };
  const ACTS = [playDino, playBigfoot, playTriangle, ufoAct, playDogman];
  let next = 0;
  const session = (k) => { try { if (sessionStorage.getItem(k) === '1') return false; sessionStorage.setItem(k, '1'); } catch (e) {} return true; };
  const heroVisible = () => hero.getBoundingClientRect().bottom > innerHeight * 0.4 && !document.hidden;
  const when = (ms, fn) => setTimeout(function go() { if (!heroVisible() || busy) { setTimeout(go, 2000); return; } fn(); }, ms);
  const first = Math.floor(Math.random() * ACTS.length); next = (first + 1) % ACTS.length;
  when(600, () => run(ACTS[first])); // a random act opens the show on every load
  if (ACTS[first] !== playDino && session('comet')) when(25000, () => run(playDino));
  const sign = document.getElementById('neon');
  const orbit = sign && sign.closest('.orbit');
  if (orbit) { orbit.style.pointerEvents = 'auto'; orbit.style.cursor = 'pointer'; orbit.addEventListener('click', () => { if (busy) return; const act = ACTS[next]; next = (next + 1) % ACTS.length; run(act); }); }
  window.__acts = { dogman: () => run(playDogman), ufo: () => run(ufoAct), dino: () => run(playDino), comet: () => run(playDino), triangle: () => run(playTriangle), ship: () => run(playTriangle), bigfoot: () => run(playBigfoot) };
})();
