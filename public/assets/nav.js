// Floating dock (scroll-spy + progress) and the full-screen menu. Shared by every page.
(() => {
  // nav: floating dock after the hero, scroll-spy, full-screen menu
  const dock = document.getElementById('dock'), menu = document.getElementById('menu'), here = document.getElementById('here');
  const secs = ['lab', 'house', 'archive', 'stack', 'stage', 'writing', 'about', 'contact'].map((id) => document.getElementById(id)).filter(Boolean);
  const NAMES = { lab: 'THE LAB', house: 'THE HOUSE', archive: 'THE ARCHIVE', stack: 'THE STACK', stage: 'STAGE', writing: 'WRITING', about: 'ABOUT', contact: 'CONTACT' };
  const heroEl = document.querySelector('.hero'); // absent on inner pages: the dock is always shown there
  let cur = null;
  const spy = () => {
    const y = scrollY, vh = innerHeight;
    dock.classList.toggle('show', (!heroEl || y > heroEl.offsetHeight * 0.6) && !menu.classList.contains('open'));
    let c = '';
    for (const s of secs) if (s.getBoundingClientRect().top < vh * 0.4) c = s.id;
    if (c !== cur) {
      cur = c;
      const i = secs.findIndex((s) => s.id === c);
      here.innerHTML = c ? `<b>0${i + 1}</b>${NAMES[c]}` : (document.body.dataset.here || '');
      document.querySelectorAll('[data-s]').forEach((a) => a.classList.toggle('on', a.dataset.s === c));
    }
    const max = document.documentElement.scrollHeight - vh;
    dock.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  };
  addEventListener('scroll', spy, { passive: true }); addEventListener('resize', spy); spy();
  let lastFocus = null;
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
    document.querySelectorAll('.menu-btn').forEach((b) => b.setAttribute('aria-expanded', open));
    if (open) { lastFocus = document.activeElement; setTimeout(() => menu.querySelector('.x').focus(), 50); } else if (lastFocus) lastFocus.focus({ preventScroll: true });
    spy();
  };
  document.querySelectorAll('.menu-btn').forEach((b) => b.addEventListener('click', () => setMenu(true)));
  menu.querySelector('.x').addEventListener('click', () => setMenu(false));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { lastFocus = null; setMenu(false); }));
  addEventListener('keydown', (e) => {
    if (!menu.classList.contains('open')) return;
    if (e.key === 'Escape') setMenu(false);
    if (e.key === 'Tab') { const f = [...menu.querySelectorAll('a,button')]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  });

})();
