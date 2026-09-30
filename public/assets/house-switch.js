// Chooses the house: the 3D dollhouse when the device can carry it, the SVG house otherwise.
// Checks happen before any 3D code downloads; the 3D page measures itself and asks to fall back if it can't keep up.
(() => {
  const sec = document.getElementById('house');
  if (!sec) return;
  const svgParts = [sec.querySelector('.scen'), sec.querySelector('.house')].filter(Boolean);
  const link = sec.querySelector('.try3d');
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const params = new URLSearchParams(location.search);
  if (params.get('house') === '2d') return; // manual override for testing

  // STEP A: reasons to stay 2D before loading anything
  const verdict = store.get('h3d-verdict');
  if (verdict === 'fail' && params.get('house') !== '3d') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const conn = navigator.connection || {};
  const lean = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  let gl = null;
  try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) {}
  if (!gl) return;
  const lose = gl.getExtension && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();

  // STEP B: a rough prior for the starting tier (the 3D page adapts from here)
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  let tier = verdict === 'low' ? 'low' : (mem < 4 || cores <= 4) ? 'mid' : 'high';

  let frame = null;
  const mount = () => {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.className = 'h3d-frame';
    frame.title = 'Watch the house think: an interactive 3D model of a smart home';
    frame.setAttribute('allow', 'fullscreen');
    const dbg = params.get('h3dfps') ? `&debug&forcefps=${encodeURIComponent(params.get('h3dfps'))}` : ''; // test hook: simulate a slow GPU
    frame.src = `/lab/house-3d/?embed=1&tier=${tier}${dbg}`;
    const wrap = document.createElement('div'); wrap.className = 'h3d-wrap';
    const alt = document.createElement('a'); alt.className = 'h3d-alt mono'; alt.href = '?house=2d#house'; alt.textContent = 'Prefer the flat 2D version?';
    wrap.append(frame, alt);
    svgParts[0].before(wrap);
    svgParts.forEach((el) => { el.hidden = true; });
    if (link) link.hidden = true;
    sec.classList.add('is-3d');
  };
  const unmount = (why) => {
    if (!frame) return;
    frame.closest('.h3d-wrap').remove(); frame = null;
    svgParts.forEach((el) => { el.hidden = false; });
    if (link) link.hidden = false;
    sec.classList.remove('is-3d');
    window.dispatchEvent(new Event('resize')); // the SVG house re-frames itself
    if (why) console.info('[house] 3D fell back to 2D:', why);
  };
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
    const d = e.data || {};
    if (d.type === 'h3d-size' && d.h > 200) frame.style.height = Math.ceil(d.h) + 'px';
    if (d.type === 'h3d-fallback') { store.set('h3d-verdict', 'fail'); unmount(d.reason || 'slow'); }
    if (d.type === 'h3d-verdict' && d.v) store.set('h3d-verdict', d.v);
  });

  if (lean) {
    // on Data Saver or a 2G connection: keep 2D, offer the 3D house on a tap
    const b = document.createElement('button'); b.type = 'button'; b.className = 'h3d-offer';
    b.innerHTML = '<span class="mono">3D</span> Load the 3D house (about 2 MB)';
    b.addEventListener('click', () => { b.remove(); mount(); });
    svgParts[0].before(b);
    return;
  }
  // load only as the section approaches, so the 3D files never slow the first paint
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); mount(); } }, { rootMargin: '900px 0px' });
  io.observe(sec);
})();
