// When the lake is frozen solid (the slider at the bottom), a dog sled team and a snowmobile cross the ice.
// Silhouettes, like everyone else on the shore. They take turns, one crossing every few seconds.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const HZ = 0.36, INK = '#05070B', RIM = 'drop-shadow(0 0 .8px rgba(190,215,235,.8))';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ice-layer'); svg.setAttribute('aria-hidden', 'true');
  hero.prepend(svg);

  // a running dog: body, head, ears, tail, and four legs that cycle
  const dog = (i) => `<g class="dog" data-i="${i}">
      <ellipse cx="0" cy="-5" rx="5.2" ry="2.1"/>
      <path d="M4.2,-6.2 L7.4,-7.6 L8.9,-6.8 L7.6,-5.1 L4.8,-4.6Z"/>
      <path d="M6.2,-7.4 L6.8,-9.4 L7.5,-7.6Z"/>
      <path class="tail" d="M-5,-5.6 Q-7.6,-8.4 -6.4,-9.2" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>
      <g class="legs" stroke="${INK}" stroke-width="1" stroke-linecap="round">
        <line class="lg a" x1="3.4" y1="-4" x2="3.4" y2="0"/><line class="lg b" x1="2.4" y1="-4" x2="2.4" y2="0"/>
        <line class="lg c" x1="-3.2" y1="-4" x2="-3.2" y2="0"/><line class="lg d" x1="-4.2" y1="-4" x2="-4.2" y2="0"/>
      </g></g>`;
  // six dogs in pairs on a gangline, then the sled and the musher
  let team = '';
  for (let r = 0; r < 3; r++) for (let side = 0; side < 2; side++) team += `<g transform="translate(${-r * 13 - side * 2.5},${side * 1.6})">${dog(r * 2 + side)}</g>`;
  svg.innerHTML = `
    <g class="sled" opacity="0" fill="${INK}" style="filter:${RIM}">
      <line x1="6" y1="-4" x2="-58" y2="-4" stroke="${INK}" stroke-width=".7"/>
      ${team}
      <g transform="translate(-64,0)">
        <path d="M-10,0 H8 Q11,0 11,-3" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M-8,-1 H5 V-6 H-8Z"/><path d="M-9,-6 V-12 L-7,-12 V-6Z"/>
        <g class="musher"><circle cx="-11" cy="-21" r="2.2"/><path d="M-13.6,-19 H-8.4 L-8,-10 H-14Z"/><path d="M-9,-17 L-6.5,-12.5" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M-13.2,-10 L-14,-1 M-9,-10 L-8.2,-1" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/></g>
      </g>
      <g class="spray"></g>
    </g>
    <g class="sled2" opacity="0" fill="${INK}" style="filter:${RIM}">
      <path d="M-14,0 H10 Q14,0 14,-2.5 L12,-2.5 Q11.5,-1 9,-1 H-14Z"/>
      <path d="M-13,-2 L-12,-7 L2,-8.5 L9,-5.5 L11,-2Z"/>
      <path d="M2,-8.5 L5.5,-11.5 L7.5,-11 L5,-7.6Z" opacity=".85"/>
      <g class="rider"><circle cx="-3" cy="-15.5" r="2.4"/><path d="M-6,-13 H0 L1,-8 H-7Z"/><path d="M-1,-12 L4,-9.5" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/></g>
      <circle class="headlamp" cx="12.4" cy="-5" r="1.2" fill="#FFF3C4" style="filter:drop-shadow(0 0 3px #FFF3C4)"/>
      <path class="lampbeam" d="M13,-5 L60,-9 L60,-1Z" fill="rgba(255,243,196,.18)"/>
      <g class="spray2"></g>
    </g>`;
  const sled = svg.querySelector('.sled'), snowmo = svg.querySelector('.sled2'), lamp = svg.querySelector('.lampbeam');
  const legs = [...svg.querySelectorAll('.dog')].map((d) => [...d.querySelectorAll('.lg')]);
  const tails = [...svg.querySelectorAll('.tail')];
  let W = 0, H = 0, horizon = 0;
  const size = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  size(); addEventListener('resize', size);
  const kick = (g, x, y, n) => { // snow kicked up behind runners and the track
    for (let i = 0; i < n; i++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', .8 + Math.random() * 1.4); c.setAttribute('fill', 'rgba(235,242,250,.85)'); svg.append(c);
      const vx = -30 - Math.random() * 50, vy = -18 - Math.random() * 22, t0 = performance.now();
      (function f(t) { const k = (t - t0) / 1000; c.setAttribute('cx', (x + vx * k).toFixed(1)); c.setAttribute('cy', (y + vy * k + 60 * k * k).toFixed(1)); c.setAttribute('opacity', Math.max(0, 1 - k / .7).toFixed(2)); if (k < .7) requestAnimationFrame(f); else c.remove(); })(t0); }
  };
  // one crossing at a time: the sled team west-to-east on the near ice, the snowmobile east-to-west a little further out
  let act = null, nextAt = 0, turn = 0;
  const start = (now) => {
    size();
    const phone = W < 700, s = (phone ? 1.05 : 1.45) * Math.max(.9, Math.min(1.6, W / 900));
    if (turn++ % 2 === 0) act = { el: sled, t0: now, dur: phone ? 9000 : 12000, x0: -110 * s, x1: W + 30, y: horizon + H * .14, s: s * 1.25, dir: 1, kind: 'dogs' };
    else act = { el: snowmo, t0: now, dur: phone ? 4200 : 5600, x0: W + 30, x1: -60, y: horizon + H * .1, s: s * 1.15, dir: -1, kind: 'sled' };
    act.el.setAttribute('opacity', 1);
  };
  const loop = (now) => {
    requestAnimationFrame(loop);
    const frozen = (window.__wx && window.__wx.ice > .97) && (window.__tempF !== undefined && window.__tempF <= -9);
    if (!frozen && !act) return;
    if (!act) { if (now > nextAt) start(now); else return; }
    const k = Math.min(1, (now - act.t0) / act.dur), x = act.x0 + (act.x1 - act.x0) * k;
    const bob = Math.sin(now / 90) * .6;
    act.el.setAttribute('transform', `translate(${x.toFixed(1)},${(act.y + bob).toFixed(1)}) scale(${(act.s * act.dir).toFixed(3)},${act.s.toFixed(3)})`);
    if (act.kind === 'dogs') {
      legs.forEach((ls, i) => { const p = now / 85 + i * 1.1; ls.forEach((l, j) => { const a = Math.sin(p + (j < 2 ? 0 : Math.PI) + (j % 2) * .5) * 2.6;
        l.setAttribute('x2', (+l.getAttribute('x1') + a).toFixed(2)); l.setAttribute('y2', (-Math.abs(Math.cos(p + j)) * .6).toFixed(2)); }); });
      tails.forEach((t, i) => t.setAttribute('transform', `rotate(${(Math.sin(now / 110 + i) * 12).toFixed(1)} -5 -5.6)`));
      if (Math.random() < .25) kick(null, x - 70 * act.s, act.y, 1);
    } else {
      lamp.setAttribute('opacity', (window.__wx && window.__wx.day < .5) ? 1 : 0);
      if (Math.random() < .55) kick(null, x + 14 * act.s, act.y - 1, 2);
    }
    // leaving: thaw mid-crossing and they still finish the crossing (nobody falls through on a showcase site)
    if (k >= 1) { act.el.setAttribute('opacity', 0); act = null; nextAt = now + 1800; }
  };
  requestAnimationFrame(loop);
})();
