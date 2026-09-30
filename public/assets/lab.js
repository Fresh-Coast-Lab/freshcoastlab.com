// The Lab map: agents do the work, the watchdog checks it. A scan beam runs from the watchdog to each part
// of the system; most checks come back green, and now and then one catches something, raises it, and it gets fixed.
// A replay of the kinds of checks that really run at home, not live data.
(() => {
  const map = document.getElementById('map');
  if (!map) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = document.getElementById('audit-lines'), badges = document.getElementById('lab-badges');
  const node = (k) => map.querySelector(`.node[data-k="${k}"]`);
  const dog = node('watchdog');
  const ORDER = ['home', 'memory', 'media', 'models'];
  const OK = {
    home: ['39 automations reporting', 'every sensor reported in the last hour', 'garage door and tilt sensor agree', 'smoke and water alerts reach the phone'],
    memory: ['synced across both Macs', 'secret scan clean on every commit', 'both machines read the same facts'],
    media: ['nightly backup verified', 'new clip filed, dated and titled', 'library matches the backup'],
    models: ['same context loaded for every tool', 'tools, not prompts, set what a model can touch'],
  };
  const CATCH = {
    home: ['workbench motion quiet for 26 h', 'alert sent to the phone', 'sensor back online', 'QUIET 26 H'],
    media: ['backup 30 h old, expected 24', 'alert sent to the phone', 'backup re-ran and verified', 'BACKUP LATE'],
    memory: ['one Mac hasn’t synced in 5 h', 'digest flagged it', 'sync caught up', 'SYNC LATE'],
  };
  const NAME = { home: 'home', memory: 'memory', media: 'archive', models: 'models' };
  const pos = (el) => { const r = el.getBoundingClientRect(), m = map.getBoundingClientRect(); return [r.left - m.left + r.width / 2, r.top - m.top + (el.querySelector('.core').offsetHeight / 2)]; };
  const stamp = () => new Date().toTimeString().slice(0, 8);
  const log = (text, kind = '') => {
    const li = document.createElement('li'); li.className = kind;
    const b = document.createElement('b'); b.textContent = stamp();
    li.append(b, document.createTextNode(text));
    lines.prepend(li);
    while (lines.children.length > 3) lines.lastChild.remove();
  };
  const badge = (k, text, kind) => {
    const n = node(k), [x, y] = pos(n);
    const el = document.createElement('span'); el.className = 'badge ' + kind; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    badges.append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, kind === 'warn' ? 1500 : 1700);
  };
  const flash = (k, kind) => { const n = node(k); n.classList.remove('ok', 'warn'); void n.offsetWidth; n.classList.add(kind); setTimeout(() => n.classList.remove(kind), 1400); };
  const beam = (k, kind) => new Promise((res) => {
    const p = map.querySelector(`#au-${k}`);
    if (!p || reduce) { res(); return; }
    const L = p.getTotalLength();
    p.style.transition = 'none'; p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L;
    p.setAttribute('class', 'audit on ' + kind); void p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset .8s cubic-bezier(.5,0,.2,1)'; p.style.strokeDashoffset = 0;
    setTimeout(() => { res(); setTimeout(() => { p.setAttribute('class', 'audit'); p.style.strokeDashoffset = L; }, 900); }, 820);
  });
  let i = 0, n = 0, running = false, timer = 0, visible = false, gen = 0;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  async function check() {
    if (running) return; running = true;
    const k = ORDER[i++ % ORDER.length]; n++;
    dog.classList.add('scan');
    const caught = n % 5 === 3 && CATCH[k];
    await beam(k, caught ? 'warn' : 'ok');
    dog.classList.remove('scan');
    if (caught) {
      const [what, alert, fixed, short] = CATCH[k];
      flash(k, 'warn'); badge(k, '⚠ ' + short, 'warn'); log(`${NAME[k]}: ${what}`, 'warn');
      await wait(1300); log(`→ ${alert}`, 'warn');
      await wait(1500); flash(k, 'ok'); badge(k, '✓ FIXED', 'ok'); log(`${NAME[k]}: ${fixed} ✓`, 'ok');
    } else {
      flash(k, 'ok'); badge(k, '✓ VERIFIED', 'ok'); log(`${NAME[k]}: ${pick(OK[k])} ✓`, 'ok');
    }
    running = false;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const loop = () => { clearTimeout(timer); const g = ++gen; if (!visible || document.hidden) return; check().then(() => { if (g === gen) timer = setTimeout(loop, reduce ? 5200 : 2600); }); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; map.classList.toggle('live', visible); if (visible) loop(); else clearTimeout(timer); }, { threshold: 0.3 }).observe(map);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });
  log('watchdog: audit started, checking every part of the system');
})();
