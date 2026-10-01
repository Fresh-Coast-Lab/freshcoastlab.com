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
  let surface = null, W = 0, H = 0; // surface[x] = y of the top edge in image pixels (or -1 where there's no shelf)
  const FOOT = 26; // a foot of snow, in image pixels (the panel is roughly 180 px tall: a sign ~7 ft tall)
  const noise = (x) => Math.sin(x * .11) * .5 + Math.sin(x * .037 + 1.3) * .35 + Math.sin(x * .23 + 4.1) * .15;

  const scan = () => {
    const img = new Image(); img.src = sign.currentSrc || sign.src;
    img.decode().then(() => {
      W = img.naturalWidth; H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const a = x.getImageData(0, 0, W, H).data;
      surface = new Float32Array(W).fill(-1);
      for (let i = 0; i < W; i++) {
        // the first solid run at least 12 px deep is a shelf snow can sit on (skips the thin starburst rays)
        let run = 0;
        for (let y = 0; y < H; y++) {
          if (a[(y * W + i) * 4 + 3] > 200) { if (++run >= 12) { surface[i] = y - run + 1; break; } }
          else run = 0;
        }
      }
      // smooth the surface and drop isolated columns
      const s2 = Float32Array.from(surface);
      for (let i = 2; i < W - 2; i++) if (surface[i] >= 0) {
        const nb = [surface[i - 2], surface[i - 1], surface[i + 1], surface[i + 2]].filter((v) => v >= 0 && Math.abs(v - surface[i]) < 8);
        if (nb.length < 2) s2[i] = -1; else s2[i] = (surface[i] + nb.reduce((p, v) => p + v, 0)) / (nb.length + 1);
      }
      surface = s2;
      cv.width = W; cv.height = H;
      draw(depth, true);
    }).catch(() => {});
  };
  scan();

  let depth = 0, drawn = -1, drips = [];
  function draw(d, force) {
    if (!surface || (!force && Math.abs(d - drawn) < .004 && !drips.length)) return;
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
      const g = ctx.createLinearGradient(0, 0, 0, H * .7);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D6E4F0');
      ctx.fillStyle = g; ctx.shadowColor = 'rgba(180,215,255,.55)'; ctx.shadowBlur = 6; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(150,180,210,.6)'; ctx.lineWidth = .8; ctx.stroke();
    }
    // meltwater drips off the edges
    ctx.fillStyle = 'rgba(200,230,255,.85)';
    drips.forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.2, 2, 0, 0, 7); ctx.fill(); });
  }

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const wx = window.__wx || {}, temp = typeof window.__tempF === 'number' ? window.__tempF : 50;
    const snowing = wx.snow || 0;
    // heavier snow piles up faster and deeper: a dusting tops out at a couple of inches, a blizzard reaches the full foot
    if (snowing > .02 && temp <= 34) {
      const cap = Math.min(1, .15 + snowing * .9), rate = snowing * snowing * 1.6 / 35; // ~22 s to a foot at 100%, minutes for a light snow
      if (depth < cap) depth = Math.min(cap, depth + rate * dt);
    }
    if (temp > 33 && depth > 0) {
      const rate = (temp - 32) / 300; // 40F: ~40 s to melt a foot; 95F: ~5 s
      depth = Math.max(0, depth - rate * dt);
      if (!reduce && surface && Math.random() < Math.min(.6, rate * 6) * dt * 30) {
        // a drip from a random spot along the pile's lower edge
        for (let tries = 0; tries < 8; tries++) { const i = Math.floor(Math.random() * W); if (surface[i] >= 0 && surface[i + 6] < 0) { drips.push({ x: i + 2, y: surface[i] + 4, v: 0 }); break; } }
      }
    }
    drips.forEach((p) => { p.v += 300 * dt; p.y += p.v * dt; });
    drips = drips.filter((p) => p.y < H);
    draw(depth, false);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__snowpile = { set: (v) => { depth = v; draw(depth, true); }, get depth() { return depth; } };
})();
