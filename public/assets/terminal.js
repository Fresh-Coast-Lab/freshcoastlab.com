// freshcoast-os: a hidden terminal. Press ` or ~ anywhere you are not typing, or tap the coordinates line.
// Until it is opened it costs two listeners. The DOM, styles in use and every command are built on first open.
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE = matchMedia('(pointer: coarse)');
  const PS = 'guest@freshcoast:~$';
  const SECTIONS = ['house', 'archive', 'lab', 'stage', 'playbooks', 'writing', 'stack', 'about', 'how', 'contact'];
  const PAGES = { writing: '/writing/', stage: '/stage/', stack: '/stack/', archive: '/archive/' };
  const FILES = ['about.txt', 'silent-failures.md', 'stack.txt'];
  const CHIPS = ['help', 'whoami', 'neofetch', 'ls', 'ufo', 'matrix'];
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  let root, panel, screen, out, input, cur, canvas;
  let built = false, isOpen = false, busy = false, job = 0, lastFocus = null, kIdx = 0;
  let hist = [], hi = 0, draft = '';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };

  // ---------- output ----------
  const scrollEnd = () => { screen.scrollTop = screen.scrollHeight; };
  function print(html = '', cls = '') {
    const d = document.createElement('div');
    d.className = 'l' + (cls ? ' ' + cls : '');
    d.innerHTML = html || '&nbsp;';
    out.appendChild(d);
    while (out.childElementCount > 400) out.firstElementChild.remove();
    scrollEnd();
    return d;
  }
  const say = (text, cls) => print(esc(text), cls);
  const echo = (cmd) => print(`<span class="ps">${PS}</span> ${esc(cmd)}`, 'cmd');
  const grid = (rows, cls = '') => print(rows.map(([a, b]) => `<span class="k">${a}</span><span>${b}</span>`).join(''), 'grid ' + cls);

  // ---------- facts (all from the page itself) ----------
  const liveNum = (id) => { const t = document.getElementById(id)?.textContent.trim(); return t && t !== '-' ? t : ''; };

  const LOGO = [
    '        |        ',
    '  \\     |     /  ',
    '    \\   |   /    ',
    '      \\ | /      ',
    ' -------<b>*</b>------- ',
    '      / | \\      ',
    '    /   |   \\    ',
    '  /     |     \\  ',
    '        |        ',
  ].join('\n');

  // WMO weather codes, the short version
  const sky = (c) => c == null || !isFinite(c) ? '' : c === 0 ? 'clear' : c <= 2 ? 'partly cloudy' : c === 3 ? 'overcast' : c <= 48 ? 'fog'
    : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow' : c <= 82 ? 'showers' : c <= 86 ? 'snow showers' : 'thunderstorms';
  const compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

  // ---------- commands ----------
  const CMDS = {
    help: ['this list', () => {
      grid([
        ['help', 'this list'], ['whoami', 'who runs this place'], ['uptime', 'how the house is holding up'],
        ['ls', 'list sections'], ['cd &lt;section&gt;', 'go there'], ['cat &lt;file&gt;', FILES.join(', ')],
        ['open &lt;page&gt;', Object.keys(PAGES).join(', ')], ['neofetch', 'system info, with a logo'],
        ['date', 'Traverse City time'], ['weather', 'ask the lake'], ['history', 'what you typed'],
        ['clear', 'wipe the screen'], ['ufo, comet, bigfoot', 'summon a visitor'],
        ['matrix', 'three seconds of green rain'], ['exit', 'back to the website'],
      ]);
      say('there are others. there are always others.', 'dim');
    }],
    whoami: ['', () => {
      say('guest. but you meant him:', 'dim');
      say('Jason Myers. Cybersecurity and AI strategist in the MSP channel.');
      say('Former senior Java/.NET developer. Two-time founder. Ex-CPO of Judy Security.');
      say('Runs AI at home before he talks about it on stage.');
      say('Traverse City, MI. 44.76°N 85.62°W', 'aq');
    }],
    uptime: ['', () => {
      const t = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date());
      say(` ${t} up 25+ yrs, 1 user, automations: ${liveNum('ls-auto') || 39}, load average: 2 macs, 1 watchdog, 1 lake`);
      const rep = liveNum('ls-repair');
      if (rep) say(` house: ${rep} since the last self-repair (live)`, 'dim');
    }],
    ls: ['', () => {
      print(SECTIONS.map((s) => `<span class="dir">${s}/</span>`).join('') + FILES.map((f) => `<span>${f}</span>`).join(''), 'ls');
    }],
    cd: ['', (a) => {
      const t = (a[0] || '~').toLowerCase().replace(/^(~\/|\.\/|\/|#)/, '').replace(/\/$/, '');
      if (!t || t === '~' || t === '..' || t === 'main' || t === 'top') return go(null);
      if (SECTIONS.includes(t)) return go(t);
      say(`cd: no such section: ${t}. try 'ls'`, 'err');
    }],
    cat: ['', (a) => {
      const f = (a[0] || '').toLowerCase().replace(/^\.\//, '');
      if (!f) return say(`cat: which one? ${FILES.join(', ')}`, 'err');
      if (SECTIONS.includes(f.replace(/\/$/, ''))) return say(`cat: ${f}: is a directory. try 'cd ${f.replace(/\/$/, '')}'`, 'err');
      if (f === 'about.txt') {
        say('# about.txt', 'h');
        [
          'Home is the fresh coast: Traverse City, on Lake Michigan.',
          'Lions and Michigan State fan, which builds character.',
          'KEXP is the favorite radio station, so Seattle trips include a studio stop.',
          'Tried surfing in San Diego this summer. Did not stand up once.',
          'Banff is the most beautiful place he has ever been.',
          'Can still hear the AOL dial-up sound.',
          'The house doubles as the test lab. He is the family\'s unofficial archivist.',
        ].forEach((l) => say(l));
      } else if (f === 'silent-failures.md') {
        say('# the camera that went quiet', 'h');
        [
          '1. The floodlight came on. The phone stayed silent. For six days.',
          '2. Every dashboard said healthy. The last motion event was six days old.',
          '3. Cause: a live stream held open, and a camera that skips motion events while someone is watching.',
          '4. The fix took ten minutes. The real fix: a watchdog that notices when chatty things go quiet.',
          '5. Monitor agreement, not uptime.',
        ].forEach((l) => say(l));
        print('<a href="/writing/the-camera-that-went-quiet/">&rarr; read the whole thing: /writing/the-camera-that-went-quiet/</a>', 'aq');
      } else if (f === 'stack.txt') {
        say('# stack.txt (the top 15 of 94)', 'h');
        grid([
          ['home', 'Home Assistant, Zigbee, MQTT, Matter, ESPHome'],
          ['agents', 'Claude Code, Model Context Protocol, Claude API'],
          ['code', 'Python, Cloudflare Workers, WebGL2 + GLSL'],
          ['media', 'Plex, Docker'],
          ['guardrails', 'gitleaks, GitHub Actions'],
        ]);
        say("the other 79: 'open stack'", 'dim');
      } else say(`cat: ${f}: No such file or directory`, 'err');
    }],
    open: ['', (a) => {
      const t = (a[0] || '').toLowerCase().replace(/^\/|\/$/g, '');
      if (!PAGES[t]) return say(`open: try ${Object.keys(PAGES).join(', ')}`, 'err');
      say(`opening ${PAGES[t]} ...`, 'dim');
      setTimeout(() => { location.href = PAGES[t]; }, RM.matches ? 0 : 280);
    }],
    neofetch: ['', () => {
      const row = (k, v) => `<span class="k">${k}</span><span>${v}</span>`;
      print(`<pre class="logo" aria-hidden="true">${LOGO}</pre><div class="info"><b class="who">guest@freshcoast</b><span class="rule">----------------</span><div class="grid">${[
        row('OS', 'freshcoast-os 1.0 (tty1)'),
        row('Host', 'Traverse City, MI'),
        row('Coords', '44.76°N 85.62°W'),
        row('Kernel', 'Java/.NET, recompiled as strategy'),
        row('Uptime', '25+ yrs in tech'),
        row('Shell', 'zsh'),
        row('Terminal', 'Claude Code, on two Macs'),
        row('Packages', '94 (open stack)'),
        row('Home', `Home Assistant, ${liveNum('ls-auto') || 39} automations`),
        row('Mesh', 'Zigbee over MQTT'),
        row('Agents', 'watched by a watchdog'),
        row('Memory', 'one shared repo'),
        row('Archive', '52,221 photos, 61 reels'),
        row('Policy', 'a human approves'),
      ].join('')}</div><span class="sw"><i></i><i></i><i></i><i></i><i></i></span></div>`, 'neo');
    }],
    date: ['', () => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short' })
        .formatToParts(new Date()).map((x) => [x.type, x.value]));
      say(`${p.weekday} ${p.month} ${p.day.padStart(2)} ${p.hour}:${p.minute}:${p.second} ${p.timeZoneName} ${p.year}`);
      say('Traverse City, MI', 'dim');
    }],
    weather: ['', async () => {
      const wait = say('asking the lake ...', 'dim');
      let msg = 'the lake is quiet.';
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch('/api/weather', { signal: ctl.signal, headers: { accept: 'application/json' } });
        clearTimeout(to);
        if (r.status === 200 && (r.headers.get('content-type') || '').includes('json')) {
          const d = await r.json();
          const temp = d.temp_f ?? d.temp ?? d.temperature;
          const bits = [
            isFinite(temp) && temp !== null ? `${Math.round(temp)}°F` : '',
            sky(d.code),
            isFinite(d.wind_mph) && d.wind_mph !== null ? `wind ${Math.round(d.wind_mph)} mph${isFinite(d.wind_dir) && d.wind_dir !== null ? ' ' + compass(d.wind_dir) : ''}` : '',
            isFinite(d.wave_ft) && d.wave_ft !== null ? `waves ${d.wave_ft} ft` : '',
          ].filter(Boolean);
          if (typeof d.sunset === 'string' && /T\d\d:\d\d/.test(d.sunset)) bits.push(`sunset ${d.sunset.split('T')[1].slice(0, 5)}`);
          if (bits.length) msg = `Traverse City: ${bits.join(', ')}`;
        }
      } catch { /* offline or no endpoint: the lake stays quiet */ }
      wait.remove();
      say(msg);
    }],
    history: ['', () => { print(hist.map((h, i) => `<span class="k">${String(i + 1).padStart(4)}</span><span>${esc(h)}</span>`).join(''), 'grid'); }],
    clear: ['', () => { out.textContent = ''; }],
    ufo: ['', () => act('ufo')],
    monster: ['', () => act('comet')],
    bigfoot: ['', () => act('bigfoot')],
    comet: ['', () => act('comet')],
    sudo: ['', () => say('nice try. this incident has been logged (to a watchdog that actually checks).', 'err')],
    rm: ['', () => say("rm: permission denied. nothing gets deleted without a human's yes.", 'err')],
    matrix: ['', () => matrix()],
    konami: ['', () => {
      say('up, up, down, down, left, right, left, right, b, a.', 'aq');
      say('not in here. out there, on the page.', 'dim');
    }],
    echo: ['', (a) => say(a.join(' '))],
    pwd: ['', () => say('/home/guest (on the fresh coast)')],
    exit: ['', () => close()],
  };
  CMDS.quit = CMDS.logout = CMDS.exit;
  const ALIAS = new Set(['quit', 'logout']);

  async function run(raw) {
    const line = raw.trim();
    echo(raw);
    if (!line) return;
    if (hist[hist.length - 1] !== line) { hist.push(line); hist = hist.slice(-50); store('fct-hist', hist); }
    hi = hist.length; draft = '';
    const lc = line.toLowerCase().replace(/\s+/g, ' ');
    if (/^(sudo )?rm -(rf|fr|r -f|f -r) (\/|\/\*|~|\*)$/.test(lc)) return rmrf();
    if (/^sudo make (me )?(a )?(cup of )?coffee$/.test(lc)) {
      say('error 418: I\'m a teapot.', 'err');
      return say('39 automations and the coffee is still manual. some things deserve a human.', 'dim');
    }
    if (lc === 'sudo') return say('usage: sudo <command>. not that it will help.', 'dim');
    if (lc === ':q' || lc === ':wq' || lc === ':q!') { say("this isn't vim. but fine.", 'dim'); return setTimeout(close, RM.matches ? 0 : 450); }
    const [cmd, ...args] = line.split(/\s+/);
    const c = CMDS[cmd.toLowerCase()];
    if (!c) return say(`command not found: ${cmd.slice(0, 40)}. try 'help'`, 'err');
    await c[1](args);
  }

  // ---------- page actions ----------
  function go(id) {
    say(id ? `→ #${id}` : '→ top', 'aq');
    setTimeout(() => {
      close(true);
      const behavior = RM.matches ? 'auto' : 'smooth';
      if (id) document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
      else scrollTo({ top: 0, behavior });
    }, RM.matches ? 0 : 220);
  }

  function act(name) {
    const acts = window.__acts || {}, fn = acts[name];
    if (typeof fn !== 'function') {
      if (RM.matches || !window.__acts) return say('reduced motion is on, so the visitors stayed home. considerate of them.', 'dim');
      const here = Object.keys(acts).filter((k) => typeof acts[k] === 'function' && k in CMDS);
      return say(`${name} is off duty tonight.${here.length ? ` on call: ${here.join(', ')}` : ''}`, 'dim');
    }
    say(`scanning the horizon for ${name} ...`, 'aq');
    setTimeout(() => {
      close(true);
      scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
      // wait for the smooth scroll to land (or give up after 1.6s), then cue the act
      const t0 = performance.now();
      const tick = () => (scrollY < 4 || performance.now() - t0 > 1600) ? setTimeout(fn, 250) : requestAnimationFrame(tick);
      requestAnimationFrame(tick);
    }, 300);
  }

  async function rmrf() {
    const my = ++job; busy = true;
    say('rm: descending into / ...', 'err');
    const paths = ['/house/automations (39)', '/lab/agents', '/archive/photos (52,221)', '/archive/reels (61)', '/writing/drafts', '/home/guest/dignity'];
    if (!RM.matches) {
      const bar = print('', 'bar'); bar.setAttribute('aria-hidden', 'true');
      for (let p = 0; p <= 100; p = Math.min(100, p + 3 + Math.floor(Math.random() * 7))) {
        if (my !== job) return;
        const n = Math.round(p / 100 * 22);
        bar.innerHTML = `[${'#'.repeat(n)}${'.'.repeat(22 - n)}] ${String(p).padStart(3)}%<br><span class="dim">deleting ${paths[Math.min(paths.length - 1, Math.floor(p / 100 * paths.length))]}</span>`;
        scrollEnd();
        if (p === 100) break;
        await sleep(55 + Math.random() * 90);
      }
      await sleep(500);
      if (my !== job) return;
    }
    say('just kidding. backups are verified nightly.', 'ok');
    busy = false;
  }

  function matrix() {
    if (RM.matches) return say("matrix: reduced motion is on, so picture the green rain. it's very dramatic.", 'dim');
    const my = ++job; busy = true;
    const dpr = Math.min(2, devicePixelRatio || 1), crt = canvas.parentElement;
    const w = crt.clientWidth, h = crt.clientHeight, fs = w < 500 ? 13 : 15;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#020806'; ctx.fillRect(0, 0, w, h);
    canvas.hidden = false; canvas.classList.remove('fade');
    const G = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789FCL$#*<>/';
    const drops = Array.from({ length: Math.ceil(w / fs) }, () => -Math.random() * (h / fs));
    const heads = drops.map(() => ' ');
    let t0 = 0, last = 0;
    const frame = (t) => {
      if (my !== job) { canvas.hidden = true; return; }
      if (!t0) t0 = t;
      if (t - last > 45) {
        last = t;
        ctx.fillStyle = 'rgba(2,8,6,.16)'; ctx.fillRect(0, 0, w, h);
        ctx.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
        drops.forEach((d, i) => {
          const x = i * fs, y = d * fs;
          // repaint last frame's bright head in green (same glyph, so no overstrike), then draw the new head
          ctx.fillStyle = '#020806'; ctx.fillRect(x, y - 2 * fs + 3, fs, fs);
          ctx.fillStyle = '#3DF2B0'; ctx.fillText(heads[i], x, y - fs);
          heads[i] = G[(Math.random() * G.length) | 0];
          ctx.fillStyle = '#E4FFF5'; ctx.fillText(heads[i], x, y);
          drops[i] = y > h && Math.random() > 0.96 ? 0 : d + 1;
        });
      }
      if (t - t0 < 3000) return requestAnimationFrame(frame);
      canvas.classList.add('fade');
      setTimeout(() => {
        if (my !== job) return;
        canvas.hidden = true; busy = false;
        say('wake up, guest. the lab has you. (it is mostly YAML.)', 'ok');
        focusIn();
      }, 450);
    };
    requestAnimationFrame(frame);
  }

  // ---------- completion + history ----------
  function complete() {
    const v = input.value;
    const parts = v.replace(/^\s+/, '').split(/\s+/);
    const word = parts[parts.length - 1].toLowerCase();
    const head = parts[0].toLowerCase();
    let pool;
    if (parts.length === 1) pool = Object.keys(CMDS).filter((k) => !ALIAS.has(k));
    else if (parts.length === 2 && head === 'cd') pool = SECTIONS;
    else if (parts.length === 2 && head === 'open') pool = Object.keys(PAGES);
    else if (parts.length === 2 && head === 'cat') pool = FILES;
    else if (parts.length === 2 && head === 'sudo') pool = Object.keys(CMDS).concat('make');
    else if (parts.length === 3 && head === 'sudo' && parts[1] === 'make') pool = ['coffee'];
    else return;
    const m = pool.filter((p) => p.startsWith(word)).sort();
    if (!m.length) return;
    let pre = m[0];
    for (const x of m) while (!x.startsWith(pre)) pre = pre.slice(0, -1);
    const stem = v.slice(0, v.length - word.length);
    if (m.length === 1) input.value = stem + m[0] + ' ';
    else if (pre.length > word.length) input.value = stem + pre;
    else { echo(v); print(m.map((x) => `<span>${x}</span>`).join(''), 'ls'); }
    caret();
  }

  function recall(d) {
    if (!hist.length) return;
    if (hi === hist.length) draft = input.value;
    hi = Math.max(0, Math.min(hist.length, hi + d));
    input.value = hi === hist.length ? draft : hist[hi];
    caret();
  }

  // block cursor: the font is monospaced, so the caret sits at index * 1ch, less the input's own scroll
  function caret() {
    requestAnimationFrame(() => {
      const end = input.value.length;
      if (input.selectionStart == null) input.setSelectionRange(end, end);
      cur.style.transform = `translateX(calc(${input.selectionStart}ch - ${input.scrollLeft}px))`;
      cur.classList.remove('rest'); void cur.offsetWidth; cur.classList.add('rest');
    });
  }

  // ---------- open / close ----------
  function fit() {
    const vv = visualViewport;
    if (!vv || !isOpen) return;
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--kb', kb + 'px');
    root.style.setProperty('--vvh', vv.height + 'px');
    scrollEnd();
  }

  const focusables = () => [...root.querySelectorAll('button, input, a[href]')].filter((el) => el.offsetParent !== null);
  const focusIn = () => { if (isOpen && !COARSE.matches) input.focus({ preventScroll: true }); };

  function build() {
    built = true;
    root = document.createElement('div');
    root.className = 'fct'; root.hidden = true;
    root.innerHTML = `<div class="fct-bg"></div>
<div class="fct-panel" role="dialog" aria-modal="true" aria-labelledby="fct-t" tabindex="-1">
  <div class="fct-bar"><span class="fct-led" aria-hidden="true"></span><span id="fct-t">freshcoast-os <span>tty1</span></span><span class="fct-hint" aria-hidden="true">esc to close</span><button class="fct-x" type="button" aria-label="Close terminal">&times;</button></div>
  <div class="fct-crt">
    <div class="fct-screen">
      <div class="fct-out" role="log" aria-live="polite" aria-relevant="additions"></div>
      <form class="fct-line" autocomplete="off"><label class="ps" for="fct-in">${PS}</label><span class="fct-field"><input id="fct-in" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Command"><i class="fct-cur" aria-hidden="true"></i></span></form>
    </div>
    <canvas class="fct-mx" aria-hidden="true" hidden></canvas>
  </div>
  <div class="fct-chips" aria-label="Quick commands">${CHIPS.map((c) => `<button type="button" data-c="${c}">${c}</button>`).join('')}</div>
</div>`;
    document.body.appendChild(root);
    panel = root.querySelector('.fct-panel'); screen = root.querySelector('.fct-screen'); out = root.querySelector('.fct-out');
    input = root.querySelector('input'); cur = root.querySelector('.fct-cur'); canvas = root.querySelector('canvas');
    hist = store('fct-hist') || []; hi = hist.length;

    root.querySelector('.fct-bg').addEventListener('click', () => close());
    root.querySelector('.fct-x').addEventListener('click', () => close());
    root.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
    root.querySelector('.fct-chips').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || busy) return;
      input.value = ''; run(b.dataset.c); caret();
    });
    screen.addEventListener('click', (e) => { if (!e.target.closest('a') && !String(getSelection())) { input.focus({ preventScroll: true }); caret(); } });
    ['input', 'click', 'keyup', 'select', 'focus'].forEach((ev) => input.addEventListener(ev, caret));
    input.addEventListener('scroll', caret);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (busy) return; const v = input.value; input.value = ''; caret(); run(v); }
      else if (e.key === 'Tab' && !e.shiftKey && input.value.trim()) { e.preventDefault(); e.stopPropagation(); complete(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); recall(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); recall(1); }
      else if (e.ctrlKey && e.key === 'l') { e.preventDefault(); out.textContent = ''; }
      else if (e.ctrlKey && e.key === 'c' && !getSelection().toString()) { e.preventDefault(); job++; busy = false; canvas.hidden = true; echo(input.value + '^C'); input.value = ''; caret(); }
      else if (e.ctrlKey && e.key === 'u') { e.preventDefault(); input.value = ''; caret(); }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (job && busy && canvas && !canvas.hidden && e.key.length === 1) { job++; canvas.hidden = true; busy = false; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    });
    // keep focus inside while open (aria-modal is a promise, this keeps it)
    document.addEventListener('focusin', (e) => { if (isOpen && !root.contains(e.target)) (COARSE.matches ? panel : input).focus({ preventScroll: true }); });
    if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }

    print('freshcoast-os 1.0 (tty1)  type \'help\'', 'boot');
    const last = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    say(`last login: ${last} on ttys001, from the fresh coast`, 'dim');
  }

  function open() {
    if (isOpen) return;
    if (!built) build();
    lastFocus = document.activeElement;
    isOpen = true;
    root.hidden = false;
    void root.offsetWidth; // commit the closed state so the slide-up transition runs
    root.classList.add('open');
    document.documentElement.classList.add('fct-on');
    fit(); scrollEnd();
    // phones: focus the dialog, not the input, so the keyboard does not cover the chips until asked for
    (COARSE.matches ? panel : input).focus({ preventScroll: true });
    caret();
  }

  function close(leaving) {
    if (!isOpen) return;
    isOpen = false; job++; busy = false;
    if (canvas) canvas.hidden = true;
    root.classList.remove('open');
    document.documentElement.classList.remove('fct-on');
    input.blur();
    setTimeout(() => { if (!isOpen) root.hidden = true; }, RM.matches ? 0 : 380);
    if (!leaving && lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // ---------- the only always-on cost: two listeners and a class ----------
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) { kIdx = 0; return; }
    if (!isOpen && (e.key === '`' || e.key === '~')) { e.preventDefault(); open(); return; }
    // the konami code, entered on the page itself
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) {
      kIdx = 0; open();
      say('konami accepted. +30 lives. you will need them in the channel.', 'ok');
      CMDS.neofetch[1]();
    }
  });

  const kick = document.querySelector('.intro .kicker');
  if (kick) {
    kick.classList.add('fct-kick');
    kick.title = 'psst. there is a terminal in here. tap, or press ` on a keyboard';
    kick.addEventListener('click', open);
  }

  // a small hook for tests and the curious
  window.__fct = { open, close, run: (c) => { open(); return run(c); }, get busy() { return busy; } };
})();
