// Below freezing, the view frosts over like we're looking out a cold window: ferns of ice grow in
// from the corners and edges, heavier the colder it gets (nothing at 32F, a thick rime at -10F).
// The middle always stays clear. The pattern is grown once per size and revealed by a mask.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'frost-layer'; cv.setAttribute('aria-hidden', 'true');
  hero.append(cv);
  const ctx = cv.getContext('2d');
  const pat = document.createElement('canvas'), pc = pat.getContext('2d');
  let W = 0, H = 0, dpr = 1, level = 0, shown = -1, seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // how far in from the nearest edge a point is, 0 at the frame, 1 at the centre
  const inset = (x, y) => Math.min(x / (W / 2), (W - x) / (W / 2), y / (H / 2), (H - y) / (H / 2));

  // one frost feather: a gently curving spine with barbs at about 60 degrees on both sides, shorter toward the tip,
  // and the barbs carry their own little barbs. Built as one path so it's cheap to stroke.
  const feather = (x, y, ang, len, depth) => {
    const curl = (rnd() - .5) * .03, step = 3;
    let px = x, py = y, since = 0;
    pc.moveTo(px, py);
    const barbs = [];
    for (let d = 0; d < len; d += step) {
      ang += curl + (rnd() - .5) * .06;
      px += Math.cos(ang) * step; py += Math.sin(ang) * step;
      pc.lineTo(px, py);
      if (depth > 0 && (since += step) >= (depth > 1 ? 7 : 4)) {
        since = 0;
        const t = d / len, bl = len * (depth > 1 ? .34 : .5) * (1 - t) * (.6 + rnd() * .5);
        if (bl > 2.5) barbs.push([px, py, ang - 1.05 + (rnd() - .5) * .2, bl], [px, py, ang + 1.05 + (rnd() - .5) * .2, bl * (.7 + rnd() * .5)]);
      }
    }
    for (const [bx, by, ba, bl] of barbs) feather(bx, by, ba, bl, depth - 1);
  };

  const grow = () => {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of [cv, pat]) { c.width = W * dpr; c.height = H * dpr; }
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    pc.setTransform(dpr, 0, 0, dpr, 0, 0); pc.clearRect(0, 0, W, H);
    seed = 7;
    const S = Math.min(W, H), phone = W < 700;
    // the rime: a soft frosted haze hugging the frame
    const haze = (x, y, rad) => { const g = pc.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(226,240,252,.32)'); g.addColorStop(.6, 'rgba(214,232,250,.1)'); g.addColorStop(1, 'rgba(214,232,250,0)');
      pc.fillStyle = g; pc.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => haze(x, y, S * .5));
    for (let i = 0; i < 8; i++) { const t = (i + .5) / 8; haze(t * W, rnd() < .5 ? 0 : H, S * .14); haze(rnd() < .5 ? 0 : W, t * H, S * .12); }
    // feathers: crowded in the corners, a few along the edges, all reaching inward
    pc.lineCap = 'round'; pc.lineJoin = 'round';
    const n = phone ? 26 : 48;
    for (let pass = 0; pass < 2; pass++) {
      // a soft wide pass for the frosted body, then a crisp thin pass on top
      pc.strokeStyle = pass ? 'rgba(246,251,255,.55)' : 'rgba(225,240,252,.12)'; pc.lineWidth = pass ? .7 : 2.6;
      seed = 11;
      for (let i = 0; i < n; i++) {
        let x, y;
        if (i < n * .6) { const c = i % 4; x = c % 2 ? W : 0; y = c > 1 ? H : 0; x += (c % 2 ? -1 : 1) * rnd() * S * .1; y += (c > 1 ? -1 : 1) * rnd() * S * .1; }
        else { const e = i % 4, t = .1 + rnd() * .8; x = e === 0 ? 0 : e === 1 ? W : t * W; y = e === 2 ? 0 : e === 3 ? H : t * H; }
        const ang = Math.atan2(H / 2 - y, W / 2 - x) + (rnd() - .5) * 1.3;
        pc.beginPath(); feather(x, y, ang, S * (.1 + rnd() * .2), 2); pc.stroke();
      }
    }
    seed = 23;
    // sparkle: tiny ice crystals scattered in the frosted band
    pc.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < (phone ? 260 : 520); i++) {
      const x = rnd() * W, y = rnd() * H;
      if (inset(x, y) > .55 * rnd() + .1) continue;
      pc.fillRect(x, y, rnd() < .15 ? 1.6 : .9, rnd() < .15 ? 1.6 : .9);
    }
    shown = -1;
  };

  // reveal the pattern from the frame inward: at level 1 the frost reaches about 40% of the way in, the centre never covers
  const paint = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (level < .01) { cv.style.opacity = 0; return; }
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(pat, 0, 0);
    // mask: an elliptical clearing in the middle that shrinks as it gets colder
    ctx.globalCompositeOperation = 'destination-out';
    // ellipse units: 1 = the edge midpoints, ~1.41 = the corners. Clear inside 1 - reach, full frost by 1.2
    const cx = cv.width / 2, cy = cv.height / 2, reach = .12 + .38 * level;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop((1 - reach) / 1.2, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.setTransform(cv.width / 2, 0, 0, cv.height / 2, cx, cy);
    ctx.fillStyle = g; ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    cv.style.opacity = Math.min(1, .15 + level * 1.1).toFixed(2);
  };

  // the hero's size comes from a ResizeObserver, not a getBoundingClientRect every frame (that forced a layout per frame)
  let lastW = 0, lastH = 0, r = hero.getBoundingClientRect();
  new ResizeObserver(() => { r = hero.getBoundingClientRect(); }).observe(hero);
  const tick = () => {
    if (Math.abs(r.width - lastW) > 2 || Math.abs(r.height - lastH) > 40) { lastW = r.width; lastH = r.height; grow(); }
    const t = typeof window.__tempF === 'number' ? window.__tempF : 50;
    const target = Math.max(0, Math.min(1, (32 - t) / 42));
    level += (target - level) * (reduce ? 1 : .03);
    if (Math.abs(level - shown) > .004) { shown = level; paint(); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
