// Long snowfalls: the frozen lake whitens over, the wind drives snow across the ice in streamers, and if
// nobody touches the controls a snowbank keeps building from the bottom of the view until it buries everything.
// More precipitation, faster. Above freezing it all melts back.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HZ = 0.36;
  const mk = (cls) => { const c = document.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true'); hero.append(c); return c; };
  const back = mk('lakesnow-layer back'), front = mk('lakesnow-layer front'); // back: under the sign. front: over it
  const bx = back.getContext('2d'), fx = front.getContext('2d');
  let W = 0, H = 0, horizon = 0, dpr = 1;
  const size = () => {
    const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ);
    dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of [back, front]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    bx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size(); new ResizeObserver(size).observe(hero);
  const noise = (x) => Math.sin(x * .013) * .5 + Math.sin(x * .031 + 1.7) * .3 + Math.sin(x * .071 + 4.2) * .2;

  let cover = 0, bank = 0, streams = [], last = performance.now(), T = 0, backDirty = true, frontDirty = true, cap = .3, capAt = -9;
  // one wisp, drawn once and stretched per streamer (a gradient per streamer per frame was the expensive part)
  const wisp = document.createElement('canvas'); wisp.width = 128; wisp.height = 8;
  { const w = wisp.getContext('2d'), g = w.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(245,250,255,0)'); g.addColorStop(.7, 'rgba(245,250,255,1)'); g.addColorStop(1, 'rgba(245,250,255,0)');
    w.fillStyle = g; w.beginPath(); w.ellipse(64, 4, 64, 3, 0, 0, 7); w.fill(); }
  // a streamer: a long, low, fast wisp of snow skating over the ice
  const spawn = (wind, fromEdge) => {
    const y = horizon + 4 + Math.pow(Math.random(), 1.6) * (H - horizon) * .9;
    const depth = (y - horizon) / (H - horizon); // 0 far out, 1 at our feet
    streams.push({ x: fromEdge ? -120 - Math.random() * 200 : Math.random() * W, y, depth,
      len: (30 + Math.random() * 90) * (.4 + depth), v: (60 + 260 * wind) * (.35 + depth) * (.8 + Math.random() * .4),
      a: .12 + Math.random() * .3, wob: Math.random() * 6 });
  };

  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now; T += dt;
    const wx = window.__wx || {}, temp = typeof window.__tempF === 'number' ? window.__tempF : 50;
    const snow = wx.snow || 0, ice = wx.ice || 0, wind = Math.min(1, (wx.wind || 0));
    if (snow > .02 && temp <= 34) {
      cover = Math.min(1, cover + (.006 + Math.pow(snow, 1.2) * .05) * ice * dt);          // the ice whitens in ~20 s of blizzard
      // a blizzard buries the view in ~5 min, flurries in half an hour; on live weather it stops at a modest drift
      if (T - capAt > 1) { capAt = T; cap = /(^|; )fcl_sky=/.test(document.cookie) ? 1.02 : .3; } // the cookie, once a second rather than every frame
      if (bank < cap) bank = Math.min(cap, bank + (.00035 + Math.pow(snow, 1.4) * .0028) * dt);
    }
    if (temp > 33) {
      const heat = Math.min(1, (temp - 32) / 63);
      cover = Math.max(0, cover - (.03 + .25 * heat) * dt);
      bank = Math.max(0, bank - (.006 + .06 * heat) * dt);
    }
    if (ice < .3) cover = Math.max(0, cover - .2 * dt); // open water swallows it

    // back layer: snow lying on the ice, combed into wind lines
    if (cover > .005 || backDirty) bx.clearRect(0, 0, W, H);
    backDirty = cover > .005;
    if (cover > .005) {
      const g = bx.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, `rgba(220,232,244,${(.35 * cover).toFixed(3)})`); g.addColorStop(1, `rgba(236,244,252,${(.7 * cover).toFixed(3)})`);
      bx.fillStyle = g; bx.fillRect(0, horizon, W, H - horizon);
      bx.strokeStyle = `rgba(255,255,255,${(.12 * cover).toFixed(3)})`; bx.lineWidth = 1;
      for (let i = 0; i < 18; i++) { const y = horizon + Math.pow((i + .5) / 18, 1.5) * (H - horizon); const off = noise(i * 97) * W * .3;
        bx.beginPath(); bx.moveTo(off, y); bx.bezierCurveTo(W * .3 + off, y - 2, W * .6, y + 2, W + off, y - 1); bx.stroke(); }
    }

    // front layer: blowing snow, then the bank
    if (frontDirty) fx.clearRect(0, 0, W, H);
    const blowing = !reduce && ice > .55 && wind > .05 ? wind * Math.min(1, ice * 1.4) * (.4 + .6 * Math.max(cover, snow)) : 0;
    const want = Math.round(blowing * (W < 700 ? 45 : 90));
    while (streams.length < want) spawn(wind, streams.length > want * .5);
    if (streams.length > want) streams.length = Math.max(0, streams.length - 2); // die back gently
    for (const s of streams) {
      s.x += s.v * dt;
      if (s.x - s.len > W) s.x = -s.len - Math.random() * 100;
      const yy = s.y + Math.sin(T * 2 + s.wob + s.x * .01) * 2 * s.depth, th = 1.5 + 5 * s.depth;
      fx.globalAlpha = s.a * blowing;
      fx.drawImage(wisp, s.x - s.len, yy - th / 2, s.len, th);
    }
    fx.globalAlpha = 1;
    if (bank > .002) {
      // a wind-sculpted drift line, rising from the bottom of the view; at 1 it reaches the top
      const top = H - bank * (H + 40);
      const lean = wind * 30;
      fx.beginPath(); fx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) {
        const y = top + noise(x + 300) * (14 + 26 * Math.min(1, bank * 3)) + (x / W) * lean - lean / 2 + Math.sin(x * .004 + T * .05) * 6;
        fx.lineTo(x, y);
      }
      fx.lineTo(W, H); fx.closePath();
      const g = fx.createLinearGradient(0, top - 40, 0, Math.min(H, top + 220));
      g.addColorStop(0, '#F4F8FC'); g.addColorStop(1, '#C9D7E6');
      fx.fillStyle = g; fx.shadowColor = 'rgba(170,200,235,.6)'; fx.shadowBlur = 10; fx.fill(); fx.shadowBlur = 0;
      // the crest catches a little light
      fx.strokeStyle = 'rgba(255,255,255,.85)'; fx.lineWidth = 1.5; fx.stroke();
      // spindrift whipped off the crest
      if (!reduce && wind > .2) for (let i = 0; i < wind * 10; i++) {
        const x = Math.random() * W, y = top + noise(x + 300) * 20 - Math.random() * 14;
        fx.fillStyle = `rgba(250,252,255,${(Math.random() * .6).toFixed(2)})`; fx.fillRect(x, y, 1.5 + wind * 6, 1.2);
      }
    }
    frontDirty = streams.length > 0 || bank > .002;
  };
  requestAnimationFrame(frame);
  window.__lakesnow = { set(c, b) { cover = c; bank = b; }, get bank() { return bank; }, get cover() { return cover; } };
})();
