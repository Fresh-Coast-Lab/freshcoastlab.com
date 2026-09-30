// "Ninety years, one library" - a scroll-driven particle story of the family media pipeline.
// Each particle is a photo or clip. Real numbers; no real photos, faces or names.
(() => {
  const cv = document.getElementById('arc-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const steps = [...document.querySelectorAll('.arc-step')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 820px)').matches;
  const N = small ? 520 : 1100;

  const COL = { aurora: [61, 242, 176], aqua: [124, 211, 224], violet: [155, 140, 255], ember: [255, 106, 61], amber: [255, 200, 110], red: [255, 107, 97], dim: [70, 88, 104] };
  const rnd = (a, b) => a + Math.random() * (b - a);
  // deterministic per-particle traits
  const P = Array.from({ length: N }, (_, i) => {
    const r = Math.random();
    return {
      i, src: i % 3, // which Google account
      dup: r < 0.11, live: r >= 0.11 && r < 0.16, // duplicate / Live Photo motion fragment
      video: r >= 0.16 && r < 0.3, // home video clip
      reel: r >= 0.3 && r < 0.335, // film reel frame
      junk: r >= 0.3 - 0.02 && r < 0.3, // accidental clip (subset of videos)
      face: (i * 7919) % 9, // face cluster id
      x: Math.random(), y: Math.random(), tx: 0.5, ty: 0.5, a: 0, ta: 1, s: 2, ts: 2, c: COL.aqua, tc: COL.aqua, w: 1, tw: 1, jit: Math.random() * 6.28,
    };
  });

  let W = 0, H = 0, DPR = 1, stage = 0, t0 = performance.now();
  const resize = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout(stage);
    if (reduce) { snap(); draw(0); }
  };

  // ---------- stage layouts (targets in 0..1 space) ----------
  const grid = (list, x0, y0, x1, y1) => {
    const n = list.length, cols = Math.max(1, Math.round(Math.sqrt(n * (x1 - x0) / (y1 - y0) * (W / H || 1.4))));
    const rows = Math.ceil(n / cols);
    list.forEach((p, k) => { const cx = k % cols, cy = Math.floor(k / cols); p.tx = x0 + (cx + 0.5) / cols * (x1 - x0); p.ty = y0 + (cy + 0.5) / rows * (y1 - y0); });
  };
  const overlays = { labels: [], axis: null, lines: null, bins: [] };
  const layout = (st) => {
    overlays.labels = []; overlays.axis = null; overlays.lines = null; overlays.bins = [];
    P.forEach((p) => { p.ta = 1; p.ts = 2; p.tw = 1; });
    const keep = P.filter((p) => !p.dup && !p.live);
    const photos = keep.filter((p) => !p.video && !p.reel), vids = keep.filter((p) => p.video && !p.junk), reels = keep.filter((p) => p.reel);
    if (st === 0) { // three accounts
      P.forEach((p) => { const cy = [0.22, 0.5, 0.78][p.src]; const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 0.13; p.tx = 0.2 + Math.cos(a) * r * 0.7; p.ty = cy + Math.sin(a) * r; p.tc = [COL.aurora, COL.aqua, COL.violet][p.src]; });
      overlays.labels = [['ACCOUNT 1', 0.36, 0.23], ['ACCOUNT 2', 0.36, 0.51], ['ACCOUNT 3', 0.36, 0.79], ['ONE LIBRARY', 0.72, 0.5]];
      overlays.lines = 'merge';
    } else if (st === 1) { // merged + dedupe
      P.forEach((p) => { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 0.3; p.tx = 0.5 + Math.cos(a) * r * 0.75; p.ty = 0.44 + Math.sin(a) * r * 0.9; p.tc = mixc(COL.aqua, [COL.aurora, COL.aqua, COL.violet][p.src], 0.35); });
      P.filter((p) => p.dup).forEach((p) => { p.tx = rnd(0.12, 0.42); p.ty = rnd(0.9, 0.97); p.tc = COL.red; p.ta = 0.55; p.ts = 1.6; });
      P.filter((p) => p.live).forEach((p) => { p.tx = rnd(0.58, 0.88); p.ty = rnd(0.9, 0.97); p.tc = COL.amber; p.ta = 0.55; p.ts = 1.6; });
      overlays.bins = [['DUPLICATES: LOWER-QUALITY COPY', 0.27, 0.86], ['LIVE PHOTO MOTION FRAGMENTS', 0.73, 0.86]];
    } else if (st === 2) { // split
      P.filter((p) => p.dup || p.live).forEach((p) => { p.ta = 0; });
      grid(photos, 0.06, 0.12, 0.56, 0.9); photos.forEach((p) => { p.tc = COL.aqua; });
      grid([...vids, ...reels, ...keep.filter((p) => p.junk)], 0.66, 0.2, 0.94, 0.8); [...vids, ...reels].forEach((p) => { p.tc = COL.ember; p.tw = 3; });
      keep.filter((p) => p.junk).forEach((p) => { p.tc = COL.ember; p.tw = 3; });
      overlays.labels = [['PHOTOS', 0.31, 0.06], ['HOME VIDEO', 0.8, 0.12]];
    } else if (st === 3) { // stitch the day
      P.forEach((p) => { p.ta = 0; });
      const rows = 7, per = Math.ceil(vids.length / rows);
      vids.forEach((p, k) => { const row = Math.floor(k / per), col = k % per; p.tx = 0.14 + col * (0.72 / per); p.ty = 0.16 + row * (0.68 / (rows - 1)); p.ta = 1; p.tc = COL.ember; p.tw = Math.max(3, (0.72 / per) * W / 2.2); p.ts = 3; });
      keep.filter((p) => p.junk).forEach((p) => { p.tx = rnd(0.2, 0.8); p.ty = 1.08; p.ta = 0; p.tc = COL.red; p.tw = 3; });
      overlays.labels = [['ONE EPISODE PER DAY, A CHAPTER PER CLIP', 0.5, 0.06]];
      overlays.lines = 'episodes';
    } else if (st === 4) { // reels onto the timeline
      P.forEach((p) => { p.ta = 0; });
      const all = [...reels, ...vids];
      all.forEach((p, k) => { const isReel = p.reel; const yr = isReel ? rnd(1934, 1978) : rnd(1985, 2025); p.tx = 0.06 + (yr - 1930) / 100 * 0.88; p.ty = 0.5 + rnd(-0.16, 0.16) * (isReel ? 1 : 0.7); p.ta = 1; p.tc = isReel ? COL.amber : COL.ember; p.tw = isReel ? 4 : 2; p.ts = isReel ? 3 : 2; });
      overlays.axis = true;
    } else if (st === 5) { // faces
      P.forEach((p) => { p.ta = 0; });
      const pool = P.filter((p) => !p.dup && !p.live).slice(0, small ? 300 : 620);
      const K = 9, centers = Array.from({ length: K }, (_, k) => [0.14 + (k % 3) * 0.36 + rnd(-0.04, 0.04), 0.2 + Math.floor(k / 3) * 0.3 + rnd(-0.03, 0.03)]);
      pool.forEach((p) => { const [cx, cy] = centers[p.face]; const a = rnd(0, 6.28), r = Math.pow(Math.random(), 1.6) * 0.075; p.tx = cx + Math.cos(a) * r; p.ty = cy + Math.sin(a) * r * 1.2; p.ta = 0.95; p.tc = [COL.aurora, COL.aqua, COL.violet][p.face % 3]; p.ts = 2.2; });
      overlays.lines = { centers };
    } else if (st === 6) { // title cards
      P.forEach((p) => { p.ta = 0; });
      const cards = vids.slice(0, small ? 24 : 42);
      grid(cards, 0.08, 0.14, 0.92, 0.9); cards.forEach((p) => { p.ta = 1; p.tc = COL.aqua; p.tw = 1; p.ts = 0; });
      overlays.lines = { cards };
    } else if (st === 7) { // staging gate
      P.forEach((p) => { p.ta = 0; });
      vids.forEach((p, k) => { const approved = k % 11 !== 0; p.ta = 1; p.ts = 2.4; p.tw = 1;
        if (approved) { p.tx = rnd(0.62, 0.94); p.ty = rnd(0.2, 0.8); p.tc = COL.aurora; } else { p.tx = rnd(0.36, 0.48); p.ty = rnd(0.84, 0.94); p.tc = COL.red; p.ta = 0.6; } });
      overlays.labels = [['STAGING', 0.18, 0.12], ['YOUR APPROVAL', 0.47, 0.12], ['PUBLISHED', 0.78, 0.12]];
      overlays.lines = 'gate';
    } else { // library
      P.forEach((p) => { p.ta = 0; });
      const cols = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s+'];
      const libs = [...reels, ...vids];
      libs.forEach((p, k) => { const c = p.reel ? k % 3 : 3 + (k % 3); const idx = libs.filter((q, j) => j < k && (q.reel ? j % 3 : 3 + (j % 3)) === c).length;
        p.tx = 0.1 + c * 0.16 + ((idx % 5) - 2) * 0.016; p.ty = 0.84 - Math.floor(idx / 5) * 0.045; p.ta = 1; p.tc = c < 3 ? COL.amber : COL.aurora; p.tw = 3; p.ts = 3; });
      overlays.labels = cols.map((c, k) => [c, 0.1 + k * 0.16, 0.93]);
    }
  };
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const snap = () => P.forEach((p) => { p.x = p.tx; p.y = p.ty; p.a = p.ta; p.s = p.ts; p.c = p.tc; p.w = p.tw; });

  // ---------- render ----------
  const draw = (tm) => {
    ctx.clearRect(0, 0, W, H);
    const k = reduce ? 1 : 0.075;
    // overlays behind particles
    ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    if (overlays.axis) {
      ctx.strokeStyle = 'rgba(124,211,224,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.72); ctx.lineTo(W * 0.94, H * 0.72); ctx.stroke();
      ctx.fillStyle = 'rgba(147,164,179,.9)';
      for (let d = 1930; d <= 2020; d += 10) { const x = W * (0.06 + (d - 1930) / 100 * 0.88); ctx.fillRect(x, H * 0.72 - 4, 1, 8); if (!small || d % 20 === 10) ctx.fillText(d + 's', x, H * 0.72 + 20); }
      ctx.fillStyle = 'rgba(255,200,110,.95)'; ctx.fillText('FILM REELS', W * (0.06 + 26 / 100 * 0.88), H * 0.26);
      ctx.fillStyle = 'rgba(255,106,61,.95)'; ctx.fillText('PHONES AND CAMCORDERS', W * (0.06 + 76 / 100 * 0.88), H * 0.26);
    }
    if (overlays.lines === 'merge') {
      ctx.strokeStyle = 'rgba(124,211,224,.18)'; ctx.lineWidth = 1;
      [0.22, 0.5, 0.78].forEach((cy) => { ctx.beginPath(); ctx.moveTo(W * 0.32, H * cy); ctx.bezierCurveTo(W * 0.5, H * cy, W * 0.5, H * 0.5, W * 0.62, H * 0.5); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(W * 0.72, H * 0.5, Math.min(W, H) * 0.12, 0, 6.28); ctx.strokeStyle = 'rgba(61,242,176,.35)'; ctx.stroke();
    }
    if (overlays.lines === 'gate') {
      ctx.strokeStyle = 'rgba(61,242,176,.5)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(W * 0.47, H * 0.18); ctx.lineTo(W * 0.47, H * 0.8); ctx.stroke(); ctx.setLineDash([]);
    }
    if (overlays.lines === 'episodes') {
      ctx.strokeStyle = 'rgba(255,106,61,.22)';
      for (let r = 0; r < 7; r++) { const y = H * (0.16 + r * (0.68 / 6)); ctx.beginPath(); ctx.moveTo(W * 0.12, y); ctx.lineTo(W * 0.88, y); ctx.stroke(); ctx.fillStyle = 'rgba(147,164,179,.8)'; ctx.textAlign = 'right'; ctx.fillText('DAY ' + (r + 1), W * 0.1, y + 4); ctx.textAlign = 'center'; }
    }
    if (overlays.lines && overlays.lines.centers) {
      overlays.lines.centers.forEach(([cx, cy], kk) => { ctx.strokeStyle = 'rgba(155,140,255,.35)'; ctx.beginPath(); ctx.arc(W * cx, H * cy, Math.min(W, H) * 0.09, 0, 6.28); ctx.stroke();
        ctx.fillStyle = 'rgba(232,238,242,.85)'; ctx.fillText('PERSON ' + String(kk + 1).padStart(2, '0'), W * cx, H * cy - Math.min(W, H) * 0.1 - 6); });
    }
    ctx.fillStyle = 'rgba(147,164,179,.95)'; ctx.font = '600 11px "JetBrains Mono", monospace';
    overlays.labels.forEach(([txt, x, y]) => ctx.fillText(txt, W * x, H * y));
    overlays.bins.forEach(([txt, x, y]) => { ctx.fillStyle = 'rgba(147,164,179,.8)'; ctx.fillText(txt, W * x, H * y); });
    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += (p.ta - p.a) * k; p.s += (p.ts - p.s) * k; p.w += (p.tw - p.w) * k;
      p.c = mixc(p.c, p.tc, k);
      if (p.a < 0.02) continue;
      const wob = reduce ? 0 : Math.sin(tm / 900 + p.jit) * 0.6;
      const x = p.x * W + wob, y = p.y * H + wob * 0.6;
      ctx.fillStyle = `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${p.a})`;
      if (p.w > 1.5) ctx.fillRect(x - p.w / 2, y - 1.2, p.w, 2.4); else if (p.s > 0.2) { ctx.beginPath(); ctx.arc(x, y, p.s, 0, 6.28); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (overlays.lines && overlays.lines.cards) {
      overlays.lines.cards.forEach((p) => { const x = p.x * W, y = p.y * H, cw = Math.min(64, W * 0.08), ch = cw * 0.56;
        ctx.fillStyle = 'rgba(6,10,18,.92)'; ctx.fillRect(x - cw / 2, y - ch / 2, cw, ch); ctx.strokeStyle = 'rgba(124,211,224,.5)'; ctx.strokeRect(x - cw / 2, y - ch / 2, cw, ch);
        ctx.fillStyle = 'rgba(232,238,242,.9)'; ctx.fillRect(x - cw * 0.32, y - 4, cw * 0.64, 2.5); ctx.fillStyle = 'rgba(147,164,179,.7)'; ctx.fillRect(x - cw * 0.22, y + 1, cw * 0.44, 1.5);
        ctx.fillStyle = 'rgba(255,106,61,.9)'; ctx.font = '600 8px "JetBrains Mono", monospace'; ctx.fillText(String(1987 + (p.i * 7) % 38), x, y + ch / 2 - 3); });
    }
  };

  // ---------- scroll story ----------
  const counters = [...document.querySelectorAll('[data-count]')];
  const fmt = (n) => n.toLocaleString('en-US');
  const countUp = (elx) => {
    if (elx.dataset.done) return; elx.dataset.done = 1;
    const target = Number(elx.dataset.count);
    if (reduce) { elx.textContent = fmt(target); return; }
    const t1 = performance.now();
    const f = (now) => { const t = Math.min(1, (now - t1) / 1400); elx.textContent = fmt(Math.round(target * (1 - Math.pow(1 - t, 3)))); if (t < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
  const setStage = (st) => {
    if (st === stage && W) return;
    stage = st; layout(st);
    steps.forEach((s, k) => s.classList.toggle('on', k === st));
    steps[st].querySelectorAll('[data-count]').forEach(countUp);
    if (reduce) { snap(); draw(0); }
  };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) setStage(steps.indexOf(e.target)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));

  let visible = false, raf = 0;
  const loop = (tm) => { raf = 0; if (!visible || document.hidden) return; draw(tm); raf = requestAnimationFrame(loop); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(loop); }, { threshold: 0 }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf && !reduce) raf = requestAnimationFrame(loop); });
  addEventListener('resize', resize);
  // start: particles scattered, then gather into stage 0
  P.forEach((p) => { p.x = Math.random(); p.y = Math.random(); p.a = 0; });
  resize(); setStage(0);
  counters.forEach((c) => { if (!c.closest('.arc-step')) countUp(c); });
})();
