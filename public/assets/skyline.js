// Traverse City on the horizon, to the right of the sign: the Park Place tower, Front Street, the Commons spires,
// a steeple, and Old Mission Point Lighthouse out on the point. Illustrative, not survey-accurate.
// It reads the live sky (window.__wx): windows come on at dusk, the beacon and the lighthouse work at night.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HZ = 0.36;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'skyline-layer'); svg.setAttribute('aria-hidden', 'true');
  hero.prepend(svg);

  // the skyline in its own units: x 0..240, ground at y 0, up is negative
  const B = [ // [x, width, height, kind]
    [0, 10, 9, 'low'], [10, 8, 13, 'low'], [19, 12, 10, 'marquee'], [32, 9, 15, 'low'], [42, 7, 11, 'low'],
    [50, 6, 22, 'steeple'], [57, 11, 14, 'low'], [69, 13, 52, 'parkplace'], [83, 10, 18, 'low'], [94, 9, 12, 'low'],
    [104, 14, 21, 'commons'], [119, 8, 26, 'commonsTower'], [128, 14, 21, 'commons'], [143, 10, 10, 'low'], [154, 8, 7, 'low'],
  ];
  let body = '', wins = [];
  const win = (x, y, w = 1.6, h = 2) => { wins.push([x, y, w, h]); };
  for (const [x, w, h, k] of B) {
    if (k === 'low') { body += `<rect x="${x}" y="${-h}" width="${w}" height="${h}"/>`; for (let r = -h + 3; r < -2; r += 4) for (let c = x + 2; c < x + w - 2; c += 3.2) win(c, r); }
    if (k === 'marquee') { body += `<rect x="${x}" y="${-h}" width="${w}" height="${h}"/><rect x="${x - 1.5}" y="${-h + 3}" width="${w + 3}" height="3" class="marq"/>`; }
    if (k === 'steeple') { body += `<rect x="${x}" y="${-h + 8}" width="${w}" height="${h - 8}"/><polygon points="${x},${-h + 8} ${x + w / 2},${-h - 6} ${x + w},${-h + 8}"/>`; win(x + w / 2 - .8, -h + 11, 1.6, 2.6); }
    if (k === 'parkplace') {
      body += `<rect x="${x}" y="${-h}" width="${w}" height="${h}"/><rect x="${x + 2}" y="${-h - 4}" width="${w - 4}" height="4"/><rect x="${x + w / 2 - .5}" y="${-h - 12}" width="1" height="8"/>`;
      for (let r = -h + 4; r < -2; r += 4) for (let c = x + 2; c < x + w - 2; c += 3) win(c, r, 1.5, 2);
    }
    if (k === 'commons') { body += `<rect x="${x}" y="${-h}" width="${w}" height="${h}"/><polygon points="${x - 1},${-h} ${x + w / 2},${-h - 7} ${x + w + 1},${-h}"/>`; for (let r = -h + 4; r < -3; r += 5) for (let c = x + 2; c < x + w - 2; c += 3.5) win(c, r, 1.4, 2.4); }
    if (k === 'commonsTower') { body += `<rect x="${x}" y="${-h}" width="${w}" height="${h}"/><polygon points="${x},${-h} ${x + w / 2},${-h - 14} ${x + w},${-h}"/>`; win(x + w / 2 - .8, -h + 5, 1.6, 2.6); }
  }
  // trees between town and the point, and the lighthouse out on the point
  const trees = [[160, 7], [166, 9], [172, 6], [178, 8], [186, 5]].map(([x, h]) => `<polygon points="${x - 3},0 ${x},${-h} ${x + 3},0"/>`).join('');
  const LX = 214;
  const lighthouse = `<rect x="${LX - 9}" y="-4" width="18" height="4"/><rect x="${LX - 3.5}" y="-9" width="9" height="5"/>
    <polygon points="${LX - 1.4},-9 ${LX + 1.4},-9 ${LX + 1},-19 ${LX - 1},-19"/><rect x="${LX - 1.6}" y="-21.5" width="3.2" height="2.5"/>`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="lh-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".7"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></linearGradient>
    </defs>
    <g class="city">
      <g class="mass">${body}${trees}<rect x="-6" y="-1" width="232" height="2"/>${lighthouse}</g>
      <g class="wins">${wins.map(([x, y, w, h]) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}"/>`).join('')}</g>
      <circle class="beacon" cx="${69 + 6.5}" cy="-65" r="1.2"/>
      <rect class="lamp" x="${LX - 1.3}" y="-21" width="2.6" height="1.8"/>
      <g class="beam" opacity="0"><polygon points="${LX},-20.2 ${LX + 70},-27 ${LX + 70},-14"/></g>
      <g class="refl"></g>
    </g>`;
  const city = svg.querySelector('.city'), mass = svg.querySelector('.mass'), winEls = [...svg.querySelectorAll('.wins rect')];
  const beacon = svg.querySelector('.beacon'), lamp = svg.querySelector('.lamp'), beam = svg.querySelector('.beam'), marq = svg.querySelector('.marq'), refl = svg.querySelector('.refl');
  // each window gets its own "bedtime" threshold, so they come on one by one as it gets dark
  const thr = winEls.map((_, i) => ((i * 7919) % 100) / 100);
  // a handful of reflection streaks on the water under the brightest blocks
  refl.innerHTML = [72, 76, 80, 110, 132, 214].map((x) => `<rect x="${x}" y="2" width="1.6" height="8" rx=".8"/>`).join('');
  const reflEls = [...refl.children];
  let W = 0, H = 0, horizon = 0;
  const size = () => {
    const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const phone = W < 700, s = phone ? Math.min(1.25, W / 310) : Math.min(2.2, W / 620);
    // phones: the sign covers the middle, so the Park Place tower (x 69 to 82 in city units) sits in the open sky to the right of it
    const x = phone ? W - 34 - 82 * s : W * 0.62;
    city.setAttribute('transform', `translate(${x.toFixed(1)},${(horizon + .5).toFixed(1)}) scale(${s.toFixed(3)})`);
  };
  size(); addEventListener('resize', size); new ResizeObserver(size).observe(hero);
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  let lastDark = -1, t0 = performance.now(), raf = 0, visible = true, outAt = 0;
  const orbitEl = document.querySelector('.hero .orbit');
  const frame = (now) => {
    raf = 0;
    const wx = window.__wx || { day: 0, sun: 0, cloud: 0 };
    const dark = Math.max(0, Math.min(1, 1 - wx.day * 1.15 + (wx.cloud || 0) * .15)); // 0 = full day, 1 = night
    // the masses: soft blue-grey in daylight, near-black against the night
    mass.style.fill = `rgb(${mix([46, 62, 80], [10, 15, 24], Math.min(1, dark * 1.2)).join(',')})`; // slate by day, ink at night
    mass.style.opacity = (0.88 + 0.12 * dark).toFixed(2);
    // windows switch on as it gets dark; a few blink now and then
    const t = (now - t0) / 1000;
    const fried = orbitEl && orbitEl.classList.contains('fried') || orbitEl && orbitEl.classList.contains('zapped');
    if (fried && dark > .4 && !outAt) outAt = now; else if (!fried) outAt = 0;
    const outK = outAt ? (now - outAt) / 900 : -1; // windows fail block by block over ~0.9 s
    if (Math.abs(dark - lastDark) > .01 || !reduce) {
      winEls.forEach((w, i) => {
        let on = dark > 0.25 + thr[i] * 0.55 ? 1 : 0;
        if (outK >= 0 && thr[i] < outK + (Math.random() < .02 ? .1 : 0)) on = 0;
        if (on && !reduce && i % 11 === 3 && Math.sin(t * .7 + i) > .97) on = 0;
        w.setAttribute('opacity', on ? (0.65 + 0.35 * ((i * 31) % 7) / 7).toFixed(2) : 0);
      });
      lastDark = dark;
    }
    marq.style.fill = dark > .35 && outK < .3 ? (Math.floor(t * 3) % 2 ? '#FFD27A' : '#FFB85A') : 'rgb(110,120,130)';
    beacon.setAttribute('opacity', dark > .4 && outK < .6 ? (reduce ? .9 : (Math.sin(t * 3.2) > 0 ? 1 : .15)).toFixed(2) : 0);
    lamp.setAttribute('opacity', dark > .35 ? 1 : .15);
    // the lighthouse beam swings out over the water and back
    if (dark > .4 && !reduce) {
      const a = Math.sin(t * .9);
      beam.setAttribute('opacity', (0.35 + 0.45 * Math.max(0, a)).toFixed(2));
      beam.setAttribute('transform', `rotate(${(-150 + 150 * (a * .5 + .5)).toFixed(1)} 214 -20.2)`);
    } else beam.setAttribute('opacity', dark > .4 ? .4 : 0);
    reflEls.forEach((r, i) => r.setAttribute('opacity', (dark > .45 && outK < 0 ? 0.18 + 0.12 * Math.sin(t * 2 + i * 1.7) : 0).toFixed(2)));
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(hero);
  document.addEventListener('visibilitychange', wake);
  if (reduce) setInterval(() => requestAnimationFrame(frame), 1000); else wake();
})();
