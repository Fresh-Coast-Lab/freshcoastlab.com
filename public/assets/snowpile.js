// Snow piles up on the sign while it snows (up to about a foot) and melts when it warms up,
// faster the warmer it is. The pile follows the sign's real top edges: we read the sign image's
// alpha channel, find the top surface of each column, and grow a lumpy drift on it.
(() => {
  const orbit = document.querySelector('.hero .orbit'), sign = document.getElementById('neon');
  if (!orbit || !sign) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'snowpile'; cv.setAttribute('aria-hidden', 'true');
  orbit.append(cv);
  const ctx = cv.getContext('2d');
  let surface = null, bottom = null, base = null, W = 0, H = 0; // surface[x] = y of the top edge in image pixels (or -1 where there's no shelf)
  const FOOT = 26; // a foot of snow, in image pixels (the panel is roughly 180 px tall: a sign ~7 ft tall)
  const noise = (x) => Math.sin(x * .11) * .5 + Math.sin(x * .037 + 1.3) * .35 + Math.sin(x * .23 + 4.1) * .15;

  const scan = () => {
    const img = new Image(); img.src = sign.currentSrc || sign.src;
    img.decode().then(() => {
      W = img.naturalWidth; H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const a = x.getImageData(0, 0, W, H).data;
      surface = new Float32Array(W).fill(-1); bottom = new Float32Array(W).fill(-1);
      for (let i = 0; i < W; i++) {
        // the first solid run at least 12 px deep is a shelf snow can sit on (skips the thin starburst rays)
        let run = 0;
        for (let y = 0; y < H; y++) {
          if (a[(y * W + i) * 4 + 3] > 200) { if (++run >= 12) { surface[i] = y - run + 1; break; } }
          else run = 0;
        }
        if (surface[i] >= 0) { let y = surface[i]; while (y < H - 1 && a[((y + 1) * W + i) * 4 + 3] > 200) y++; bottom[i] = y; }
      }
      // smooth the surface and drop isolated columns
      const s2 = Float32Array.from(surface);
      for (let i = 2; i < W - 2; i++) if (surface[i] >= 0) {
        const nb = [surface[i - 2], surface[i - 1], surface[i + 1], surface[i + 2]].filter((v) => v >= 0 && Math.abs(v - surface[i]) < 8);
        if (nb.length < 2) s2[i] = -1; else s2[i] = (surface[i] + nb.reduce((p, v) => p + v, 0)) / (nb.length + 1);
      }
      surface = s2;
      // the foot of the post: the lowest solid row and how wide it is there, so a drift can bank up around it
      for (let y = H - 1; y > H * .6 && !base; y--) {
        let x0 = -1, x1 = -1;
        for (let i = 0; i < W; i++) if (a[(y * W + i) * 4 + 3] > 200) { if (x0 < 0) x0 = i; x1 = i; }
        if (x1 - x0 > 20) base = { y, x0, x1 };
      }
      cv.width = W; cv.height = H;
      draw(depth, true);
    }).catch(() => {});
  };
  scan();

  let depth = 0, drawn = -1, drips = [], runs = [];
  const spawn = (heat) => {
    for (let tries = 0; tries < 10; tries++) {
      const i = Math.floor(Math.random() * W); if (!(surface[i] >= 0)) continue;
      const edge = surface[i + 4] === undefined || surface[i + 4] < 0 || surface[i - 4] === undefined || surface[i - 4] < 0;
      if (edge || Math.random() < .35) { drips.push({ x: i + (Math.random() - .5) * 3, y: surface[i] + 2, v: 20 * Math.random() }); return; }
      if (bottom && bottom[i] > surface[i] + 20) { runs.push({ x: i, y: surface[i] + 3, end: bottom[i], v: 40 + 90 * heat + Math.random() * 30, len: 2, life: 3, dropped: false }); return; }
    }
  };
  function draw(d, force) {
    if (!surface || (!force && Math.abs(d - drawn) < .004 && !drips.length && !runs.length)) return;
    drawn = d;
    ctx.clearRect(0, 0, W, H);
    if (d > .002) {
      const h = d * FOOT;
      // the drift: ends taper where a shelf starts or stops, so the pile has rounded shoulders
      ctx.beginPath();
      let open = false, startX = 0;
      const flush = (endX) => {
        if (!open) return;
        for (let i = endX; i >= startX; i--) ctx.lineTo(i, surface[i] + .5);
        ctx.closePath(); open = false;
      };
      for (let i = 0; i < W; i++) {
        const y = surface[i];
        if (y < 0 || (i > 0 && surface[i - 1] >= 0 && Math.abs(y - surface[i - 1]) > 6)) { flush(i - 1); if (y < 0) continue; }
        if (!open) { open = true; startX = i; ctx.moveTo(i, y); }
        let edge = 0; for (let k = 1; k <= 14; k++) { if (surface[i - k] === undefined || surface[i - k] < 0 || surface[i + k] === undefined || surface[i + k] < 0) { edge = 1 - k / 15; break; } }
        const top = y - h * (1 - edge * edge) * (.86 + .14 * noise(i));
        ctx.lineTo(i, top);
      }
      flush(W - 1);
      // and a drift banked up around the foot of the post: wider than the base, highest against it, a little lopsided from the wind
      if (base) {
        const y0 = Math.min(H - 1, base.y + 2), half = (base.x1 - base.x0) / 2 + 26 + 30 * d, mid = (base.x0 + base.x1) / 2 + 6 * d;
        const peak = Math.min(y0 - 2, h * 1.15 + 3 * d);
        ctx.moveTo(mid - half, y0);
        for (let i = -half; i <= half; i += 2) {
          const u = i / half, bump = Math.pow(Math.max(0, 1 - u * u), .7) * (1 - .18 * u);
          ctx.lineTo(mid + i, y0 - peak * bump * (.9 + .1 * noise(mid + i + 40)));
        }
        ctx.lineTo(mid + half, y0); ctx.closePath();
      }
      const g = ctx.createLinearGradient(0, 0, 0, H * .7);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D6E4F0');
      ctx.fillStyle = g; ctx.shadowColor = 'rgba(180,215,255,.55)'; ctx.shadowBlur = 6; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(150,180,210,.6)'; ctx.lineWidth = .8; ctx.stroke();
    }
    // meltwater drips off the edges
    ctx.strokeStyle = 'rgba(205,232,255,.55)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    runs.forEach((r) => { ctx.globalAlpha = Math.min(1, r.life); ctx.beginPath(); ctx.moveTo(r.x, Math.max(r.y - r.len, 0)); ctx.lineTo(r.x + Math.sin(r.y * .2) * .6, r.y); ctx.stroke();
      ctx.fillStyle = 'rgba(225,242,255,.9)'; ctx.beginPath(); ctx.arc(r.x, r.y, 1.3, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(210,235,255,.9)';
    drips.forEach((p) => { const st = Math.min(5, 1.6 + p.v / 160); ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.1, st, 0, 0, 7); ctx.fill(); });
  }

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const wx = window.__wx || {}, temp = typeof window.__tempF === 'number' ? window.__tempF : 50;
    const snowing = wx.snow || 0;
    // heavier snow piles up faster and deeper: a dusting tops out at a couple of inches, a blizzard reaches the full foot
    if (snowing > .02 && temp <= 34) {
      // it always builds toward a full foot; precipitation sets the pace (~20 s in a blizzard, a couple of minutes for flurries)
      const rate = .0015 + Math.pow(snowing, 1.4) * 1.6 / 35;
      // past a foot it keeps coming, slower, as long as nobody stops it (the bank in lakesnow.js eventually buries the sign anyway)
      depth = Math.min(2.4, depth + rate * (depth < 1 ? 1 : .2) * dt);
    }
    if (temp > 33 && depth > 0) {
      const heat = Math.min(1, (temp - 32) / 63);           // 0 at freezing, 1 at 95F
      const rate = .02 + .32 * Math.pow(heat, 1.6);         // 40F: ~30 s to melt a foot; 60F: ~10 s; 95F: ~3 s
      depth = Math.max(0, depth - rate * dt);
      if (!reduce && surface) {
        const flow = (6 + 70 * heat) * Math.min(1, depth * 4 + .2); // water per second scales with heat and with what's left
        let n = flow * dt; while (n > 0) { if (Math.random() < n) spawn(heat); n -= 1; }
      }
    }
    // rivulets run down the face of the sign and fall off its bottom edge; drips fall off the ends of the pile
    runs.forEach((r) => { if (r.y < r.end) { r.y += r.v * dt; r.len = Math.min(18, r.len + 40 * dt); } else if (!r.dropped) { r.dropped = true; drips.push({ x: r.x, y: r.end + 1, v: 30 }); } r.life -= dt; });
    runs = runs.filter((r) => r.life > 0);
    drips.forEach((p) => { p.v += 420 * dt; p.y += p.v * dt; });
    drips = drips.filter((p) => p.y < H);
    draw(depth, false);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__snowpile = { set: (v) => { depth = v; draw(depth, true); }, get depth() { return depth; } };
})();
