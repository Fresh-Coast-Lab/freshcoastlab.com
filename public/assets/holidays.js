// Holidays: the sign dresses up for the season. Christmas strings old C9 bulbs around the panel, Halloween
// sets a lit jack o' lantern by the post, Thanksgiving spills a horn of plenty at the base, Easter hides eggs
// in the grass and sends the bunny hopping in, and the Fourth of July puts fireworks over the lake.
// Each one switches on three days before its holiday and stays through the day itself (local date).
// Tap the orange compass star in the header to cycle through them by hand; nothing is stored.
// Everything is drawn here (canvas, no images): lights ride on the sign in its own pixel space, ground
// pieces stand in front of the post, and fireworks burst in the sky behind the sign.
(() => {
  const hero = document.querySelector('.hero'), orbit = document.querySelector('.hero .orbit'), sign = document.getElementById('neon');
  if (!hero || !orbit || !sign) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IW = 440, IH = 411, K = 1.24; // sign image pixels; the sign canvas is the sign's box grown by K
  const MX = IW * (K - 1) / 2, MY = IH * (K - 1) / 2;
  const HZ = 0.36, TAU = Math.PI * 2, rnd = Math.random;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const THEMES = ['christmas', 'halloween', 'thanksgiving', 'easter', 'july4'];
  const LABEL = { christmas: 'Christmas', halloween: 'Halloween', thanksgiving: 'Thanksgiving', easter: 'Easter', july4: 'Fourth of July' };
  const ALIAS = { xmas: 'christmas', fourth: 'july4', july: 'july4', 'july 4': 'july4', independence: 'july4', 'fourth of july': 'july4' };

  // ---------- the calendar ----------
  const easter = (y) => { // Meeus/Jones/Butcher, Gregorian
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  };
  const thanksgiving = (y) => { const d = new Date(y, 10, 1); return new Date(y, 10, 1 + ((4 - d.getDay() + 7) % 7) + 21); };
  const dateTheme = (now = new Date()) => {
    const y = now.getFullYear(), today = new Date(y, now.getMonth(), now.getDate()).getTime(), DAY = 864e5;
    const days = { christmas: new Date(y, 11, 25), halloween: new Date(y, 9, 31), thanksgiving: thanksgiving(y), easter: easter(y), july4: new Date(y, 6, 4) };
    for (const k of THEMES) { const n = Math.round((days[k].getTime() - today) / DAY); if (n >= 0 && n <= 3) return k; } // whole days, so a DST change can't shift the window
    return null;
  };

  // ---------- layers ----------
  // the three layers are made the first time a theme comes on; with no theme they hold no pixels at all
  const mk = (cls) => { const c = document.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true'); c.hidden = true; c.width = c.height = 0; return c; };
  let signCv = null, frontCv = null, backCv = null, sx = null, fx = null, bx = null;
  const layers = () => {
    if (signCv) return;
    signCv = mk('hol-sign'); frontCv = mk('hol-front'); backCv = mk('hol-back');
    orbit.append(signCv); // after the snow pile: bulbs poke through the snow
    hero.append(frontCv); // in front of the post, under the storm
    hero.prepend(backCv); // behind the skyline and the sign
    sx = signCv.getContext('2d'); fx = frontCv.getContext('2d'); bx = backCv.getContext('2d');
  };
  // which layers a theme draws on; the rest are hidden and emptied
  const USES = { christmas: 'sf', halloween: 'f', thanksgiving: 'sf', easter: 'f', july4: 'b' };
  let W = 0, H = 0, horizon = 0, phone = false;
  const fit = (cv, w, h, d, on) => { const a = on ? Math.max(1, Math.round(w * d)) : 0, b = on ? Math.max(1, Math.round(h * d)) : 0; if (cv.width !== a || cv.height !== b) { cv.width = a; cv.height = b; } };
  let dprF = 1, dprB = 1, dprS = 1;
  const size = () => {
    if (!signCv) return;
    const r = hero.getBoundingClientRect(); W = r.width; H = r.height; horizon = H * (1 - HZ); phone = W < 700;
    const d = devicePixelRatio || 1, u = USES[shown] || ''; dprF = Math.min(d, 1.5); dprB = Math.min(d, phone ? 1.5 : 1.25); dprS = Math.min(d, 1.5);
    fit(frontCv, W, H, dprF, u.includes('f')); fit(backCv, W, H, dprB, u.includes('b'));
    fit(signCv, signCv.clientWidth || 1, signCv.clientHeight || 1, dprS, u.includes('s'));
  };
  // the sign's box (in hero coordinates), from the orbit so a toppled or jolting sign doesn't throw it off
  const signBox = () => {
    const o = orbit.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const w = o.width * 0.66, hh = w * IH / IW;
    return { x: o.left - h.left + (o.width - w) / 2, y: o.top - h.top + o.height / 2 - 0.52 * hh, s: w / IW };
  };

  // ---------- the sign's outline, read from its alpha channel ----------
  // Erode away the thin rays and orbit rings, keep the solid panel that contains the middle of the sign,
  // grow it back, then cast rays from the middle to find the rim. The post is bridged with a straight line.
  let geo = null;
  const morph = (m, w, h, r, erode) => {
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h), P = new Int32Array(Math.max(w, h) + 1), full = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) P[x + 1] = P[x] + m[y * w + x];
      for (let x = 0; x < w; x++) { const c = P[Math.min(w, x + r + 1)] - P[Math.max(0, x - r)]; t[y * w + x] = erode ? (c === full ? 1 : 0) : (c > 0 ? 1 : 0); }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) P[y + 1] = P[y] + t[y * w + x];
      for (let y = 0; y < h; y++) { const c = P[Math.min(h, y + r + 1)] - P[Math.max(0, y - r)]; o[y * w + x] = erode ? (c === full ? 1 : 0) : (c > 0 ? 1 : 0); }
    }
    return o;
  };
  const scan = () => new Promise((res) => {
    const img = new Image(); img.src = sign.currentSrc || sign.src;
    img.decode().then(() => {
      const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const a = x.getImageData(0, 0, w, h).data, fx_ = IW / w, fy_ = IH / h;
      let m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = a[i * 4 + 3] > 160 ? 1 : 0;
      // the ground line: the lowest solid row under the base plate
      let ground = 392; for (let y = h - 1; y > h * .7; y--) { let n = 0; for (let i = Math.round(w * .35); i < w * .85; i++) if (a[(y * w + i) * 4 + 3] > 200) n++; if (n > w * .08) { ground = y * fy_; break; } }
      // the lettering is cut out of the image (the neon tubes are a separate layer): fill every hole the outside can't reach
      { const out = new Uint8Array(w * h), st = []; for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i); for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
        while (st.length) { const i = st.pop(); if (out[i] || m[i]) continue; out[i] = 1; const px = i % w; if (px > 0) st.push(i - 1); if (px < w - 1) st.push(i + 1); if (i >= w) st.push(i - w); if (i < w * (h - 1)) st.push(i + w); }
        for (let i = 0; i < w * h; i++) if (!out[i]) m[i] = 1; }
      const R = Math.max(3, Math.round(6 / fx_));
      const er = morph(m, w, h, R, true), comp = new Uint8Array(w * h);
      let cx = Math.round(250 / fx_), cy = Math.round(170 / fy_);
      if (!er[cy * w + cx]) { outer: for (let d = 1; d < 60; d++) for (let oy = -d; oy <= d; oy++) for (let ox = -d; ox <= d; ox++) if (er[(cy + oy) * w + cx + ox]) { cx += ox; cy += oy; break outer; } }
      const st = [cy * w + cx]; comp[st[0]] = 1;
      while (st.length) { const i = st.pop(), px = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || comp[j] || !er[j]) continue; if ((j === i - 1 && px === 0) || (j === i + 1 && px === w - 1)) continue; comp[j] = 1; st.push(j); } }
      m = morph(comp, w, h, R, false);
      const N = 540, pts = [], ccx = cx * fx_, ccy = cy * fy_;
      for (let k = 0; k < N; k++) {
        const th = k / N * TAU, dx = Math.cos(th), dy = Math.sin(th); let r = 2;
        while (r < 600) { const X = Math.round(cx + dx * r), Y = Math.round(cy + dy * r); if (X < 0 || Y < 0 || X >= w || Y >= h || !m[Y * w + X]) break; r += .5; }
        const p = [(cx + dx * r) * fx_, (cy + dy * r) * fy_];
        pts.push(p[1] > 283 ? null : p); // below the panel is the post: bridge it
      }
      // bridge gaps with straight lines
      for (let k = 0; k < N; k++) if (!pts[k]) {
        let a0 = k; while (!pts[(a0 - 1 + N) % N]) a0--; let b0 = k; while (!pts[(b0 + 1) % N]) b0++;
        const A = pts[(a0 - 1 + N) % N], B = pts[(b0 + 1) % N], t = (k - a0 + 1) / (b0 - a0 + 2);
        pts[k] = [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];
      }
      // smooth (circular moving average, twice)
      let P = pts;
      for (let pass = 0; pass < 3; pass++) P = P.map((_, k) => { let sx_ = 0, sy_ = 0; for (let j = -3; j <= 3; j++) { const q = P[(k + j + N) % N]; sx_ += q[0]; sy_ += q[1]; } return [sx_ / 7, sy_ / 7]; });
      // resample by arc length
      const L = [0]; for (let k = 1; k <= N; k++) { const p = P[k % N], q = P[k - 1]; L.push(L[k - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); }
      const total = L[N];
      const at = (s) => { s = ((s % total) + total) % total; let lo = 0, hi = N; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (L[md] <= s) lo = md; else hi = md; } const t = (s - L[lo]) / (L[lo + 1] - L[lo] || 1), p = P[lo], q = P[(lo + 1) % N]; return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)]; };
      const sample = (s) => {
        const p = at(s), a1 = at(s - 3), b1 = at(s + 3); let tx = b1[0] - a1[0], ty = b1[1] - a1[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        let nx = ty, ny = -tx; if (nx * (p[0] - ccx) + ny * (p[1] - ccy) < 0) { nx = -nx; ny = -ny; }
        return { x: p[0], y: p[1], nx, ny, tx, ty };
      };
      // start the string at the top of the sign, straight above the middle
      let s0 = 0, best = 1e9; for (let k = 0; k < N; k++) { const p = P[k]; if (p[1] < ccy && Math.abs(p[0] - ccx) < best) { best = Math.abs(p[0] - ccx); s0 = L[k]; } }
      geo = { total, s0, sample, ground, cx: ccx, cy: ccy };
      res(geo);
    }).catch(() => res(null));
  });

  // ---------- small drawing helpers ----------
  const off = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (c, k) => c.map((v) => Math.round(clamp(v * k, 0, 255)));
  const tint = (c, k) => c.map((v) => Math.round(v + (255 - v) * k));
  const glowSprite = (c, px = 64, core = true) => {
    const s = off(px, px), g = s.getContext('2d'), m = px / 2, gr = g.createRadialGradient(m, m, 0, m, m, m);
    if (core) { gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(.12, rgba(tint(c, .5), .95)); gr.addColorStop(.35, rgba(c, .38)); gr.addColorStop(.7, rgba(c, .1)); gr.addColorStop(1, rgba(c, 0)); }
    else { gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(.3, rgba(c, .45)); gr.addColorStop(.65, rgba(c, .12)); gr.addColorStop(1, rgba(c, 0)); }
    g.fillStyle = gr; g.fillRect(0, 0, px, px); return s;
  };
  // night falls on a sprite: darken it toward the blue night and give it a warm rim from the neon above
  const nightify = (g, w, h, dark, rim = .3, k = .6) => {
    if (dark < .02) return;
    g.save(); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(9,13,28,${(k * dark).toFixed(3)})`; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(255,128,80,${(rim * dark).toFixed(3)})`); gr.addColorStop(.45, 'rgba(255,128,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore();
  };
  // a cached sprite drawn in "image pixel" units at a given device scale; rebuilt when scale or darkness changes
  const sprite = (key, wU, hU, oxU, oyU, S, draw) => {
    const c = cache[key];
    if (c && Math.abs(c.S - S) / S < .03 && c.v === ver) return c;
    const cv = off(wU * S, hU * S), g = cv.getContext('2d'); g.scale(S, S); g.translate(oxU, oyU); draw(g, cv);
    return (cache[key] = { cv, S, v: ver, wU, hU, oxU, oyU });
  };
  const blit = (ctx, sp, x, y, S) => ctx.drawImage(sp.cv, x - sp.oxU * S, y - sp.oyU * S, sp.wU * S, sp.hU * S);
  let cache = {}, ver = 0, darkQ = -1, snowQ = -1;

  // =====================================================================================================
  // CHRISTMAS: C9 bulbs on a drooping wire around the rim
  // =====================================================================================================
  const BULB = [hex('#E8261F'), hex('#17A34A'), hex('#2C64E8'), hex('#FF9F12'), hex('#FFE9C2')];
  const bulbSpr = { lit: [], dim: [], glow: [] };
  const R4 = 5; // bulb sprite pixels per image pixel
  const bulbShape = (g, w, L) => {
    g.beginPath(); g.moveTo(-.5 * w, 0);
    g.bezierCurveTo(-1.08 * w, -.1 * L, -1.1 * w, -.46 * L, -.58 * w, -.76 * L);
    g.quadraticCurveTo(-.16 * w, -1.0 * L, 0, -L);
    g.quadraticCurveTo(.16 * w, -1.0 * L, .58 * w, -.76 * L);
    g.bezierCurveTo(1.1 * w, -.46 * L, 1.08 * w, -.1 * L, .5 * w, 0); g.closePath();
  };
  const makeBulbs = () => {
    if (bulbSpr.lit.length) return;
    const w = 4.6 * R4, L = 17 * R4, sock = 6.5 * R4, Wd = Math.ceil(w * 2.6), Hd = Math.ceil(L + sock + 8);
    for (const c of BULB) {
      for (const lit of [1, 0]) {
        const s = off(Wd, Hd), g = s.getContext('2d'); g.translate(Wd / 2, L + 4);
        // glass
        bulbShape(g, w, L);
        const base = lit ? c : shade(c.map((v) => v * .7 + 60 * .3), .55);
        const lg = g.createLinearGradient(-w, 0, w, 0);
        lg.addColorStop(0, rgba(shade(base, .55), 1)); lg.addColorStop(.38, rgba(tint(base, lit ? .3 : .12), 1)); lg.addColorStop(.62, rgba(base, 1)); lg.addColorStop(1, rgba(shade(base, .45), 1));
        g.fillStyle = lg; g.fill();
        if (lit) { // the filament's hot core shows through the glass
          const rg = g.createRadialGradient(0, -.32 * L, 0, 0, -.32 * L, .9 * w);
          rg.addColorStop(0, 'rgba(255,253,240,.98)'); rg.addColorStop(.35, rgba(tint(c, .6), .8)); rg.addColorStop(1, rgba(c, 0));
          g.save(); bulbShape(g, w, L); g.clip(); g.fillStyle = rg; g.fillRect(-w * 2, -L * 1.1, w * 4, L * 1.2);
          const tg = g.createLinearGradient(0, -L, 0, -.55 * L); tg.addColorStop(0, rgba(tint(c, .35), .9)); tg.addColorStop(1, rgba(c, 0)); g.fillStyle = tg; g.fillRect(-w * 2, -L * 1.1, w * 4, L * .6);
          g.restore();
        }
        g.lineWidth = .8; g.strokeStyle = rgba(shade(base, .4), .8); bulbShape(g, w, L); g.stroke();
        // a long specular streak on the glass
        g.save(); g.translate(-.42 * w, -.42 * L); g.rotate(-.12); g.beginPath(); g.ellipse(0, 0, .13 * w, .24 * L, 0, 0, TAU);
        g.fillStyle = `rgba(255,255,255,${lit ? .55 : .42})`; g.fill(); g.restore();
        g.beginPath(); g.arc(.3 * w, -.62 * L, .09 * w, 0, TAU); g.fillStyle = `rgba(255,255,255,${lit ? .45 : .3})`; g.fill();
        // brass collar and a ribbed green socket
        g.fillStyle = '#B58E4C'; g.fillRect(-.52 * w, -.6 * R4, 1.04 * w, 1.4 * R4);
        const sg = g.createLinearGradient(-.6 * w, 0, .6 * w, 0); sg.addColorStop(0, '#0C2414'); sg.addColorStop(.4, '#2F5A3A'); sg.addColorStop(1, '#0A1E10');
        g.fillStyle = sg; g.beginPath(); g.roundRect(-.6 * w, .6 * R4, 1.2 * w, sock - .6 * R4, [0, 0, 1.4 * R4, 1.4 * R4]); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .6 * R4 * .5; for (let k = 1; k < 4; k++) { const y = .6 * R4 + k * (sock - .6 * R4) / 4; g.beginPath(); g.moveTo(-.6 * w, y); g.lineTo(.6 * w, y); g.stroke(); }
        (lit ? bulbSpr.lit : bulbSpr.dim).push({ s, ax: Wd / 2, ay: L + 4 });
      }
      bulbSpr.glow.push(glowSprite(c, 96, false));
    }
  };
  let lights = null;
  const buildLights = () => {
    if (!geo) return;
    const n = Math.round(geo.total / 27), sp = geo.total / n;
    lights = Array.from({ length: n }, (_, i) => {
      const p = geo.sample(geo.s0 + (i + .5) * sp), j = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      return { x: p.x - p.nx * 1.2, y: p.y - p.ny * 1.2, nx: p.nx, ny: p.ny, tx: p.tx, ty: p.ty, c: i % BULB.length, rot: Math.atan2(p.nx, -p.ny) + (j - .5) * .28, ph: Math.abs(j) * 40, next: 3 + Math.abs(j) * 12 };
    });
  };
  const drawLights = (t, A, dark, onAt) => {
    if (!lights) return;
    const fried = orbit.classList.contains('fried') || orbit.classList.contains('zapped');
    const ctx = sx, S = signCv.width / (IW * K);
    // the wire: sockets joined by gentle swags that hang with gravity
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wire = (lw, col, oy) => {
      ctx.beginPath();
      for (let i = 0; i <= lights.length; i++) {
        const a = lights[i % lights.length], b = lights[(i + 1) % lights.length];
        if (i === 0) ctx.moveTo(a.x, a.y + oy);
        if (i === lights.length) break;
        const d = Math.hypot(b.x - a.x, b.y - a.y), sag = d * .2 * (.35 + .65 * Math.abs((b.x - a.x) / (d || 1)));
        ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag + oy, b.x, b.y + oy);
      }
      ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    };
    ctx.globalAlpha = A;
    wire(1.9, '#10291A', 0); wire(.6, `rgba(170,210,180,${.22 - .14 * dark})`, -.5);
    // bulbs
    const sc = (phone ? 1.24 : 1.3) / R4;
    const bright = lights.map((L, i) => {
      if (fried) return 0;
      const on = clamp((t - onAt - i * .02) / .2); // they come on one after another
      if (reduce) return on;
      const chase = .84 + .16 * Math.sin(t * 1.7 - i * .75);
      const tw = (t + L.ph) % (L.next + 6), dip = tw > L.next && tw < L.next + .5 ? .45 + .55 * Math.abs(Math.cos((tw - L.next) * 9)) : 1; // an old flasher now and then
      return on * chase * dip;
    });
    lights.forEach((L, i) => {
      const lit = bulbSpr.lit[L.c], dim = bulbSpr.dim[L.c];
      ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.scale(sc, sc);
      ctx.globalAlpha = A; ctx.drawImage(dim.s, -dim.ax, -dim.ay);
      if (bright[i] > .01) { ctx.globalAlpha = A * clamp(bright[i] * (.75 + .25 * dark) + .1); ctx.drawImage(lit.s, -lit.ax, -lit.ay); }
      ctx.restore();
    });
    // glow: soft halos at the bulbs, plus coloured light thrown onto the sign face
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((L, i) => {
      const b = bright[i]; if (b < .02) return;
      const cxp = L.x + L.nx * 9, cyp = L.y + L.ny * 9, g = bulbSpr.glow[L.c];
      const r1 = 15 + 15 * dark; ctx.globalAlpha = A * b * (.16 + .6 * dark); ctx.drawImage(g, cxp - r1, cyp - r1, r1 * 2, r1 * 2);
      if (dark > .2) { const r2 = 50; ctx.globalAlpha = A * b * .26 * dark; ctx.drawImage(g, L.x - L.nx * 6 - r2, L.y - L.ny * 6 - r2, r2 * 2, r2 * 2); }
    });
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };

  // =====================================================================================================
  // CHRISTMAS TREE: a 1960s aluminum tree on a tripod stand beside the post, glass balls, an atomic star on top,
  // and at night the turning color wheel that every aluminum tree of the era stood under
  // =====================================================================================================
  const TREE = { x: 36, k: 1.32 }; // ground centre in sign pixels, left of the post; scale against the sign
  const TIERS = 7, tierAt = (i) => { const yB = -24 - i * 14.2, w = 6 + 42 * Math.pow(1 - i / (TIERS + .4), 1.08); return { yB, yT: yB - 25, w }; };
  const ORN = [[-30, 0, 0], [8, 0, 2], [34, 0, 3], [-20, 1, 1], [16, 1, 0], [-6, 2, 3], [24, 2, 4], [-16, 3, 2], [10, 3, 1], [-4, 4, 0], [9, 5, 3]]; // x, tier, colour
  const WARM = [[-38, 0], [-8, 0], [22, 0], [-28, 1], [4, 1], [29, 1], [-14, 2], [12, 2], [-20, 3], [20, 3], [-3, 3], [-10, 4], [13, 4], [1, 5], [-5, 6]]; // the tree's own little bulbs
  const tierPath = (g, t) => {
    const { yB, yT, w } = t; g.beginPath(); g.moveTo(0, yT);
    g.quadraticCurveTo(-w * .42, yB - 9, -w, yB + 1.5); // a bough fanning out and drooping at the tip
    const n = Math.max(5, Math.round(w / 3.2)); for (let j = 1; j <= n; j++) { const x = -w + 2 * w * j / n; g.quadraticCurveTo(x - w / n, yB + 4.2, x, yB + (j === n ? 1.5 : 0)); } // scalloped tinsel hem
    g.quadraticCurveTo(w * .42, yB - 9, 0, yT); g.closePath();
  };
  const ornament = (g, x, y, r, c) => {
    g.strokeStyle = 'rgba(200,205,212,.8)'; g.lineWidth = .4; g.beginPath(); g.moveTo(x, y - r - 3.2); g.lineTo(x, y - r); g.stroke();
    g.fillStyle = '#C9A85A'; g.fillRect(x - r * .32, y - r - 1.4, r * .64, 1.6); // the cap
    const gr = g.createRadialGradient(x - r * .38, y - r * .4, r * .08, x, y, r * 1.05); gr.addColorStop(0, rgba(tint(c, .7), 1)); gr.addColorStop(.35, rgba(tint(c, .15), 1)); gr.addColorStop(.8, rgba(c, 1)); gr.addColorStop(1, rgba(shade(c, .45), 1));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(x - r * .38, y - r * .42, r * .26, r * .17, -.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); // window glint
    g.beginPath(); g.arc(x, y, r * .78, .4, 1.6); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = r * .14; g.stroke(); // reflected tree along the lower curve
  };
  const atomicStar = (g, y) => { // the topper: the sign's orange star in miniature, rays tipped with dots
    g.save(); g.translate(0, y);
    const ray = (a, L, w) => { g.save(); g.rotate(a); g.beginPath(); g.moveTo(-w, 0); g.lineTo(0, -L); g.lineTo(w, 0); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -L - 1.3, 1.15, 0, TAU); g.fill(); g.restore(); };
    g.fillStyle = '#FF6A3D'; for (let k = 0; k < 4; k++) ray(k * Math.PI / 2, k % 2 ? 9 : 12.5, 1.9);
    g.fillStyle = '#FF8A5C'; for (let k = 0; k < 4; k++) ray(Math.PI / 4 + k * Math.PI / 2, 6.2, 1.3);
    g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fillStyle = '#FFD7B8'; g.fill();
    g.restore();
  };
  const treeTopY = () => tierAt(TIERS - 1).yT;
  const treeBody = (g, snow) => {
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, 52); sh.addColorStop(0, 'rgba(0,0,0,.42)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, .16); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 52, 0, TAU); g.fill(); g.restore();
    // tripod stand and pole
    g.strokeStyle = '#2E343C'; g.lineCap = 'round'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, -15); g.lineTo(-13, 0); g.moveTo(0, -15); g.lineTo(13, 0); g.moveTo(0, -15); g.lineTo(2, 2.5); g.stroke();
    g.lineWidth = 2.6; g.strokeStyle = '#59626C'; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -30); g.stroke();
    // the boughs, bottom tier first; each a fan of silver tinsel
    for (let i = 0; i < TIERS; i++) {
      const t = tierAt(i);
      tierPath(g, t);
      const gr = g.createLinearGradient(-t.w, 0, t.w, 0); gr.addColorStop(0, '#7D8995'); gr.addColorStop(.32, '#E9EEF3'); gr.addColorStop(.5, '#F8FAFC'); gr.addColorStop(.75, '#B3BEC9'); gr.addColorStop(1, '#6A7581');
      g.fillStyle = gr; g.fill();
      g.save(); tierPath(g, t); g.clip();
      const n = Math.round(t.w * 1.6);
      for (let j = 0; j <= n; j++) { // tinsel strands raking down from the pole
        const f = j / n * 2 - 1, x = f * t.w, light = j % 3 !== 1;
        g.beginPath(); g.moveTo(f * 2, t.yT + 3); g.quadraticCurveTo(x * .55, t.yB - 8, x * 1.02, t.yB + 4.5);
        g.strokeStyle = light ? `rgba(255,255,255,${.35 + .3 * Math.abs(Math.sin(j * 7.1))})` : 'rgba(60,72,86,.35)'; g.lineWidth = light ? .45 : .35; g.stroke();
      }
      const sg = g.createLinearGradient(0, t.yT, 0, t.yB + 4); sg.addColorStop(0, 'rgba(40,50,62,.35)'); sg.addColorStop(.35, 'rgba(40,50,62,0)'); sg.addColorStop(.8, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,.25)');
      g.fillStyle = sg; g.fillRect(-t.w - 2, t.yT, t.w * 2 + 4, t.yB - t.yT + 6); // under the tier above it's in shadow; the hem catches light
      g.restore();
    }
    if (snow) { // snow along each tier's shoulders, where the tier above doesn't cover it
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 0; i < TIERS; i++) {
        const t = tierAt(i), up = i + 1 < TIERS ? tierAt(i + 1).w * .92 : 0;
        for (const sg of [-1, 1]) {
          g.beginPath(); let first = true;
          for (let k = 0; k <= 16; k++) { const u = k / 16, v = 1 - u, px = sg * (2 * v * u * t.w * .42 + u * u * t.w), py = v * v * t.yT + 2 * v * u * (t.yB - 9) + u * u * (t.yB + 1.5) - 1.2; if (Math.abs(px) < up || u > .93) continue; first ? g.moveTo(px, py) : g.lineTo(px, py); first = false; }
          g.strokeStyle = '#F2F6FC'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2; g.stroke();
        }
      }
    }
    // the tree's little warm bulbs (their glow is drawn live)
    for (const [x, ti] of WARM) { const t = tierAt(ti), y = t.yB - 3 - (Math.abs(x) / t.w) * -1.5; g.beginPath(); g.ellipse(x, y, 1.15, 1.7, 0, 0, TAU); g.fillStyle = '#FFE1A0'; g.fill(); }
    for (const [x, ti, c] of ORN) { const t = tierAt(ti); ornament(g, x, t.yB + 6.5, ti < 2 ? 4.8 : ti < 4 ? 4.2 : 3.6, BULB[c]); }
    atomicStar(g, treeTopY() - 6);
  };
  const WHEEL = [hex('#FF3B3B'), hex('#2FE07A'), hex('#4F86FF'), hex('#FFB42E')]; // the color wheel's four gels
  const drawTree = (t, A, dark, B, snow) => {
    const S = B.s * dprF * TREE.k, x = (B.x + TREE.x * B.s) * dprF, y = (B.y + ((geo ? geo.ground : 392) + 22) * B.s) * dprF;
    const base = sprite('tree', 120, 178, 60, 166, S, (g, cv) => { treeBody(g, snow); g.setTransform(1, 0, 0, 1, 0, 0); nightify(g, cv.width, cv.height, dark, .22, .38); });
    if (!cache.wheel || cache.wheel.base !== base) { // the same tree washed in each gel, made once per scale and darkness
      cache.wheel = { base, list: WHEEL.map((c) => { const v = off(base.cv.width, base.cv.height), g = v.getContext('2d'); g.drawImage(base.cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(c, .5); g.fillRect(0, 0, v.width, v.height); return v; }) };
      cache.treeGlow = { warm: glowSprite([255, 200, 120], 48, true), star: glowSprite([255, 120, 60], 64, false), gel: WHEEL.map((c) => glowSprite(c, 64, false)) };
    }
    const wl = cache.wheel.list, gl = cache.treeGlow, ph = reduce ? .3 : t / 2.2, i0 = Math.floor(ph) % 4, i1 = (i0 + 1) % 4, f = ph - Math.floor(ph), mix = clamp((f - .7) / .3), wash = .15 + .55 * dark;
    const L = x - base.oxU * S, T = y - base.oyU * S, w = base.wU * S, h = base.hU * S;
    fx.globalAlpha = A; fx.drawImage(base.cv, L, T, w, h);
    fx.globalAlpha = A * wash * (1 - mix); fx.drawImage(wl[i0], L, T, w, h);
    fx.globalAlpha = A * wash * mix; fx.drawImage(wl[i1], L, T, w, h);
    fx.globalCompositeOperation = 'lighter';
    const at = (sp, ux, uy, r, a) => { fx.globalAlpha = clamp(a); fx.drawImage(sp, x + (ux - r) * S, y + (uy - r) * S, r * 2 * S, r * 2 * S); };
    // the gel's light on the ground around the stand
    for (const [k, m] of [[i0, 1 - mix], [i1, mix]]) if (m > .01) { fx.globalAlpha = A * m * .5 * dark; fx.drawImage(gl.gel[k], x - 70 * S, y - 16 * S, 140 * S, 26 * S); }
    // warm bulbs, each on its own slow twinkle; the star topper glows
    WARM.forEach(([bxu, ti], k) => { const tt = tierAt(ti), tw = reduce ? 1 : .7 + .3 * Math.sin(t * (1.3 + (k % 5) * .37) + k * 2.1); at(gl.warm, bxu, tt.yB - 3, 3.2 + 3.4 * dark, A * tw * (.35 + .65 * dark)); });
    at(gl.star, 0, treeTopY() - 6, 16 + 12 * dark, A * (.25 + .55 * dark) * (reduce ? 1 : .9 + .1 * Math.sin(t * 2.3)));
    fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1;
  };

  // =====================================================================================================
  // HALLOWEEN: a carved jack o' lantern by the post
  // =====================================================================================================
  const PUMP = { x: 316 }; // centre in sign pixels; the pumpkin is about 100 sign pixels across
  const EYE_L = [[-31, -45], [-11, -48], [-22, -62]], EYE_R = [[31, -45], [11, -48], [22, -62]], NOSE = [[-5.5, -36.5], [5.5, -36.5], [0, -44]];
  const MOUTH = [[-35, -31], [-25, -25], [-15, -23.5], [-15, -17.5], [-6, -17.5], [-6, -22], [7, -22], [20, -24.5], [35, -31], [27, -20], [17, -13], [15, -18.5], [6, -18.5], [5, -10], [-9, -9], [-23, -13], [-30, -21]];
  const poly = (g, P) => { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  const LID = () => { const P = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, r = k % 2 ? .9 : 1.03; P.push([Math.cos(a) * 19 * r, -67 + Math.sin(a) * 6.4 * r]); } return P; };
  const lidPts = LID();
  const pumpkinBody = (g, dark, snow) => {
    // ground contact shadow
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, 56); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, .16); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill(); g.restore();
    const lobes = [[-31, 21, 30], [31, 21, 30], [-17, 25, 34.5], [17, 25, 34.5], [0, 23, 36.5]];
    for (const [cx, rx, ry] of lobes) {
      const cy = -36.5, gr = g.createRadialGradient(cx - rx * .35, cy - ry * .4, 1, cx, cy, ry * 1.25);
      gr.addColorStop(0, '#FFB45C'); gr.addColorStop(.42, '#F27D1C'); gr.addColorStop(.82, '#C24F0B'); gr.addColorStop(1, '#7E2E05');
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fillStyle = gr; g.fill();
      g.lineWidth = 1.1; g.strokeStyle = 'rgba(105,36,4,.5)'; g.stroke();
    }
    // subtle vertical ribs and a soft top highlight
    g.save(); g.beginPath(); g.ellipse(0, -36.5, 52, 36.5, 0, 0, TAU); g.clip();
    g.strokeStyle = 'rgba(255,214,150,.18)'; g.lineWidth = 1.4;
    for (const x of [-38, -24, -8, 8, 24, 38]) { g.beginPath(); g.moveTo(x * .6, -70); g.quadraticCurveTo(x * 1.12, -38, x * .7, -2); g.stroke(); }
    const hl = g.createRadialGradient(-14, -64, 0, -14, -64, 34); hl.addColorStop(0, 'rgba(255,236,190,.45)'); hl.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = hl; g.fillRect(-60, -80, 120, 80);
    g.restore();
    // the cut lid and the stem
    poly(g, lidPts); g.lineWidth = 1.6; g.strokeStyle = 'rgba(70,22,2,.85)'; g.stroke();
    g.beginPath(); g.ellipse(0, -71, 7, 2.6, 0, 0, TAU); g.fillStyle = 'rgba(80,30,6,.7)'; g.fill();
    const st = g.createLinearGradient(-5, 0, 6, 0); st.addColorStop(0, '#3F4A21'); st.addColorStop(.45, '#7C8A45'); st.addColorStop(1, '#2E3517');
    g.beginPath(); g.moveTo(-5, -70); g.bezierCurveTo(-6, -79, -3, -86, 4, -90); g.lineTo(9, -87.5); g.bezierCurveTo(4, -84, 3, -78, 5, -70); g.closePath(); g.fillStyle = st; g.fill();
    g.beginPath(); g.ellipse(6.6, -88.8, 2.9, 1.6, -.6, 0, TAU); g.fillStyle = '#A8A66A'; g.fill();
    g.strokeStyle = 'rgba(30,34,12,.6)'; g.lineWidth = .6; for (const o of [-2, 1]) { g.beginPath(); g.moveTo(o, -71); g.bezierCurveTo(o - 1, -79, o + 1, -85, o + 6, -88); g.stroke(); }
    // dark carved holes (the candlelight is drawn live on top)
    for (const P of [EYE_L, EYE_R, NOSE, MOUTH]) { poly(g, P); g.fillStyle = '#2A0E03'; g.fill(); }
    if (snow) { g.beginPath(); g.moveTo(-40, -58); g.bezierCurveTo(-30, -76, 30, -78, 42, -58); g.bezierCurveTo(30, -66, 18, -62, 8, -66); g.bezierCurveTo(-6, -62, -24, -66, -40, -58); g.fillStyle = '#F4F8FF'; g.fill(); }
  };
  // a little uncarved pumpkin keeping it company, tucked behind and to the right
  const miniPumpkin = (g) => {
    g.save(); g.translate(58, -2); g.scale(.46, .46);
    for (const [cx, rx, ry] of [[-22, 22, 27], [22, 22, 27], [-10, 24, 31], [10, 24, 31], [0, 22, 30]]) {
      const gr = g.createRadialGradient(cx - rx * .3, -40, 1, cx, -30, ry * 1.25); gr.addColorStop(0, '#FFC27A'); gr.addColorStop(.5, '#EE8A2A'); gr.addColorStop(1, '#8A3A08');
      g.beginPath(); g.ellipse(cx, -30, rx, ry, 0, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(110,40,4,.45)'; g.stroke();
    }
    g.beginPath(); g.moveTo(-4, -58); g.bezierCurveTo(-5, -70, 0, -76, 8, -78); g.lineTo(10, -73); g.bezierCurveTo(4, -71, 3, -66, 4, -58); g.closePath(); g.fillStyle = '#4C5A26'; g.fill();
    g.restore();
  };
  const PS = 1.16; // the jack o' lantern's scale against the sign
  const flame = (t) => reduce ? .92 : clamp(.8 + .09 * Math.sin(t * 7.3) + .06 * Math.sin(t * 13.7 + 1.2) + .05 * Math.sin(t * 23.1) * Math.sin(t * 2.3) - (Math.sin(t * .9) > .985 ? .22 : 0), .45, 1);
  let warmSpr = null, hotSpr = null;
  const drawPumpkin = (t, A, dark, B, snow) => {
    const ctx = fx, S = B.s * dprF * PS, gy = (geo ? geo.ground : 392);
    const x = (B.x + PUMP.x * B.s) * dprF, y = (B.y + (gy + 17) * B.s) * dprF;
    if (!warmSpr) { warmSpr = glowSprite([255, 128, 36], 128, false); hotSpr = glowSprite([255, 176, 80], 96, true); }
    const sp = sprite('pumpkin', 210, 108, 70, 98, S, (g, cv) => { miniPumpkin(g); pumpkinBody(g, dark, snow); g.setTransform(1, 0, 0, 1, 0, 0); nightify(g, cv.width, cv.height, dark, .3, .55); });
    const f = flame(t), jx = reduce ? 0 : Math.sin(t * 5.1) * 1.6 + Math.sin(t * 11.3) * .7, glowK = .25 + .75 * dark;
    ctx.globalAlpha = A;
    // candlelight pooled on the ground and thrown up onto the post (cached sprites, tinted by alpha only)
    ctx.globalCompositeOperation = 'lighter';
    const pool = (cx, cy, rx, ry, a, spr) => { ctx.globalAlpha = A * clamp(a); ctx.drawImage(spr, x + (cx - rx) * S, y + (cy - ry) * S, rx * 2 * S, ry * 2 * S); };
    pool(jx * .6, -2, 190, 36, .8 * dark * f, warmSpr);
    pool(jx * .3, -4, 90, 18, .5 * dark * f, hotSpr);
    pool(-66 + jx, -66, 80, 120, .26 * dark * f, warmSpr);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = A;
    blit(ctx, sp, x, y, S);
    // the candle inside: the cut walls catch the light and the back wall glows
    ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
    const holes = () => { ctx.beginPath(); for (const P of [EYE_L, EYE_R, NOSE, MOUTH]) P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    ctx.save(); holes(); ctx.clip();
    ctx.fillStyle = `rgb(${Math.round(200 + 50 * f)},${Math.round(140 + 60 * f)},${Math.round(60 + 50 * f)})`; ctx.fillRect(-60, -80, 120, 80); // the rind's cut edge, lit
    ctx.translate(-1.6, -2.4); holes(); ctx.fillStyle = '#2A0C02'; ctx.fill(); // the inside, one wall's thickness back
    const g = ctx.createRadialGradient(jx, -14, 0, jx, -14, 62);
    g.addColorStop(0, `rgba(255,252,222,${f})`); g.addColorStop(.25, `rgba(255,212,104,${f})`); g.addColorStop(.6, `rgba(242,118,22,${.92 * f})`); g.addColorStop(1, 'rgba(120,32,4,.9)');
    holes(); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    // light leaking round the lid cut
    poly(ctx, lidPts); ctx.lineWidth = 1.1; ctx.strokeStyle = `rgba(255,196,96,${(.3 + .6 * dark) * f})`; ctx.stroke();
    ctx.restore();
    // the face glows out into the night
    ctx.globalCompositeOperation = 'lighter';
    pool(jx * .4, -36, 74, 52, (.12 + .5 * dark) * f, hotSpr);
    for (const [ex, ey, r] of [[-21, -51, 16], [21, -51, 16], [0, -22, 28]]) pool(ex + jx * .3, ey, r * 1.7, r * 1.3, glowK * .45 * f, warmSpr);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };

  // =====================================================================================================
  // THANKSGIVING: a horn of plenty at the base, leaves on the sign and drifting down
  // =====================================================================================================
  const LEAFC = ['#C0391B', '#E0731C', '#E9AE2B', '#A3471B', '#8A5A2B', '#D45A1A'].map(hex);
  const leafPath = (g, kind, R) => {
    g.beginPath();
    for (let k = 0; k <= 96; k++) {
      const phi = k / 96 * TAU - Math.PI / 2, f = k / 96 * TAU; // f = 0 at the tip, pi at the stem
      let r;
      if (kind === 0) { // maple: five pointed lobes with serrated edges
        const lobe = Math.pow((1 + Math.cos(5 * f)) / 2, .7), low = Math.abs(Math.cos(f / 2));
        r = R * (.5 + .5 * lobe * (.7 + .3 * low)) * (f > 2.6 && f < 3.7 ? .8 : 1) + R * .06 * Math.max(0, Math.sin(f * 25));
      } else if (kind === 1) { // oak: rounded lobes along a long leaf
        const e = Math.hypot(Math.cos(f) * 1.0, Math.sin(f) * .62); r = R * e * (.86 + .14 * Math.cos(f * 9));
      } else { r = R * Math.pow(Math.abs(Math.cos(f / 2)), .6) * .95 * (Math.abs(Math.sin(f)) * .3 + .7); } // simple pointed leaf
      const x = Math.cos(phi) * r, y = Math.sin(phi) * r;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  };
  const paintLeaf = (g, kind, c, R, dark) => {
    const cc = c, gr = g.createLinearGradient(-R, -R, R, R);
    gr.addColorStop(0, rgba(tint(cc, .18), 1)); gr.addColorStop(.6, rgba(cc, 1)); gr.addColorStop(1, rgba(shade(cc, .62), 1));
    leafPath(g, kind, R); g.fillStyle = gr; g.fill();
    g.lineWidth = R * .05; g.strokeStyle = rgba(shade(cc, .5), .7); g.stroke();
    g.strokeStyle = rgba(shade(cc, .55), .75); g.lineWidth = R * .06;
    const tips = kind === 0 ? [0, 1.2566, -1.2566, 2.513, -2.513] : [0];
    for (const a of tips) { g.beginPath(); g.moveTo(0, R * .25); g.lineTo(Math.sin(a) * R * .8, -Math.cos(a) * R * .8); g.stroke(); }
    if (kind !== 0) for (let k = -3; k <= 3; k++) { if (!k) continue; g.beginPath(); g.moveTo(0, k * R * .2); g.lineTo(Math.sign(k) * R * .45, k * R * .2 - R * .22); g.stroke(); }
    g.beginPath(); g.moveTo(0, R * .2); g.lineTo(R * .04, R * 1.18); g.lineWidth = R * .07; g.strokeStyle = rgba(shade(cc, .45), 1); g.stroke();
    if (dark) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(9,13,28,${.55 * dark})`; g.fillRect(-R * 2, -R * 2, R * 4, R * 4); g.globalCompositeOperation = 'source-over'; }
  };
  const leafSprites = (key, dark, S) => {
    const c = cache[key]; if (c && c.v === ver && Math.abs(c.S - S) / S < .05) return c;
    return (cache[key] = { v: ver, S, list: Array.from({ length: 12 }, (_, i) => { const kind = i % 3, R = 12, px = Math.ceil(R * 2.6 * S), s = off(px, px), g = s.getContext('2d'); g.translate(px / 2, px / 2); g.scale(S, S); paintLeaf(g, kind, LEAFC[i % LEAFC.length], R, dark); return { s, R }; }) });
  };
  // the horn: a woven wicker cone lying on its side, mouth to the right
  const hornAt = (t) => {
    const P0 = [26, -84], P1 = [-14, -62], P2 = [6, -8], P3 = [104, -36], u = 1 - t;
    const x = u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0];
    const y = u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1];
    const dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]);
    const dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]);
    const l = Math.hypot(dx, dy) || 1; return { x, y, tx: dx / l, ty: dy / l, r: 1.6 + 32 * Math.pow(t, 1.5) };
  };
  const roundFruit = (g, x, y, r, c1, c2, c3, hl = .5) => {
    const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.05); gr.addColorStop(0, c1); gr.addColorStop(.6, c2); gr.addColorStop(1, c3);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(x - r * .38, y - r * .42, r * .22, r * .14, -.6, 0, TAU); g.fillStyle = `rgba(255,255,255,${hl})`; g.fill();
  };
  const leafAt = (g, x, y, a, kind, c, R) => { g.save(); g.translate(x, y); g.rotate(a); paintLeaf(g, kind, hex(c), R, 0); g.restore(); };
  const cornucopia = (g) => {
    // contact shadow
    const sh = g.createRadialGradient(110, 0, 0, 110, 0, 130); sh.addColorStop(0, 'rgba(0,0,0,.42)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, .12); g.fillStyle = sh; g.beginPath(); g.arc(110, 0, 130, 0, TAU); g.fill(); g.restore();
    leafAt(g, 214, -6, 1.9, 0, '#C0391B', 15); leafAt(g, 18, -4, -1.4, 1, '#A3471B', 13);
    // horn body
    const N = 70, up = [], dn = [];
    for (let k = 0; k <= N; k++) { const h = hornAt(k / N); up.push([h.x + h.ty * h.r, h.y - h.tx * h.r]); dn.push([h.x - h.ty * h.r, h.y + h.tx * h.r]); }
    const body = () => { g.beginPath(); up.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = dn.length - 1; i >= 0; i--) g.lineTo(dn[i][0], dn[i][1]); g.closePath(); };
    body(); const bg = g.createLinearGradient(0, -80, 0, 0); bg.addColorStop(0, '#E2B26A'); bg.addColorStop(.5, '#B57C38'); bg.addColorStop(1, '#5C3814'); g.fillStyle = bg; g.fill();
    g.save(); body(); g.clip();
    // woven bands: rings around the horn, each a row of over-and-under strands
    for (let k = 1; k < 30; k++) {
      const t = k / 30, h = hornAt(t), h2 = hornAt(Math.min(1, t + 1 / 30)), r = h.r;
      const nx = h.ty, ny = -h.tx;
      g.beginPath(); g.moveTo(h.x + nx * r, h.y + ny * r); g.quadraticCurveTo(h.x + h.tx * r * .55, h.y + h.ty * r * .55, h.x - nx * r, h.y - ny * r);
      g.strokeStyle = 'rgba(70,40,12,.55)'; g.lineWidth = .5 + r * .045; g.stroke();
      const seg = Math.max(2, Math.round(r / 4));
      for (let j = 0; j < seg; j++) {
        const a = (j + (k % 2) * .5) / seg, b = (j + .5 + (k % 2) * .5) / seg; if (b > 1) continue;
        const pa = [h.x + nx * r * (1 - 2 * a), h.y + ny * r * (1 - 2 * a)], pb = [h2.x + h2.ty * h2.r * (1 - 2 * b), h2.y - h2.tx * h2.r * (1 - 2 * b)];
        g.beginPath(); g.moveTo(pa[0] + h.tx * r * .25, pa[1] + h.ty * r * .25); g.lineTo(pb[0] + h.tx * r * .25, pb[1] + h.ty * r * .25);
        g.strokeStyle = 'rgba(255,226,160,.35)'; g.lineWidth = .4 + r * .05; g.stroke();
      }
    }
    // roundness: dark underside, light along the top
    const rg = g.createLinearGradient(0, -84, 0, 0); rg.addColorStop(0, 'rgba(255,240,200,.18)'); rg.addColorStop(.6, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(30,14,0,.5)'); g.fillStyle = rg; g.fillRect(-30, -100, 170, 104);
    g.restore();
    body(); g.lineWidth = 1; g.strokeStyle = 'rgba(60,32,8,.7)'; g.stroke();
    // the mouth: a dark interior with a braided rim
    const m = hornAt(1), ang = Math.atan2(m.ty, m.tx);
    g.save(); g.translate(m.x, m.y); g.rotate(ang);
    g.beginPath(); g.ellipse(0, 0, 11, m.r, 0, 0, TAU); const mg = g.createRadialGradient(-3, 0, 0, 0, 0, m.r); mg.addColorStop(0, '#120802'); mg.addColorStop(1, '#3A220C'); g.fillStyle = mg; g.fill();
    g.lineWidth = 4.5; g.strokeStyle = '#9A6428'; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#E8BC78'; g.setLineDash([3, 2.4]); g.stroke(); g.setLineDash([]);
    g.restore();
    // the harvest spilling out
    leafAt(g, 126, -58, -.5, 0, '#E0731C', 13); leafAt(g, 150, -58, .7, 2, '#E9AE2B', 11);
    // grapes hanging over the rim
    const grapes = [[118, -50], [124, -44], [116, -42], [122, -36], [128, -38], [118, -32], [125, -28], [132, -31], [121, -22], [128, -20]];
    for (const [x, y] of grapes) roundFruit(g, x, y, 5, '#9C7BC9', '#5A2E86', '#2A1240', .45);
    g.strokeStyle = '#5B4A22'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(114, -56); g.quadraticCurveTo(110, -62, 104, -60); g.stroke();
    // an ear of corn with husks peeled back
    g.save(); g.translate(150, -40); g.rotate(-.42);
    g.beginPath(); g.ellipse(-22, 2, 14, 5, .25, 0, TAU); g.fillStyle = '#C9B571'; g.fill(); g.beginPath(); g.ellipse(-22, -5, 15, 4.5, -.3, 0, TAU); g.fillStyle = '#DCCB86'; g.fill();
    g.beginPath(); g.ellipse(0, 0, 26, 8.5, 0, 0, TAU); const cg = g.createLinearGradient(0, -8, 0, 8); cg.addColorStop(0, '#FFE07A'); cg.addColorStop(.5, '#F2B526'); cg.addColorStop(1, '#B9750E'); g.fillStyle = cg; g.fill();
    g.save(); g.clip(); g.fillStyle = 'rgba(150,80,6,.4)'; for (let i = -24; i < 26; i += 3.6) for (let j = -8; j < 9; j += 3.2) { g.beginPath(); g.arc(i + (j % 2 ? 1.6 : 0), j, .8, 0, TAU); g.fill(); } g.restore();
    g.beginPath(); g.moveTo(-14, -2); g.quadraticCurveTo(-30, -16, -42, -8); g.quadraticCurveTo(-28, -6, -16, 4); g.closePath(); g.fillStyle = '#E3D395'; g.fill();
    g.restore();
    // a little orange pumpkin
    g.save(); g.translate(160, -1);
    for (const [cx, rx] of [[-9, 10], [9, 10], [0, 11]]) { const gr = g.createRadialGradient(cx - 3, -16, 1, cx, -11, 14); gr.addColorStop(0, '#FFB45C'); gr.addColorStop(.6, '#EA7518'); gr.addColorStop(1, '#9A3C08'); g.beginPath(); g.ellipse(cx, -11, rx, 11, 0, 0, TAU); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(110,40,4,.45)'; g.lineWidth = .8; g.stroke(); }
    g.beginPath(); g.moveTo(-1.5, -21); g.quadraticCurveTo(-1, -27, 3, -29); g.lineTo(4, -27); g.quadraticCurveTo(1.5, -25, 1.5, -21); g.fillStyle = '#556030'; g.fill();
    g.restore();
    // red apple, with a leaf
    roundFruit(g, 190, -12, 12, '#FF7A6A', '#C7231C', '#6E0E0B', .55);
    g.strokeStyle = '#4A2E12'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(191, -23); g.quadraticCurveTo(192, -28, 195, -30); g.stroke();
    g.beginPath(); g.ellipse(199, -28, 5, 2.2, -.4, 0, TAU); g.fillStyle = '#4E8A2E'; g.fill();
    // yellow-green apple tucked in front of the mouth
    roundFruit(g, 126, -10, 10.5, '#F3F29A', '#B7C63A', '#5D6E12', .5);
    // a striped gourd and a crookneck squash
    g.save(); g.translate(208, -7); g.rotate(.1); g.beginPath(); g.ellipse(0, 0, 11, 7.5, 0, 0, TAU); const gg = g.createLinearGradient(0, -8, 0, 8); gg.addColorStop(0, '#F3E9B6'); gg.addColorStop(1, '#A69A52'); g.fillStyle = gg; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(38,92,40,.85)'; g.lineWidth = 2.2; for (const x of [-6, 0, 6]) { g.beginPath(); g.moveTo(x - 2, -8); g.quadraticCurveTo(x + 1.5, 0, x - 2, 8); g.stroke(); } g.restore(); g.restore();
    g.save(); g.translate(98, -8); g.rotate(-.15);
    g.beginPath(); g.moveTo(-14, 2); g.bezierCurveTo(-16, -10, 2, -12, 6, -6); g.bezierCurveTo(10, -10, 16, -18, 20, -16); g.bezierCurveTo(22, -14, 16, -6, 12, 2); g.bezierCurveTo(6, 8, -10, 9, -14, 2); g.closePath();
    const yg = g.createLinearGradient(0, -14, 0, 8); yg.addColorStop(0, '#FFE680'); yg.addColorStop(.6, '#EDB52A'); yg.addColorStop(1, '#A5700C'); g.fillStyle = yg; g.fill();
    g.fillStyle = 'rgba(160,100,10,.5)'; for (const [x, y] of [[-8, -2], [-2, 2], [4, -3], [-5, 4]]) { g.beginPath(); g.arc(x, y, .9, 0, TAU); g.fill(); }
    g.restore();
    leafAt(g, 176, 2, 2.6, 1, '#D45A1A', 12); leafAt(g, 66, 0, .4, 0, '#E9AE2B', 12);
  };
  let restLeaves = null, drift = [];
  const buildRest = () => {
    if (!geo) return;
    restLeaves = [];
    const tops = []; for (let s = 0; s < geo.total; s += 4) { const p = geo.sample(s); if (p.ny < -.8 && p.y < 118) tops.push(p); } tops.sort((a, b) => a.x - b.x);
    const pick = [.08, .21, .37, .55, .7, .86];
    pick.forEach((f, i) => { const p = tops[Math.floor(f * (tops.length - 1))]; if (p) restLeaves.push({ x: p.x + p.nx * 3, y: p.y + p.ny * 3, a: Math.atan2(p.ty, p.tx) + (i % 2 ? .5 : -.4) + (i === 3 ? 1.6 : 0), k: i, sc: .62 + (i % 3) * .1 }); });
    // a couple caught on the base plate
    restLeaves.push({ x: 196, y: (geo.ground || 392) - 6, a: 2.2, k: 7, sc: .6 }, { x: 352, y: (geo.ground || 392) - 4, a: -.9, k: 4, sc: .55 });
  };
  const drawRest = (A, dark) => {
    if (!restLeaves) return;
    const S = signCv.width / (IW * K), set = leafSprites('leafS', dark * .55, S * 1.3).list;
    sx.globalAlpha = A;
    for (const L of restLeaves) { const sp = set[L.k % set.length], d = sp.R * 2.6 * L.sc * 1.55; sx.save(); sx.translate(L.x, L.y); sx.rotate(L.a); sx.scale(1, .62); sx.drawImage(sp.s, -d / 2, -d / 2, d, d); sx.restore(); }
    sx.globalAlpha = 1;
  };
  const spawnLeaf = (B, first) => ({
    x: rnd() * W, y: first ? rnd() * H * .6 : -20 - rnd() * 40, vy: (16 + rnd() * 18) * (phone ? .9 : 1.15), sw: 14 + rnd() * 26, sf: .6 + rnd() * .9, ph: rnd() * TAU,
    a: rnd() * TAU, va: (rnd() - .5) * 2.2, fl: rnd() * TAU, vf: 1.5 + rnd() * 2.5, k: Math.floor(rnd() * 12), sc: .6 + rnd() * .5, land: 0, life: 1,
  });
  const drawDrift = (t, dt, A, dark, B) => {
    const want = reduce ? 0 : phone ? 7 : 12;
    while (drift.length < want) drift.push(spawnLeaf(B, true));
    const S = B.s * dprF * 1.6, set = leafSprites('leafF', dark * .5, S).list, wind = ((window.__wx && window.__wx.wind) || .3) * 20, gy = B.y + (geo ? geo.ground : 392) * B.s;
    fx.globalAlpha = A;
    drift.forEach((L, i) => {
      if (!L.land) {
        L.y += L.vy * dt; L.x += (Math.sin(t * L.sf + L.ph) * L.sw * L.sf + wind) * dt; L.a += L.va * dt; L.fl += L.vf * dt;
        const gl = gy + 6 + (i % 5) * 7 * B.s * 2; if (L.y > gl) { L.y = gl; L.land = t; }
      } else { L.life = 1 - clamp((t - L.land - 3) / 2); if (L.life <= 0) drift[i] = spawnLeaf(B, false); }
      const sp = set[L.k], d = sp.R * 2.6 * L.sc * B.s * 1.6 * dprF, f = L.land ? .45 : Math.cos(L.fl);
      fx.save(); fx.translate(L.x * dprF, L.y * dprF); fx.rotate(L.a); fx.scale(Math.abs(f) < .12 ? .12 * Math.sign(f || 1) : f, 1);
      fx.globalAlpha = A * L.life * clamp((L.y + 20) / 40); fx.drawImage(sp.s, -d / 2, -d / 2, d, d); fx.restore();
    });
    fx.globalAlpha = 1;
  };

  const HS = 1.18; // the horn's scale against the sign
  const drawHorn = (t, dt, A, dark, B) => {
    const S = B.s * dprF * HS, sp = sprite('horn', 250, 112, 18, 100, S, (g, cv) => { cornucopia(g); g.setTransform(1, 0, 0, 1, 0, 0); nightify(g, cv.width, cv.height, dark, .5, .42); });
    fx.globalAlpha = A; blit(fx, sp, (B.x + 40 * B.s) * dprF, (B.y + ((geo ? geo.ground : 392) + 16) * B.s) * dprF, S); fx.globalAlpha = 1;
    drawDrift(t, dt, A, dark, B);
  };

  // =====================================================================================================
  // EASTER: eggs in the grass, and the bunny hops in
  // =====================================================================================================
  const EGGS = [ // x and y in sign pixels (y below the ground line), size, tilt, colour, pattern; back row first
    [156, -3, .78, -.2, '#B9A7F2', 2], [238, -4, .74, .15, '#FFD866', 4], [380, -3, .8, -.12, '#F59DB8', 1],
    [128, 6, .98, -.3, '#FF9FBD', 0], [190, 8, 1.04, .14, '#8FD3F7', 1], [226, 12, .86, 1.36, '#FFE07A', 2], [276, 8, 1.08, -.08, '#A9E58B', 3],
    [326, 9, .98, -.26, '#C9A9FF', 4], [356, 13, .84, -1.32, '#FFB98A', 2], [404, 7, .96, .22, '#8FD3F7', 0],
  ];
  const eggPath = (g, w, h) => { g.beginPath(); g.moveTo(0, -h); g.bezierCurveTo(w * .62, -h, w, -h * .38, w, -h * .28 + h * .02); g.bezierCurveTo(w, h * .1, w * .55, 0, 0, 0); g.bezierCurveTo(-w * .55, 0, -w, h * .1, -w, -h * .28 + h * .02); g.bezierCurveTo(-w, -h * .38, -w * .62, -h, 0, -h); g.closePath(); };
  const egg = (g, x, y, s, a, col, pat) => {
    const w = 15 * s, h = 40 * s, c = hex(col), d = shade(c, .78), lt = tint(c, .55);
    g.save(); g.translate(x, y); g.rotate(a);
    eggPath(g, w, h); const gr = g.createRadialGradient(-w * .35, -h * .68, 1, 0, -h * .45, h * .78); gr.addColorStop(0, rgba(tint(c, .45), 1)); gr.addColorStop(.6, rgba(c, 1)); gr.addColorStop(1, rgba(shade(c, .72), 1)); g.fillStyle = gr; g.fill();
    g.save(); eggPath(g, w, h); g.clip(); g.lineCap = 'round';
    if (pat === 0) { g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.2 * s; g.beginPath(); for (let i = 0; i <= 10; i++) g.lineTo(-w + i * w / 5, -h * .5 + (i % 2 ? -3 : 3) * s); g.stroke(); g.strokeStyle = rgba(d, 1); g.lineWidth = 1.6 * s; for (const yy of [-.28, -.72]) { g.beginPath(); g.moveTo(-w, h * yy); g.lineTo(w, h * yy); g.stroke(); } }
    if (pat === 1) { g.fillStyle = '#FFFFFF'; for (let i = 0; i < 14; i++) { const px = ((i * 37) % 19 - 9) / 9 * w * .9, py = -h * (.12 + ((i * 53) % 23) / 23 * .8); g.beginPath(); g.arc(px, py, 1.7 * s, 0, TAU); g.fill(); } g.strokeStyle = rgba(d, 1); g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(-w, -h * .5); g.lineTo(w, -h * .5); g.stroke(); }
    if (pat === 2) { g.strokeStyle = rgba(shade(c, .7), 1); g.lineWidth = 2.2 * s; for (const yy of [-.3, -.55, -.8]) { g.beginPath(); for (let i = 0; i <= 20; i++) { const xx = -w + i * w / 10; g.lineTo(xx, h * yy + Math.sin(i * 1.3) * 1.6 * s); } g.stroke(); } }
    if (pat === 3) { g.fillStyle = rgba(tint(hex('#9BD3F0'), .1), 1); g.fillRect(-w, -h * .55, w * 2, h * .55); g.fillStyle = '#FFFFFF'; for (let i = -2; i <= 2; i++) { g.save(); g.translate(i * w * .42, -h * .55); g.rotate(.785); g.fillRect(-1.5 * s, -1.5 * s, 3 * s, 3 * s); g.restore(); } g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(-w, -h * .55); g.lineTo(w, -h * .55); g.stroke(); }
    if (pat === 4) { g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.8 * s; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(k * w * .5 - w, 0); g.lineTo(k * w * .5 + w, -h); g.stroke(); } g.fillStyle = rgba(lt, 1); g.beginPath(); g.arc(0, -h * .52, 3 * s, 0, TAU); g.fill(); }
    g.restore();
    g.beginPath(); g.ellipse(-w * .4, -h * .7, w * .18, h * .12, -.35, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
    g.restore();
  };
  const grassTuft = (g, x, y, n, hgt, seed, front) => {
    for (let i = 0; i < n; i++) {
      const r = Math.abs(Math.sin(seed * 91.7 + i * 12.3)), r2 = Math.abs(Math.sin(seed * 13.1 + i * 7.7));
      const bx = x + (r - .5) * 26, h = hgt * (.55 + .6 * r2), lean = (r2 - .5) * 16, w = 1.6 + r * 1.4;
      const gr = g.createLinearGradient(0, y, 0, y - h); gr.addColorStop(0, front ? '#2F6B22' : '#24521B'); gr.addColorStop(1, front ? '#9BD45A' : '#6FAE3F');
      g.beginPath(); g.moveTo(bx - w, y); g.quadraticCurveTo(bx - w * .4 + lean * .4, y - h * .6, bx + lean, y - h); g.quadraticCurveTo(bx + w * .4 + lean * .4, y - h * .6, bx + w, y); g.closePath();
      g.fillStyle = gr; g.fill();
    }
  };
  const easterGround = (g) => {
    const sh = g.createRadialGradient(260, 6, 0, 260, 6, 180); sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, .12); g.fillStyle = sh; g.beginPath(); g.arc(260, 50, 180, 0, TAU); g.fill(); g.restore();
    for (let x = 96; x <= 424; x += 11) grassTuft(g, x, 0, 7, 20, x, false);
    EGGS.slice(0, 3).forEach(([x, y, s, a, c, p]) => egg(g, x, y + 2, s, a, c, p));
    for (let x = 100; x <= 420; x += 13) grassTuft(g, x, 5, 5, 13, x + 7, false);
    EGGS.slice(3).forEach(([x, y, s, a, c, p]) => egg(g, x + (Math.abs(a) > 1 ? -Math.sign(a) * 20 * s : 0), y + (Math.abs(a) > 1 ? -7 * s : 2), s, a, c, p)); // eggs lying down rest on their sides
    for (let x = 104; x <= 416; x += 10) grassTuft(g, x, 16, 3, 7, x + 3, true);
  };

  // the bunny, side view facing right; origin on the ground under its middle
  const BUN = { x: 74 }; // where it settles, in sign pixels
  const bunny = { state: 'off', t0: 0, x: 0, earL: 0, earV: 0, nextTwitch: 0, twitch: -9, blinkAt: 2, wig: 0 };
  const fur = hex('#EFE3D3'), furS = hex('#B9A28D'), pink = '#F2A2B2';
  const drawBunny = (g, pose) => {
    const { sxk, syk, tilt, air, earA, earB, blink, nose } = pose;
    g.save(); g.scale(sxk, syk); g.translate(0, -26); g.rotate(tilt); g.translate(0, 26);
    const body = (x, y, rx, ry, rot = 0) => { const gr = g.createRadialGradient(x - rx * .3, y - ry * .45, 1, x, y, Math.max(rx, ry) * 1.1); gr.addColorStop(0, rgba(tint(fur, .35), 1)); gr.addColorStop(.65, rgba(fur, 1)); gr.addColorStop(1, rgba(furS, 1)); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = gr; g.fill(); };
    const ear = (bx, by, a, far) => {
      g.save(); g.translate(bx, by); g.rotate(a);
      g.beginPath(); g.ellipse(0, -15, 6.2, 16.5, 0, 0, TAU); const gr = g.createLinearGradient(-6, 0, 6, 0); gr.addColorStop(0, rgba(shade(fur, far ? .78 : .92), 1)); gr.addColorStop(1, rgba(shade(furS, far ? .85 : 1), 1)); g.fillStyle = gr; g.fill();
      g.beginPath(); g.ellipse(1.2, -14, 3.1, 12.5, 0, 0, TAU); g.fillStyle = far ? '#C98593' : pink; g.fill();
      g.restore();
    };
    // far ear, hind foot, tail
    ear(16, -64, earB - .12, true);
    if (air) { g.save(); g.translate(-22, -12); g.rotate(.7 * air); body(0, 0, 17, 5.2); g.restore(); } else body(-4, -4.5, 19, 5.2);
    g.beginPath(); for (const [x, y, r] of [[-34, -24, 7], [-37, -19, 5.5], [-31, -18, 5.5], [-36, -28, 4.5]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fillStyle = '#FBF8F3'; g.fill();
    // body and haunch
    body(-8, -27, 29, 24); body(12, -31, 18, 21);
    g.beginPath(); g.arc(-12, -22, 17, -2.3, .5); g.strokeStyle = rgba(shade(furS, .8), .45); g.lineWidth = 1.4; g.stroke();
    // front paws
    if (air) { body(30, -16 + 4 * air, 6.5, 4.2, .6 * air); } else { body(23, -4.2, 6.5, 4.2); body(15, -3.8, 5.8, 3.8); }
    // head and cheek
    body(24, -55, 15, 14.5); body(32, -50, 9.5, 8.2);
    g.beginPath(); g.ellipse(28, -50, 3.6, 2.4, 0, 0, TAU); g.fillStyle = 'rgba(244,150,165,.35)'; g.fill();
    ear(22, -66, earA, false);
    // eye with a catch light; blinks
    g.save(); g.translate(29.5, -58); g.scale(1, Math.max(.08, 1 - blink)); g.beginPath(); g.ellipse(0, 0, 3, 3.6, 0, 0, TAU); g.fillStyle = '#2A1A14'; g.fill();
    g.beginPath(); g.arc(1, -1.3, 1.05, 0, TAU); g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
    // nose, mouth and whiskers
    g.save(); g.translate(40.2, -52.5 + nose * .6); g.scale(1 + nose * .12, 1); g.beginPath(); g.moveTo(-2.1, -1); g.quadraticCurveTo(0, -2.2, 2.1, -1); g.quadraticCurveTo(1, 1.6, 0, 1.6); g.quadraticCurveTo(-1, 1.6, -2.1, -1); g.fillStyle = '#E58A9C'; g.fill(); g.restore();
    g.beginPath(); g.moveTo(40, -50.5 + nose * .6); g.quadraticCurveTo(39, -47.8, 36.6, -48); g.strokeStyle = 'rgba(120,80,70,.6)'; g.lineWidth = .7; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .45; for (const [dx, dy] of [[10, -3], [11, 0], [9, 3]]) { g.beginPath(); g.moveTo(38, -51 + nose * .6); g.lineTo(38 + dx, -51 + dy + nose * .6); g.stroke(); }
    g.restore();
  };
  const drawEaster = (t, dt, A, dark, B) => {
    const S = B.s * dprF, sp = sprite('eggs', 440, 74, 0, 50, S, (g, cv) => { easterGround(g); g.setTransform(1, 0, 0, 1, 0, 0); nightify(g, cv.width, cv.height, dark, .4, .22); });
    fx.globalAlpha = A; blit(fx, sp, B.x * dprF, (B.y + ((geo ? geo.ground : 392) + 6) * B.s) * dprF, S); fx.globalAlpha = 1;
    drawBunnyLive(t, dt, A, dark, B);
  };
  let bunCv = null;
  const drawBunnyLive = (t, dt, A, dark, B) => {
    const s = B.s, gy = B.y + ((geo ? geo.ground : 392) + 10) * s, xe = B.x + BUN.x * s, S = s * dprF * 1.3;
    if (bunny.state === 'off') { bunny.state = reduce ? 'sit' : 'hop'; bunny.t0 = t; bunny.x = xe; }
    let x = xe, y = gy, pose = { sxk: 1, syk: 1, tilt: 0, air: 0, earA: -.28, earB: -.42, blink: 0, nose: 0 };
    if (bunny.state === 'hop') {
      const x0 = -60 * s - 20, dist = xe - x0, n = Math.round(clamp(dist / (100 * s), 3, 7)), Ta = .42, Tg = .16, Th = Ta + Tg;
      const el = t - bunny.t0 - .4, k = Math.floor(el / Th), q = el - k * Th;
      if (el < 0) { x = x0; }
      else if (k >= n) { bunny.state = 'sit'; bunny.sitAt = t; bunny.earV = 2.4; }
      else {
        const L = dist / n;
        if (q < Ta) { // airborne
          const p = q / Ta, hh = Math.min(.42 * L, 44 * s) * (k === n - 1 ? .6 : 1);
          x = x0 + L * (k + p); y = gy - 4 * hh * p * (1 - p);
          const st = p < .3 ? (1 - p / .3) : p > .78 ? (p - .78) / .22 * .6 : 0;
          pose.sxk = 1 - .1 * st; pose.syk = 1 + .14 * st; pose.tilt = -.32 * (1 - 2 * p); pose.air = Math.sin(Math.PI * Math.min(1, p * 1.4));
          const vy = (1 - 2 * p); bunny.earL = -.3 - .45 * vy; // ears stream back on the way up, lift on the way down
        } else { // squash on landing, then push off
          const p = (q - Ta) / Tg; x = x0 + L * (k + 1); const sq = Math.sin(Math.PI * p);
          pose.sxk = 1 + .14 * sq; pose.syk = 1 - .2 * sq; pose.tilt = .1 * (1 - p); bunny.earL = .15 * sq - .1;
        }
        pose.earA = bunny.earL; pose.earB = bunny.earL - .16;
      }
    }
    if (bunny.state === 'sit') {
      const ts = t - (bunny.sitAt || t);
      // ears settle with a little spring after the last hop
      const spring = reduce ? 0 : Math.exp(-ts * 4) * Math.sin(ts * 14) * .25;
      pose.earA = -.28 + spring; pose.earB = -.42 + spring * .8;
      if (!reduce) {
        if (t > bunny.nextTwitch) { bunny.twitch = t; bunny.nextTwitch = t + 2.5 + rnd() * 4.5; bunny.side = rnd() < .6; }
        const tw = t - bunny.twitch; if (tw < .5) { const v = Math.sin(tw * 38) * Math.exp(-tw * 6) * .32; if (bunny.side) pose.earA += v; else pose.earB += v; }
        const bk = (t % 4.3); pose.blink = bk < .14 ? Math.sin(bk / .14 * Math.PI) : 0;
        const wg = (t % 3.1); pose.nose = wg < 1.1 ? Math.sin(wg * 30) : 0;
        pose.syk = 1 + Math.sin(t * 2.2) * .008; // breathing
      }
    }
    // shadow on the ground, smaller when airborne
    const hgt = (gy - y) / (30 * s);
    fx.save(); fx.globalAlpha = A * (.5 - .25 * clamp(hgt)); fx.translate(x * dprF, gy * dprF); fx.scale(S, S * .14);
    const sg = fx.createRadialGradient(0, 0, 0, 0, 0, 40); sg.addColorStop(0, 'rgba(0,0,0,.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = sg; fx.beginPath(); fx.arc(0, 0, 40, 0, TAU); fx.fill(); fx.restore();
    // the bunny itself, drawn into its own little canvas so the night can fall on it alone
    const bw = 120, bh = 120, ox = 50, oy = 112;
    if (!bunCv) bunCv = off(1, 1);
    const cw = Math.ceil(bw * S), ch = Math.ceil(bh * S); if (bunCv.width !== cw || bunCv.height !== ch) { bunCv.width = cw; bunCv.height = ch; }
    const g = bunCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.setTransform(S, 0, 0, S, ox * S, oy * S);
    drawBunny(g, pose); g.setTransform(1, 0, 0, 1, 0, 0); nightify(g, cw, ch, dark, .42, .42);
    fx.globalAlpha = A; fx.drawImage(bunCv, x * dprF - ox * S, y * dprF - oy * S); fx.globalAlpha = 1;
  };

  // =====================================================================================================
  // FOURTH OF JULY: fireworks over the lake
  // =====================================================================================================
  const FWC = { red: [255, 70, 60], white: [255, 244, 228], blue: [96, 146, 255], gold: [255, 190, 84], green: [92, 255, 150], violet: [200, 120, 255], silver: [222, 232, 255] };
  const fwSpr = {}, flashSpr = {};
  // a spark: a hot, slightly tinted core in a halo of its own colour (white cores read as snow from a distance)
  const sparkSprite = (c) => {
    const s = off(40, 40), g = s.getContext('2d'), gr = g.createRadialGradient(20, 20, 0, 20, 20, 20);
    gr.addColorStop(0, rgba(tint(c, .8), 1)); gr.addColorStop(.14, rgba(tint(c, .45), 1)); gr.addColorStop(.3, rgba(c, .6)); gr.addColorStop(.6, rgba(c, .14)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 40, 40); return s;
  };
  const fwSprites = () => { if (fwSpr.red) return; for (const k in FWC) { fwSpr[k] = sparkSprite(FWC[k]); flashSpr[k] = glowSprite(tint(FWC[k], .35), 64, false); } fwSpr.smoke = glowSprite([150, 150, 158], 64, false); };
  let shells = [], parts = [], flashes = [], smokes = [], far = [], nextLaunch = 0, nextFar = 0, finaleAt = 0, Q = 1;
  const cap = () => Math.round((phone ? 700 : 1600) * Q); // the hard ceiling on live sparks, trails and crackles included
  const pal = () => { const r = rnd(); return r < .26 ? 'red' : r < .46 ? 'white' : r < .66 ? 'blue' : r < .78 ? 'gold' : r < .89 ? 'green' : 'violet'; };
  const radius = () => Math.min(W, H * 1.15) * (phone ? .2 : .16);
  const add = (o) => { if (parts.length < cap()) parts.push(o); };
  // sparks start a hair outward, so a break never begins as one white blob
  const spark = (x, y, vx, vy, o) => Object.assign({ x: x + vx * .025, y: y + vy * .025, vx, vy, age: 0, hist: [], hk: 0, sz: 1, K: 0, drag: 2.3, gr: 0 }, o);
  const launch = () => {
    const x = W * (.06 + rnd() * .88), Rb = radius();
    let tY = horizon - H * (.22 + rnd() * .3);
    const B = signBox(); if (x > B.x && x < B.x + IW * B.s) tY = Math.min(tY, B.y + 60 * B.s); // over the sign, break above it
    const sk = document.querySelector('.hero > .skybox'), kb = sk ? sk.getBoundingClientRect().bottom - hero.getBoundingClientRect().top : 0;
    tY = Math.max(tY, Rb * .85 + 12, phone ? kb + Rb * .45 : 0); // clear of the header on phones
    const types = ['peony', 'peony', 'willow', 'crackle', 'ring', 'peony', 'peony'], type = types[Math.floor(rnd() * types.length)];
    const T = 1.05 + rnd() * .45, d = horizon - tY;
    shells.push({ x, y: horizon, vx: (rnd() - .5) * W * .02, vy: -2 * d / T, g: 2 * d / (T * T), T, t: 0, type, col: type === 'willow' ? 'gold' : pal(), col2: rnd() < .45 ? pal() : null, Rb });
  };
  const burst = (s, k = 1) => { // k < 1 makes a small, faint far-off burst
    const Rb = (s.Rb || radius()) * (.84 + rnd() * .34), base = (phone ? 80 : 140) * Q * (k < 1 ? .3 : 1), fa = k;
    if (s.type === 'peony' || s.type === 'crackle') {
      const n = Math.round(base * (s.type === 'crackle' ? .8 : 1));
      for (let i = 0; i < n; i++) {
        const z = rnd() * 2 - 1, a = rnd() * TAU, rr = Math.sqrt(1 - z * z), v = Rb * 2.3 * (.9 + rnd() * .14), inner = s.col2 && i % 3 === 0, m = inner ? .55 : 1;
        add(spark(s.x, s.y, Math.cos(a) * rr * v * m, Math.sin(a) * rr * v * m, { life: 1.5 + rnd() * .6, gr: Rb * .55, col: s.type === 'crackle' ? 'gold' : inner ? s.col2 : s.col, K: k < 1 ? 0 : 8, crackle: s.type === 'crackle' && rnd() < .7, sz: k, fa }));
      }
    } else if (s.type === 'willow') {
      const n = Math.round(base * .75);
      for (let i = 0; i < n; i++) { const z = rnd() * 2 - 1, a = rnd() * TAU, rr = Math.sqrt(1 - z * z), v = Rb * 1.9 * (.85 + rnd() * .2); add(spark(s.x, s.y, Math.cos(a) * rr * v, Math.sin(a) * rr * v, { life: 3 + rnd() * .8, drag: 1.7, gr: Rb * .32, col: 'gold', K: 14, willow: true, sz: .85 * k, fa })); }
    } else if (s.type === 'ring') {
      const n = Math.round(base * .55), tilt = .25 + rnd() * .55, rot = rnd() * TAU, v = Rb * 2.2, c = Math.cos(rot), si = Math.sin(rot);
      for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a), y = Math.sin(a) * tilt; add(spark(s.x, s.y, (x * c - y * si) * v, (x * si + y * c) * v, { life: 1.6 + rnd() * .3, gr: Rb * .45, col: s.col, K: 6, sz: 1.1 * k, fa })); }
      for (let i = 0; i < n * .35; i++) { const a = rnd() * TAU, v2 = Rb * .6 * rnd(); add(spark(s.x, s.y, Math.cos(a) * v2, Math.sin(a) * v2, { life: 1.2, drag: 2.5, gr: Rb * .4, col: s.col2 || 'white', K: 3, sz: .8 * k, fa })); }
    }
    flashes.push({ x: s.x, y: s.y, r: Rb, age: 0, col: s.col, k });
    if (k === 1) smokes.push({ x: s.x, y: s.y, r: Rb * .7, age: 0 });
  };
  // a show on the far shore: a small burst low over the water, and its flash on the horizon a beat later
  const farShow = (t) => {
    const x = W * (rnd() < .5 ? .04 + rnd() * .3 : .66 + rnd() * .3), y = horizon - H * (.035 + rnd() * .05);
    far.push({ x, y, at: t + .35 + rnd() * .3, done: false });
    burst({ x, y, type: rnd() < .7 ? 'peony' : 'ring', col: pal(), col2: null, Rb: radius() * .22 }, .45);
  };
  const stepFW = (t, dt) => {
    if (t > nextLaunch) { launch(); if (rnd() < .22) launch(); nextLaunch = t + (finaleAt > t - 2.6 && finaleAt < t ? .16 + rnd() * .16 : .5 + rnd() * 1.0); }
    if (t > finaleAt + 2.6) finaleAt = t + 20 + rnd() * 8; // every so often a short finale
    if (t > nextFar) { farShow(t); nextFar = t + 2.5 + rnd() * 4; }
    for (const s of shells) {
      s.t += dt; s.x += s.vx * dt; s.vy += s.g * dt; s.y += s.vy * dt;
      if (rnd() < .9) add(spark(s.x, s.y, (rnd() - .5) * 14, 10 + rnd() * 18, { life: .45 + rnd() * .3, drag: 1, gr: 30, col: 'gold', sz: .55, tail: true, fa: 1 }));
      if (s.t >= s.T) { s.dead = true; burst(s); }
    }
    shells = shells.filter((s) => !s.dead);
    const wind = ((window.__wx && window.__wx.wind) || 0) * 6;
    let n = parts.length;
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      p.age += dt; const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy = p.vy * f + p.gr * dt;
      p.x += (p.vx + wind) * dt; p.y += p.vy * dt;
      if (p.K && (p.hk = (p.hk + 1) % (p.willow ? 2 : 1)) === 0) { p.hist.push(p.x, p.y); if (p.hist.length > p.K * 2) p.hist.splice(0, 2); }
      if (p.crackle && !p.popped && p.age > p.life * .62) { p.popped = true; p.life = p.age + .05; for (let k = 0; k < 3; k++) add(spark(p.x, p.y, (rnd() - .5) * 90, (rnd() - .5) * 90, { life: .12 + rnd() * .12, drag: 4, col: 'white', sz: .9, pop: true, fa: 1 })); }
    }
    let j = 0; for (const p of parts) if (p.age < p.life && p.y < horizon + 2) parts[j++] = p; parts.length = j; // compact in place
    for (const f of flashes) f.age += dt; flashes = flashes.filter((f) => f.age < .5);
    for (const m of smokes) { m.age += dt; m.r += dt * 6; m.y -= dt * 3; } smokes = smokes.filter((m) => m.age < 6);
    far = far.filter((f) => t < f.at + 1.2); for (const f of far) f.t = t;
  };
  const drawFW = (t, A, dark) => {
    const ctx = bx, d = dprB, refl = .25 + .75 * dark, sp = (k, x, y, w, h, a) => { ctx.globalAlpha = a; ctx.drawImage(k, x - w / 2, y - h / 2, w, h); };
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    // smoke hangs where the shells broke (you mostly see it by day)
    for (const m of smokes) sp(fwSpr.smoke, m.x, m.y, m.r * 2, m.r * 2, A * (1 - m.age / 6) * (.1 + .16 * (1 - dark)));
    ctx.globalCompositeOperation = 'lighter';
    // each break lights the sky around it and the water under it
    for (const f of flashes) {
      const k = Math.pow(1 - f.age / .5, 2) * A * f.k, s2 = flashSpr[f.col] || flashSpr.white, ry = horizon + (horizon - f.y) * .38;
      sp(s2, f.x, f.y, f.r * 3.6, f.r * 3.6, .32 * k * (.08 + .92 * dark));
      sp(s2, f.x, ry, f.r * 3.4, f.r * .7, .2 * k * refl);
    }
    // far-off shows: the horizon glows a moment after the burst
    for (const f of far) { const e = (f.t || 0) - f.at; if (e < 0 || e > 1.2) continue; const k = (e < .08 ? e / .08 : Math.pow(1 - (e - .08) / 1.12, 2)) * A * (.25 + .75 * dark); sp(flashSpr.gold, f.x, horizon - 2, W * .24, H * .07, .38 * k); }
    ctx.lineCap = 'round';
    for (const p of parts) {
      const life = p.age / p.life, a0 = (p.pop ? 1 - life : Math.pow(1 - life, p.willow ? 1.1 : 1.6)) * A * p.fa * clamp((horizon - p.y) / 12);
      if (a0 < .01) continue;
      const c = FWC[p.col], twinkle = p.crackle || p.willow ? .7 + .3 * Math.sin(p.age * 40 + p.x) : life > .6 ? .55 + .45 * Math.sin(p.age * 31 + p.vx) : 1; // they glitter as they die
      if (p.hist.length >= 4) {
        const n = p.hist.length; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.hist[0], p.hist[1]);
        ctx.strokeStyle = rgba(p.willow ? [255, 168, 64] : c, (p.willow ? .36 : .42) * a0); ctx.lineWidth = (p.willow ? 1.3 : 2.2) * (phone ? .9 : 1.1); ctx.stroke();
        if (n >= 6) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.hist[n - 6], p.hist[n - 5]); ctx.strokeStyle = rgba(tint(c, .55), .8 * a0); ctx.lineWidth = 1.3; ctx.stroke(); }
      }
      const z = (p.tail ? 3.2 : p.pop ? 6 : 7) * p.sz * (phone ? 1 : 1.15) * (.55 + .45 * (1 - life)) * Math.min(1, .35 + p.age * 13);
      sp(fwSpr[p.col], p.x, p.y, z * 2, z * 2, a0 * twinkle * (.6 + .4 * dark)); // by day they're less luminous against the sky
      if (!p.tail && dark > .1) { // a shimmering streak on the water below
        const ry = horizon + (horizon - p.y) * .38; if (ry < H) sp(fwSpr[p.col], p.x + Math.sin(ry * .17 + t * 5) * 2.2, ry, z, z * 3.2, a0 * .3 * refl);
      }
    }
    for (const s of shells) sp(fwSpr.gold, s.x, s.y, 7, 7, A);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  // reduced motion: one still frame, a few bursts caught at full bloom
  const stillFW = () => {
    shells = []; parts = []; flashes = []; smokes = []; far = []; size();
    const spots = phone ? [[.16, .24, 'peony', 'red'], [.84, .2, 'ring', 'blue'], [.5, .13, 'willow', 'gold']] : [[.2, .26, 'peony', 'red'], [.8, .22, 'ring', 'blue'], [.36, .12, 'willow', 'gold'], [.66, .1, 'peony', 'white']];
    for (const [x, y, type, col] of spots) burst({ x: W * x, y: H * y, type, col, col2: type === 'peony' ? 'blue' : null });
    for (let i = 0; i < 40; i++) stepFW(-1e9, .02);
    flashes = []; far = [];
  };

  // =====================================================================================================
  // SANTA: the sleigh and nine reindeer cross the sky once, the first thing Christmas does
  // Silhouettes like everyone else on the shore (ink with a faint moonlit rim); Rudolph's nose is the only light.
  // Drawn in "team units": a reindeer is about 30 long, the whole team about 180.
  // =====================================================================================================
  const INK = '#05070B';
  const DEER_LAG = [0, 28, 54, 80, 106], SLEIGH_LAG = 146; // how far behind Rudolph each row and the sleigh ride
  const sf = { on: false, cv: null, ctx: null, off: null, raf: 0, t: 0, last: 0, dur: 8, fade: 1, ending: false, sparks: [], emit: 0, W: 0, H: 0, hz: 0, d: 1, s: 1, yPeak: 0, yEdge: 0, x0: 0, x1: 0, nose: null, core: null, glit: null };
  // a reindeer, side on, facing right: a light deer build with jointed legs (elbow, knee, fetlock; stifle, hock), a slim neck and a muzzle
  const deer = (g, ph) => {
    g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
    const leg = (x, y, segs) => { // segs: [angle from straight down (positive reaches forward), length, width]
      for (const [a, l, w] of segs) { const nx = x + Math.sin(a) * l, ny = y + Math.cos(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny; }
      g.beginPath(); g.ellipse(x, y, .75, .5, segs[segs.length - 1][0], 0, TAU); g.fill(); // hoof
    };
    // the flying gallop: forelegs reach out then fold up under the chest, hind legs drive back then gather
    for (const side of [.5, 0]) {
      const p = ph + side, reach = Math.sin(p), fold = Math.max(0, -Math.sin(p + .6)), qh = Math.sin(p + Math.PI * .85), gather = Math.max(0, Math.sin(p + Math.PI * .85 + .8));
      const f1 = .35 + .75 * reach, f2 = f1 - .1 - 1.7 * fold, f3 = f2 + .5 * fold - .2;
      leg(4.6, 1.4, [[f1, 4.2, 1.5], [f2, 4.4, .95], [f3, 1.5, .8]]);
      const h1 = .55 + .55 * qh, h2 = h1 - 1.45 - .3 * gather, h3 = h2 + .95 + .9 * gather;
      leg(-5.4, .6, [[h1, 3.8, 2.1], [h2, 3.6, 1.3], [h3, 4.4, .9], [h3 + .25, 1.4, .75]]);
    }
    g.beginPath(); g.moveTo(-8.6, -1.4); g.bezierCurveTo(-8.2, -4.2, -3, -4.1, 1, -3.5); g.bezierCurveTo(4, -3.2, 6.4, -3.6, 7.2, -1.2); g.bezierCurveTo(7.8, 1.2, 6.2, 3, 4, 3); // back, withers, chest
    g.bezierCurveTo(1.5, 2.6, -1.5, 2.2, -3.4, 2.4); g.bezierCurveTo(-6.4, 3, -9, 1.6, -8.6, -1.4); g.closePath(); g.fill(); // tucked belly, haunch
    g.beginPath(); g.moveTo(3.4, -3.6); g.bezierCurveTo(5.6, -5, 7.4, -6.6, 8.6, -9); g.lineTo(10.8, -8.4); g.bezierCurveTo(9.8, -5.6, 8.8, -2.4, 7.2, .4); g.closePath(); g.fill(); // a slim, arched neck
    g.save(); g.translate(10.3, -9.1); g.rotate(.5);
    g.beginPath(); g.ellipse(0, 0, 2.5, 1.75, 0, 0, TAU); g.fill(); // the head
    g.beginPath(); g.moveTo(1.2, -1.3); g.quadraticCurveTo(4.6, -.9, 5.4, .2); g.quadraticCurveTo(4.6, 1.1, 1, 1.5); g.closePath(); g.fill(); // tapering muzzle
    g.restore();
    g.beginPath(); g.moveTo(9.4, -10.4); g.quadraticCurveTo(6.8, -12.2, 6.1, -11.3); g.quadraticCurveTo(7.6, -10.3, 9, -9.3); g.closePath(); g.fill(); // ear, laid back
    g.beginPath(); g.moveTo(-8.4, -2.6); g.quadraticCurveTo(-10.6, -4.6, -10.4, -3); g.quadraticCurveTo(-9.8, -1.6, -8.4, -1.4); g.fill(); // tail flicked up
    for (const [o, w] of [[1.3, .7], [0, .85]]) { // antlers, far and near: a sweeping beam with three tines
      g.lineWidth = w; g.beginPath(); g.moveTo(10 - o, -10.4); g.bezierCurveTo(9.2 - o, -13.6, 7.6 - o, -16.2, 4.6 - o, -18.2);
      g.moveTo(9.5 - o, -12.8); g.quadraticCurveTo(11.4 - o, -14, 12 - o, -15.8); g.moveTo(8.2 - o, -15.2); g.quadraticCurveTo(9.8 - o, -17.2, 9.8 - o, -19.2); g.moveTo(6.5 - o, -17); g.quadraticCurveTo(7 - o, -18.9, 6.6 - o, -20.6);
      g.stroke();
    }
  };
  const NOSE_TIP = [10.3 + Math.cos(.5) * 5.4 - Math.sin(.5) * .2, -9.1 + Math.sin(.5) * 5.4 + Math.cos(.5) * .2]; // muzzle tip in deer units
  const sleighShape = (g, t) => {
    g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 1.7; g.beginPath(); g.moveTo(-29, -3); g.quadraticCurveTo(-29, 0, -25, 0); g.lineTo(16, 0); g.bezierCurveTo(25, 0, 28, -7, 22, -10); g.bezierCurveTo(19, -11.5, 17.5, -8.5, 20, -7.5); g.stroke(); // runner, scrolled up in front
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(-15, 0); g.lineTo(-15, -6); g.moveTo(9, 0); g.lineTo(9, -6); g.stroke();
    g.beginPath(); g.moveTo(-25, -5.5); g.lineTo(13, -5.5); g.bezierCurveTo(20, -5.5, 22, -13, 17, -17); g.bezierCurveTo(14.5, -19, 12, -16.5, 14, -15); g.lineTo(-8, -15);
    g.bezierCurveTo(-14, -15, -16, -19, -19, -27); g.bezierCurveTo(-21, -31, -27, -30, -26.5, -26); g.bezierCurveTo(-26, -18, -27, -10, -25, -5.5); g.closePath(); g.fill(); // the body, high at the back
    g.beginPath(); g.ellipse(-17.5, -22, 7.5, 8.5, -.15, 0, TAU); g.fill(); // the sack of toys
    g.beginPath(); g.moveTo(-20, -29); g.lineTo(-17.5, -33); g.lineTo(-14.5, -29.5); g.closePath(); g.fill();
    g.save(); g.translate(-23, -31); g.rotate(-.35); g.fillRect(-2.7, -2.7, 5.4, 5.4); g.fillRect(-.5, -4.6, 1, 2); g.restore(); // a present, bow and all
    g.beginPath(); g.arc(-12.8, -31, 2.2, 0, TAU); g.moveTo(-13.2, -33.2); g.arc(-14.1, -33.2, .95, 0, TAU); g.moveTo(-10.4, -33.2); g.arc(-11.3, -33.2, .95, 0, TAU); g.fill(); // a teddy peeking out
    g.beginPath(); g.ellipse(-4.5, -20, 7.6, 7.3, 0, 0, TAU); g.fill(); // Santa
    g.beginPath(); g.arc(-1.4, -30, 3.7, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(1.3, -27, 3, 3.7, .3, 0, TAU); g.fill(); // beard
    const flop = Math.sin(t * 5.2) * .9; // the cap flops back in the wind, pompom bouncing
    g.beginPath(); g.moveTo(-5.6, -31.4); g.lineTo(2, -32.4); g.quadraticCurveTo(-1, -38.5, -9.6, -36.6 + flop); g.quadraticCurveTo(-6.5, -34, -5.6, -31.4); g.fill();
    g.beginPath(); g.ellipse(-1.8, -32, 4.7, 1.35, -.08, 0, TAU); g.fill();
    g.beginPath(); g.arc(-10.2, -36.4 + flop, 1.75, 0, TAU); g.fill();
    g.lineWidth = 3.2; g.beginPath(); g.moveTo(-2.5, -23.5); g.quadraticCurveTo(2, -20, 6.2, -21.6); g.stroke(); // arms out, holding the reins
    g.beginPath(); g.arc(7, -21.8, 1.9, 0, TAU); g.fill();
  };
  // where the team flies: a soft arc above the skyline, low at the edges, highest mid-sky
  const fy = (x) => { const q = x / sf.W; return sf.yEdge - (sf.yEdge - sf.yPeak) * Math.sin(Math.PI * clamp(q, -.25, 1.25)) + 3 * sf.s * Math.sin(q * 7 + .5); };
  const fa = (x) => Math.atan2(fy(x + 4) - fy(x - 4), 8);
  const santaDims = () => {
    const r = hero.getBoundingClientRect(), W2 = r.width, H2 = r.height, ph = W2 < 700;
    sf.W = W2; sf.H = H2; sf.hz = H2 * (1 - HZ); sf.d = Math.min(devicePixelRatio || 1, 1.5);
    sf.s = (ph ? W2 * .56 : Math.min(W2 * .24, 340)) / 180;
    const sk = document.querySelector('.hero > .skybox'), kb = sk ? sk.getBoundingClientRect().bottom - r.top : H2 * .12;
    sf.yPeak = Math.max(kb + 20 + 31 * sf.s, H2 * .16); sf.yEdge = Math.max(sf.yPeak + H2 * .05, sf.hz - H2 * .36); // Santa's cap clears the sky controls
    sf.x0 = -26 * sf.s; sf.x1 = W2 + (SLEIGH_LAG + 34) * sf.s; sf.dur = ph ? 6.6 : 8.2;
    if (sf.cv) { const a = Math.round(W2 * sf.d), b = Math.round(H2 * sf.d); if (sf.cv.width !== a || sf.cv.height !== b) { sf.cv.width = a; sf.cv.height = b; } }
  };
  // seconds from take-off until the sleigh passes behind the middle of the sign
  const santaPassTime = () => { const B = signBox(), xc = B.x + IW * B.s / 2; return clamp((xc + SLEIGH_LAG * sf.s - sf.x0) / (sf.x1 - sf.x0), 0, 1) * sf.dur; };
  const santaStart = () => {
    if (sf.on || reduce || window.__tornado) return false;
    sf.on = true; sf.t = 0; sf.last = 0; sf.fade = 1; sf.ending = false; sf.sparks = []; sf.emit = 0;
    sf.cv = document.createElement('canvas'); sf.cv.className = 'santa-layer'; sf.cv.setAttribute('aria-hidden', 'true');
    const sky = hero.querySelector(':scope > .skyline-layer'); if (sky) sky.after(sf.cv); else hero.prepend(sf.cv); // above the skyline, under the sign
    sf.ctx = sf.cv.getContext('2d'); sf.off = document.createElement('canvas');
    sf.nose = glowSprite([255, 46, 32], 64, false); sf.core = glowSprite([255, 70, 50], 32, true); sf.glit = glowSprite([255, 226, 170], 24, true);
    santaDims(); santaKick(); return true;
  };
  const santaEnd = () => {
    cancelAnimationFrame(sf.raf); sf.raf = 0; sf.on = false; sf.ending = false; sf.sparks = [];
    if (sf.cv) { sf.cv.width = sf.cv.height = 0; sf.cv.remove(); }
    if (sf.off) sf.off.width = sf.off.height = 0;
    sf.cv = sf.ctx = sf.off = sf.nose = sf.core = sf.glit = null;
  };
  const santaStop = () => { if (sf.on) sf.ending = true; }; // fade out over a moment, then clean up
  const santaKick = () => { if (sf.on && !sf.raf && onScreen && !document.hidden) sf.raf = requestAnimationFrame(santaFrame); };
  const santaFrame = (now) => {
    sf.raf = 0;
    if (!sf.on) return;
    if (!onScreen || document.hidden) { sf.last = 0; return; } // paused; the observers kick it back on
    const dt = sf.last ? Math.min(.05, (now - sf.last) / 1000) : 1 / 60; sf.last = now; sf.t += dt;
    if (window.__tornado) sf.ending = true; // the twister wins; Santa slips away
    if (sf.ending) { sf.fade -= dt / .45; if (sf.fade <= 0) { santaEnd(); return; } }
    const u = sf.t / sf.dur; if (u >= 1) { santaEnd(); return; }
    const { ctx, d, s } = sf, t = sf.t, xl = lerp(sf.x0, sf.x1, u);
    const wx = window.__wx || {}, dark = clamp(1 - (wx.day || 0) * 1.15 + (wx.cloud || 0) * .15);
    // each row and the sleigh ride the same arc, Rudolph leading
    const rows = DEER_LAG.map((lag, i) => { const x = xl - lag * s; return { x, y: fy(x), a: fa(x), ph: t * TAU / .62 + i * .9 }; });
    const sx_ = xl - SLEIGH_LAG * s, sl = { x: sx_, y: fy(sx_) + 8 * s + 1.4 * s * Math.sin(t * 2.6), a: fa(sx_) * .8 + .04 * Math.sin(t * 2.1) };
    const P = (e, ux, uy) => { const c = Math.cos(e.a), n = Math.sin(e.a); return [e.x + s * (ux * c - uy * n), e.y + s * (ux * n + uy * c)]; };
    // a deer's own sway: bob and pitch with the stride
    const sway = (ph) => ({ bob: -1.3 * Math.cos(ph), pitch: .07 * Math.sin(ph + .5) });
    const inDeer = (e, ph, ox, oy, ux, uy) => { const w = sway(ph), c = Math.cos(w.pitch), n = Math.sin(w.pitch); return P(e, ox + ux * c - uy * n, oy + w.bob + ux * n + uy * c); };
    // the silhouettes go into a scratch canvas first so the rim light falls only on the outside edge
    const pad = 44 * s, xs = [sl.x, rows[0].x], ys = [sl.y, ...rows.map((r) => r.y)];
    const bx0 = Math.min(...xs) - pad, by0 = Math.min(...ys) - pad, bw = Math.max(...xs) - Math.min(...xs) + pad * 2, bh = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const ow = Math.ceil(bw * d), oh = Math.ceil(bh * d), off = sf.off;
    if (off.width < ow || off.height < oh) { off.width = Math.max(off.width, ow); off.height = Math.max(off.height, oh); }
    const g = off.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, off.width, off.height);
    const place = (e) => { const c = Math.cos(e.a) * s * d, n = Math.sin(e.a) * s * d; g.setTransform(c, n, -n, c, (e.x - bx0) * d, (e.y - by0) * d); };
    // harness: the gangline from the sleigh to Rudolph, and Santa's reins
    const gang = [P(sl, 21, -8)], reins = [P(sl, 7, -21.8)];
    for (let i = rows.length - 1; i >= 0; i--) { gang.push(inDeer(rows[i], rows[i].ph, 0, 0, 5.5, .5)); reins.push(inDeer(rows[i], rows[i].ph, 0, 0, 8.4, -6)); }
    g.setTransform(d, 0, 0, d, -bx0 * d, -by0 * d); g.strokeStyle = INK; g.lineCap = 'round';
    for (const [pts, lw, sag] of [[gang, .9, 1.5], [reins, .6, 3]]) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * s, b[0], b[1]); }
      g.lineWidth = lw * s; g.stroke();
    }
    place(sl); sleighShape(g, t);
    for (let i = rows.length - 1; i >= 0; i--) {
      const e = rows[i], pair = i ? [[-4.5, -7.6, .55, .86], [0, 0, 0, 1]] : [[0, 0, 0, 1]]; // the far deer smaller, up and back, so a pair reads as two animals; Rudolph leads alone
      for (const [ox, oy, dp, k] of pair) { const w = sway(e.ph + dp); place(e); g.translate(ox, oy + w.bob); g.rotate(w.pitch); g.scale(k, k); deer(g, e.ph + dp); }
    }
    // on to the sky: the team with its moonlit rim
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, sf.cv.width, sf.cv.height);
    ctx.globalAlpha = sf.fade;
    ctx.shadowColor = 'rgba(160,200,222,.75)'; ctx.shadowBlur = .9 * d; // the same rim as the CSS drop-shadow(0 0 .9px) on the other figures
    ctx.drawImage(off, 0, 0, ow, oh, bx0 * d, by0 * d, ow, oh);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.globalCompositeOperation = 'lighter';
    // a faint trail of sparkle behind the sleigh
    sf.emit += dt * 38; const tail = P(sl, -28, -6);
    while (sf.emit >= 1 && sf.sparks.length < 140) { sf.emit--; sf.sparks.push({ x: tail[0] + (rnd() - .5) * 6 * s, y: tail[1] + (rnd() - .5) * 8 * s, vx: -(8 + rnd() * 18), vy: 4 + rnd() * 14, age: 0, life: .8 + rnd() * .9, z: (1 + rnd() * 1.4) * s }); }
    sf.emit = Math.min(sf.emit, 1);
    let j = 0;
    for (const p of sf.sparks) {
      p.age += dt; if (p.age >= p.life) continue; p.x += p.vx * dt; p.y += p.vy * dt; sf.sparks[j++] = p;
      const k = Math.pow(1 - p.age / p.life, 1.5) * (.6 + .4 * Math.sin(p.age * 30 + p.x)) * (.35 + .55 * dark) * sf.fade;
      ctx.globalAlpha = clamp(k); ctx.drawImage(sf.glit, p.x - p.z, p.y - p.z, p.z * 2, p.z * 2);
    }
    sf.sparks.length = j;
    // Rudolph's nose: the only light in the team, pulsing, and glinting on the water at night
    const r0 = rows[0], N = inDeer(r0, r0.ph, 0, 0, NOSE_TIP[0], NOSE_TIP[1]), pulse = .82 + .18 * Math.sin(t * 4.2), hr = 9 * s * (.75 + .55 * dark) * pulse;
    ctx.globalAlpha = clamp((.4 + .6 * dark) * pulse) * sf.fade; ctx.drawImage(sf.nose, N[0] - hr, N[1] - hr, hr * 2, hr * 2);
    const cr = 2.4 * s; ctx.globalAlpha = sf.fade; ctx.drawImage(sf.core, N[0] - cr, N[1] - cr, cr * 2, cr * 2);
    if (dark > .15 && N[1] < sf.hz) {
      const ry = sf.hz + (sf.hz - N[1]) * .38, k = clamp(1 - (sf.hz - N[1]) / (sf.H * .5)) * dark * pulse * sf.fade;
      if (ry < sf.H && k > .01) { const jx = Math.sin(t * 7) * 1.5 * s; ctx.globalAlpha = clamp(.7 * k); ctx.drawImage(sf.nose, N[0] + jx - 3 * s, ry - 10 * s, 6 * s, 20 * s); ctx.globalAlpha = clamp(.3 * k); ctx.drawImage(sf.nose, N[0] - 9 * s, ry - 3 * s, 18 * s, 6 * s); }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    santaKick();
  };

  // =====================================================================================================
  // THE WITCH: Halloween's first act. She rides her broom across the sky, cat on the back, and at night her
  // path crosses the moon so she's framed against it. Same ink and moonlit rim as everyone else.
  // Drawn in "witch units", broom along the x axis, facing right; she is about 100 long.
  // =====================================================================================================
  const wf = { on: false, cv: null, ctx: null, off: null, raf: 0, t: 0, last: 0, dur: 7.5, fade: 1, ending: false, W: 0, H: 0, d: 1, s: 1, knots: null, moon: null, halo: null };
  const witchShape = (g, t) => {
    g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
    const wv = (k, a = 1) => Math.sin(t * 9 + k) * a; // the wind in her cape and hair
    // the cape: narrow at her shoulders, billowing out behind into a ragged, scalloped tail that streams in the wind;
    // its lower edge leaves her back at the shoulder, so the hunched back still shows beneath it
    g.beginPath(); g.moveTo(9.4, -19.6);
    g.bezierCurveTo(5, -25.5 + wv(0, .5), -3, -30.5 + wv(.7, 1), -11, -31 + wv(1.4, 1.4)); // the top edge, puffed up by the wind
    const rag = [[-19.5, -33.4, 1.8], [-15.2, -29.6, 2.3], [-22.6, -29, 2.9], [-17, -26, 3.5], [-23.4, -23.8, 4.1], [-16.6, -22.6, 4.7], [-20.4, -19, 5.3], [-13.4, -19.6, 5.9]]; // a ragged tail fanning out
    let px_ = -11, py_ = -31;
    for (const [rx, ry, k] of rag) { const tip = rx < -18; const nx = rx + (tip ? wv(k, 1.3) : 0), ny = ry + wv(k + .5, tip ? 1.2 : .6); g.quadraticCurveTo((px_ + nx) / 2 + (tip ? -1 : 1.6), (py_ + ny) / 2 + .4, nx, ny); px_ = nx; py_ = ny; }
    g.bezierCurveTo(-8, -15.6 + wv(6, .6), -1, -15.2 + wv(6.6, .4), 6.4, -15.8); g.closePath(); g.fill(); // the belly of the cape sags, then meets her shoulder
    // the broom: a long handle with a knob, the bristles bound in two bands and fanning out behind
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(-31, .4); g.lineTo(35, -3.2); g.stroke();
    g.beginPath(); g.arc(35.4, -3.25, 1.1, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-28, -1.9); g.lineTo(-34.5, -2.6); g.lineTo(-34.5, 3.6); g.lineTo(-28, 2.6); g.closePath(); g.fill();
    g.lineWidth = .62;
    for (let k = 0; k < 17; k++) { const f = k / 16 - .5, sw = Math.sin(t * 7 + k * 1.7) * .9; g.beginPath(); g.moveTo(-33.5, .5 + f * 5); g.quadraticCurveTo(-42, f * 11 + sw * .4, -55 - Math.abs(Math.sin(k * 3.3)) * 4, f * 19 + sw); g.stroke(); }
    // the cat on the back of the broom, sitting up, tail curled
    g.beginPath(); g.ellipse(-20, -5.4, 3.3, 4.6, -.15, 0, TAU); g.fill();
    g.beginPath(); g.arc(-17.6, -11, 2.4, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-19.3, -12.4); g.lineTo(-19.8, -15.4); g.lineTo(-17.9, -13.3); g.moveTo(-16.6, -13.2); g.lineTo(-15.4, -15.6); g.lineTo(-15.3, -12.4); g.fill(); // ears
    g.lineWidth = 1.05; g.beginPath(); g.moveTo(-22.6, -3); g.bezierCurveTo(-27.5, -4, -28.5, -11 + wv(1, .6), -25.6, -13.5 + wv(1.5, .6)); g.quadraticCurveTo(-24.2, -14.4, -24.8, -12.4); g.stroke();
    g.lineWidth = .9; g.beginPath(); g.moveTo(-18.6, -1.6); g.lineTo(-18.2, .2); g.moveTo(-21.4, -1.4); g.lineTo(-21.6, .3); g.stroke(); // paws on the handle
    // the witch: skirt draped over the broom, one leg tucked with a pointed boot
    g.beginPath(); g.moveTo(1, -7.4); g.bezierCurveTo(-2, -5 + wv(2, .4), -6, -3.6 + wv(2.4, .5), -10.5 + wv(2.8, .6), -3.4 + wv(3, .7)); // the skirt, blown back along the broom
    g.quadraticCurveTo(-7, -1.6, -9.4 + wv(3.4, .6), .8 + wv(3.8, .7)); g.quadraticCurveTo(-5.4, .2, -5.6 + wv(4.2, .5), 2.6 + wv(4.6, .6)); g.quadraticCurveTo(-1.6, 1, -.4, 2.8 + wv(5, .5));
    g.bezierCurveTo(2.6, 1.2, 5.6, -1.6, 7.2, -5.6); g.closePath(); g.fill();
    g.lineWidth = 2.1; g.beginPath(); g.moveTo(6, -2.5); g.lineTo(11.5, 3.2); g.lineTo(8.6, 9.2); g.stroke(); // thigh forward, shin tucked back
    g.beginPath(); g.moveTo(7.2, 8.4); g.lineTo(10.6, 8.6); g.quadraticCurveTo(13.6, 8.8, 14.6, 7.2); g.quadraticCurveTo(13.6, 10.6, 9.6, 10.6); g.lineTo(7.2, 10.4); g.closePath(); g.fill(); // the boot, toe curled up
    // a slim, hunched torso: the back curves up to a round shoulder, the chest falls away under it
    g.beginPath(); g.moveTo(1.8, -4.6); g.bezierCurveTo(-.8, -10, .4, -17.4, 6.4, -19.4); g.quadraticCurveTo(10.6, -20.6, 12, -17.4); // a rounded, hunched back up to the shoulder
    g.bezierCurveTo(10.4, -14.6, 8, -11.6, 7, -9); g.quadraticCurveTo(6, -6.6, 5.8, -4.4); g.closePath(); g.fill(); // the chest falls away to a narrow waist
    // the arm: from the shoulder out to the elbow and down to the handle, a little sleeve flaring at the wrist
    g.lineWidth = 1.75; g.beginPath(); g.moveTo(10.6, -17.2); g.lineTo(15.6, -12.4); g.stroke();
    g.lineWidth = 1.25; g.beginPath(); g.moveTo(15.6, -12.4); g.lineTo(20.6, -5.2); g.stroke();
    g.beginPath(); g.moveTo(18.6, -8.4); g.lineTo(20.8, -6.9); g.lineTo(19.4, -5.4); g.closePath(); g.fill();
    g.beginPath(); g.arc(21.4, -4.1, 1.15, 0, TAU); g.fill();
    // hair streaming back under the hat
    g.lineWidth = .75;
    for (let k = 0; k < 6; k++) { const y0 = -23.6 + k * .6; g.beginPath(); g.moveTo(11.2, y0); g.bezierCurveTo(7.5, y0 - 1.6 + wv(k, .6), 3.5, y0 - 3 + wv(k + 1, .9), -1 - k * 1.1, y0 - 4.6 + k * .2 + wv(k + 2, 1.3)); g.stroke(); } // streaming up and back on the wind
    // head: a sharp nose and chin
    g.beginPath(); g.arc(13.4, -21.8, 3, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(15.6, -23); g.lineTo(19.4, -21); g.lineTo(15.8, -20.6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(14.6, -19.4); g.lineTo(16.6, -17.7); g.lineTo(13.4, -18.9); g.closePath(); g.fill();
    // the hat: a wide brim and a tall cone whose tip has bent over and trails behind
    g.beginPath(); g.ellipse(12.6, -24.6, 8.6, 1.25, -.12, 0, TAU); g.fill();
    const tip = wv(.4, .7);
    g.beginPath(); g.moveTo(8.6, -24.6); g.lineTo(16.4, -25.6); g.bezierCurveTo(14, -30, 11.5, -34, 9.6, -36.6); g.quadraticCurveTo(6, -38 + tip, 1.6, -35.6 + tip); g.quadraticCurveTo(5.6, -35.4, 7.6, -33.6); g.bezierCurveTo(8.4, -30, 8.7, -27, 8.6, -24.6); g.closePath(); g.fill();
  };
  // the moon, where the sky shader puts it (index.html: uMoon), in hero pixels; null when it isn't up
  const moonAt = (W2, H2) => {
    const wx = window.__wx || {}; if (wx.sx == null) return null;
    const hy = Math.max(-.05, Math.min(.42, -(wx.sun || 0) * 1.5 + .12));
    const dark = clamp(1 - (wx.day || 0) * 1.15 + (wx.cloud || 0) * .15);
    if (hy < .05 || dark < .55 || (wx.cloud || 0) > .6) return null;
    return { x: W2 * (1 - wx.sx * .8 - .1), y: H2 * (1 - HZ - hy), r: H2 * .028 };
  };
  // monotone cubic through the knots: y as a smooth function of x, no overshoot
  const spline = (K, x) => {
    if (x <= K[0][0]) return K[0][1]; if (x >= K[K.length - 1][0]) return K[K.length - 1][1];
    let i = 0; while (x > K[i + 1][0]) i++;
    const sl = (j) => { if (j <= 0 || j >= K.length - 1) return (K[Math.min(j + 1, K.length - 1)][1] - K[Math.max(j - 1, 0)][1]) / (K[Math.min(j + 1, K.length - 1)][0] - K[Math.max(j - 1, 0)][0]); const a = (K[j][1] - K[j - 1][1]) / (K[j][0] - K[j - 1][0]), b = (K[j + 1][1] - K[j][1]) / (K[j + 1][0] - K[j][0]); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); };
    const [x0, y0] = K[i], [x1, y1] = K[i + 1], h = x1 - x0, u = (x - x0) / h, m0 = sl(i) * h, m1 = sl(i + 1) * h;
    return (2 * u * u * u - 3 * u * u + 1) * y0 + (u * u * u - 2 * u * u + u) * m0 + (-2 * u * u * u + 3 * u * u) * y1 + (u * u * u - u * u) * m1;
  };
  // the sky she may use: below the header and the sky controls, above the skyline
  const skyRoom = (r) => {
    const sk = document.querySelector('.hero > .skybox'), nav = document.querySelector('.hero nav.top');
    const pr = sk ? sk.getBoundingClientRect() : null, nr = nav ? nav.getBoundingClientRect() : null;
    return { navB: nr ? nr.bottom - r.top : 60, pillL: pr ? pr.left - r.left : r.width * .4, pillR: pr ? pr.right - r.left : r.width * .6, pillB: pr ? pr.bottom - r.top : r.height * .15 };
  };
  const witchDims = () => {
    const r = hero.getBoundingClientRect(), W2 = r.width, H2 = r.height, ph = W2 < 700, room = skyRoom(r);
    wf.W = W2; wf.H = H2; wf.d = Math.min(devicePixelRatio || 1, 1.5); wf.s = (ph ? W2 * .3 : Math.min(W2 * .12, 170)) / 100; wf.dur = ph ? 6 : 7.5;
    const s = wf.s, top = 40 * s, hz = H2 * (1 - HZ), low = hz - H2 * .3; // the hat tip rides ~40 units above the broom; stay over the skyline
    // the highest the broom may ride at x, part by part: hat and head ahead of x, cape and cat just behind, bristles further back
    const ov = (l, r) => r > room.pillL - 8 && l < room.pillR + 8;
    const clearAt = (x) => { let c = room.navB + 8 + top; if (ov(x, x + 20 * s)) c = Math.max(c, room.pillB + 8 + top); if (ov(x - 16 * s, x)) c = Math.max(c, room.pillB + 8 + 28 * s); if (ov(x + 20 * s, x + 37 * s)) c = Math.max(c, room.pillB + 8 + 4 * s); if (ov(x - 59 * s, x - 16 * s)) c = Math.max(c, room.pillB + 8 + 12 * s); return c; };
    // sample it, widen it a little and smooth it, so the path eases over the pill instead of stepping
    const N = 72, xa = -80 * s, xb = W2 + 80 * s, env = Array.from({ length: N + 1 }, (_, i) => clearAt(xa + (xb - xa) * i / N));
    let e2 = env.map((_, i) => Math.max(...env.slice(Math.max(0, i - 3), i + 4)));
    for (let pass = 0; pass < 3; pass++) e2 = e2.map((_, i) => { const w = e2.slice(Math.max(0, i - 3), i + 4); return w.reduce((p, v) => p + v, 0) / w.length; });
    wf.env = (x) => { const f = clamp((x - xa) / (xb - xa)) * N, i = Math.min(N - 1, Math.floor(f)); return lerp(e2[i], e2[i + 1], f - i); };
    const m = moonAt(W2, H2); wf.moon = null;
    let K;
    const yb = m ? Math.max(m.y + 15 * s, wf.env(m.x)) : 0;
    if (m && yb <= m.y + 26 * s && yb < low) { // she can cross the moon: it sits behind her hat, head and shoulders
      wf.moon = m;
      K = m.x < W2 / 2 ? [[xa, yb + H2 * .1], [m.x, yb], [m.x + (W2 - m.x) * .5, Math.min(low, yb + H2 * .16)], [xb, yb + H2 * .02]]
        : [[xa, yb + H2 * .02], [m.x * .5, Math.min(low, yb + H2 * .16)], [m.x, yb], [xb, yb + H2 * .1]];
    } else { const yh = room.navB + 8 + top; K = [[xa, yh + H2 * .12], [W2 * .26, yh + H2 * .04], [W2 * .6, Math.min(low, yh + H2 * .17)], [xb, yh + H2 * .05]]; }
    wf.knots = K; wf.low = low;
    if (wf.cv) { const a = Math.round(W2 * wf.d), b = Math.round(H2 * wf.d); if (wf.cv.width !== a || wf.cv.height !== b) { wf.cv.width = a; wf.cv.height = b; } }
  };
  const wy = (x) => { const a = spline(wf.knots, x), b = wf.env(x), k = 6 * wf.s; return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2; }; // the swoop, eased over (never into) the header and the sky controls
  const witchStart = () => {
    if (wf.on || reduce || window.__tornado) return false;
    wf.on = true; wf.t = 0; wf.last = 0; wf.fade = 1; wf.ending = false;
    wf.cv = document.createElement('canvas'); wf.cv.className = 'witch-layer'; wf.cv.setAttribute('aria-hidden', 'true');
    const sky = hero.querySelector(':scope > .skyline-layer'); if (sky) sky.after(wf.cv); else hero.prepend(wf.cv);
    wf.ctx = wf.cv.getContext('2d'); wf.off = document.createElement('canvas'); wf.halo = glowSprite([214, 226, 255], 96, false);
    witchDims(); witchKick(); return true;
  };
  const witchEnd = () => {
    cancelAnimationFrame(wf.raf); wf.raf = 0; wf.on = false; wf.ending = false;
    if (wf.cv) { wf.cv.width = wf.cv.height = 0; wf.cv.remove(); }
    if (wf.off) wf.off.width = wf.off.height = 0;
    wf.cv = wf.ctx = wf.off = wf.halo = null;
  };
  const witchStop = () => { if (wf.on) wf.ending = true; };
  const witchKick = () => { if (wf.on && !wf.raf && onScreen && !document.hidden) wf.raf = requestAnimationFrame(witchFrame); };
  const witchFrame = (now) => {
    wf.raf = 0;
    if (!wf.on) return;
    if (!onScreen || document.hidden) { wf.last = 0; return; }
    const dt = wf.last ? Math.min(.05, (now - wf.last) / 1000) : 1 / 60; wf.last = now; wf.t += dt;
    if (window.__tornado) wf.ending = true;
    if (wf.ending) { wf.fade -= dt / .45; if (wf.fade <= 0) { witchEnd(); return; } }
    const u = wf.t / wf.dur; if (u >= 1) { witchEnd(); return; }
    const { ctx, d, s } = wf, t = wf.t, x0 = -70 * s, x1 = wf.W + 60 * s;
    const ue = u < .5 ? 2 * u * u * .3 + u * .7 : u; // a touch of ease as she sweeps in
    const x = lerp(x0, x1, ue), bob = Math.sin(t * 2.3) * 2.2 * s, y = wy(x) + bob, a = Math.atan2(wy(x + 6) - wy(x - 6), 12) * .9 + .05 * Math.sin(t * 1.7 + .5);
    wf.x = x; wf.y = y;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, wf.cv.width, wf.cv.height);
    // moonlight gathers behind her as she crosses the moon
    if (wf.moon) { const m = wf.moon, k = clamp(1 - Math.abs(x + 10 * s - m.x) / (wf.W * .35)); if (k > .01) { const R = m.r * 4.2; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 * k * k * wf.fade; ctx.drawImage(wf.halo, (m.x - R) * d, (m.y - R) * d, R * 2 * d, R * 2 * d); ctx.globalCompositeOperation = 'source-over'; } }
    // the silhouette goes into a scratch canvas so the rim falls only on the outside edge
    const pad = 62 * s, ow = Math.ceil(pad * 2 * d), oh = Math.ceil(pad * 1.4 * d), off = wf.off;
    if (off.width < ow || off.height < oh) { off.width = ow; off.height = oh; }
    const g = off.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, off.width, off.height);
    const c = Math.cos(a) * s * d, n = Math.sin(a) * s * d; g.setTransform(c, n, -n, c, pad * d, pad * .8 * d);
    witchShape(g, t);
    ctx.globalAlpha = wf.fade; ctx.shadowColor = 'rgba(160,200,222,.75)'; ctx.shadowBlur = .9 * d;
    ctx.drawImage(off, 0, 0, ow, oh, (x - pad) * d, (y - pad * .8) * d, ow, oh);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    witchKick();
  };

  // ---------- state and the render loop ----------
  let manual = null, auto = dateTheme(), shown = null, A = 0, onAt = 0, raf = 0, last = 0, onScreen = true, still = 0;
  const T0 = performance.now();
  const target = () => manual || auto;
  const startTheme = (name, t) => {
    shown = name; onAt = t; cache = {}; ver++;
    // drop everything the last theme made, so cycling themes never piles anything up
    lights = null; restLeaves = null; drift = []; bunCv = null; bunny.state = 'off';
    shells = []; parts = []; flashes = []; smokes = []; far = [];
    clearInterval(still); still = 0;
    if (name) layers();
    if (signCv) { const u = USES[name] || ''; signCv.hidden = !u.includes('s'); frontCv.hidden = !u.includes('f'); backCv.hidden = !u.includes('b'); size(); }
    if (!name) return;
    if (reduce) still = setInterval(kick, 2500); // nothing moves, but day turns to night: repaint now and then
    if (name !== 'christmas') santaStop();
    if (name !== 'halloween') witchStop();
    if (name === 'halloween') witchStart(); // she flies first
    if (name === 'christmas') { makeBulbs(); buildLights(); if (santaStart()) onAt = t + Math.max(0, santaPassTime() - .3); } // Santa flies over first; the bulbs come on in his wake
    if (name === 'thanksgiving') buildRest();
    if (name === 'easter') bunny.nextTwitch = t + 2;
    if (name === 'july4') { fwSprites(); nextLaunch = t + .3; nextFar = t + 2.5; finaleAt = t + 16; if (reduce) stillFW(); else launch(t); }
  };
  window.__holidayName = null;
  const publish = () => { window.__holidayName = target(); };
  const frame = (now) => {
    raf = 0;
    if (!onScreen || document.hidden) { last = 0; return; }
    const want = target();
    // the quiet themes (a candle, twinkling bulbs, a sitting bunny, falling leaves) only need 30 frames a second
    const calm = shown === want && A >= 1 && shown !== 'july4' && !(shown === 'easter' && bunny.state !== 'sit');
    if (calm && !reduce && last && now - last < 30) { raf = requestAnimationFrame(frame); return; }
    const t = (now - T0) / 1000, rdt = last ? Math.min(.25, (now - last) / 1000) : 1 / 60, dt = Math.min(.05, rdt); last = now;
    if (shown !== want) { A -= reduce ? 1 : rdt / .35; if (A <= 0 || !shown) { A = 0; startTheme(want, t); } }
    else if (shown) A = Math.min(1, A + (reduce ? 1 : rdt / .6));
    if (!shown) { last = 0; return; }
    size();
    const wx = window.__wx || { day: 0, cloud: 0, snow: 0 }, dark = clamp(1 - (wx.day || 0) * 1.15 + (wx.cloud || 0) * .15);
    const dq = Math.round(dark * 12) / 12, snow = (wx.snow || 0) > .12 && (window.__tempF == null || window.__tempF <= 34) ? 1 : 0;
    if (dq !== darkQ || snow !== snowQ) { darkQ = dq; snowQ = snow; ver++; }
    const B = signBox();
    if (!signCv.hidden) { // the sign layer: bulbs, leaves resting on the rim
      const S = signCv.width / (IW * K); sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, signCv.width, signCv.height); sx.setTransform(S, 0, 0, S, MX * S, MY * S);
      if (shown === 'christmas') drawLights(t, A, dq, onAt);
      if (shown === 'thanksgiving') drawRest(A, dq);
      sx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (!frontCv.hidden) { // the ground layer, in front of the post
      fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, frontCv.width, frontCv.height);
      if (shown === 'christmas') drawTree(t, A, dq, B, snow);
      if (shown === 'halloween') drawPumpkin(t, A, dq, B, snow);
      if (shown === 'thanksgiving') drawHorn(t, dt, A, dq, B);
      if (shown === 'easter') drawEaster(t, dt, A, dq, B);
    }
    if (!backCv.hidden) { // the sky layer
      if (!reduce) { stepFW(t, dt); if (dt > 1 / 40) Q = Math.max(.45, Q - .015); else if (dt < 1 / 55) Q = Math.min(1, Q + .003); }
      drawFW(t, A, dq);
    }
    if (!reduce || A < 1 || shown !== want) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => { if (!raf && onScreen && !document.hidden && (target() || shown)) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; kick(); santaKick(); witchKick(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { kick(); santaKick(); witchKick(); });
  addEventListener('resize', () => { if (sf.on) santaDims(); if (wf.on) witchDims(); if (!shown) return; size(); if (reduce && shown === 'july4') stillFW(); kick(); });
  setInterval(() => { const a = dateTheme(); if (a !== auto) { auto = a; publish(); kick(); } }, 10 * 60 * 1000); // past midnight, the calendar may say otherwise
  scan().then(() => { if (shown === 'christmas') buildLights(); if (shown === 'thanksgiving') buildRest(); kick(); });

  // ---------- the compass star: tap to cycle ----------
  const star = document.querySelector('.hero nav.top .brand svg'), brand = star && star.closest('a');
  let chip = null, chipT = 0;
  const say = (text) => {
    if (!brand) return;
    if (!chip) { chip = document.createElement('span'); chip.className = 'hol-chip mono'; chip.setAttribute('role', 'status'); chip.setAttribute('aria-live', 'polite'); brand.append(chip); }
    chip.textContent = text; chip.classList.remove('on'); void chip.offsetWidth; chip.classList.add('on');
    clearTimeout(chipT); chipT = setTimeout(() => chip.classList.remove('on'), 1600);
  };
  if (star) {
    star.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const i = manual ? THEMES.indexOf(manual) : -1;
      manual = i + 1 < THEMES.length ? THEMES[i + 1] : null;
      publish(); kick();
      star.classList.remove('hol-spin'); void star.getBoundingClientRect(); star.classList.add('hol-spin');
      say(manual ? LABEL[manual] : auto ? LABEL[auto] + ' · today' : 'No holiday');
    });
    star.addEventListener('animationend', () => star.classList.remove('hol-spin'));
  }

  window.__holiday = {
    set(name) { const n = name == null ? null : String(name).toLowerCase(); manual = n ? (THEMES.includes(n) ? n : ALIAS[n] || null) : null; publish(); kick(); return target(); },
    get current() { return target(); },
    santa() { return santaStart(); }, // fly Santa over now (false if he's already up, motion is reduced, or a tornado is on)
    witch() { return witchStart(); }, // fly the witch over now (same rules as santa())
    get busy() { return sf.on || wf.on; },
    get stats() { return { witch: wf.on ? { x: Math.round(wf.x || 0), y: Math.round(wf.y || 0), s: +wf.s.toFixed(2), moon: wf.moon && { x: Math.round(wf.moon.x), y: Math.round(wf.moon.y) } } : null, cap: cap(), far: far.length, parts: parts.length, shells: shells.length, flashes: flashes.length, smokes: smokes.length, Q }; },
  };
  publish(); kick();
})();
