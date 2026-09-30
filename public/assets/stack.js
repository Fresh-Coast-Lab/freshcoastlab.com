// The stack: one category at a time; tap a tool to see what I do with it.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the stack: one category at a time; tap a tool to see what I do with it
  const stk = document.querySelector('.stk');
  if (stk) {
    const say = (b) => { document.getElementById('stk-t').textContent = b.textContent.trim(); document.getElementById('stk-d').textContent = b.dataset.d;
      stk.querySelectorAll('.stk-g button').forEach((x) => x.classList.toggle('on', x === b)); };
    stk.querySelectorAll('.stk-tabs button').forEach((t) => t.addEventListener('click', () => {
      stk.querySelectorAll('.stk-tabs button').forEach((x) => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
      stk.querySelectorAll('.stk-g').forEach((g) => { g.hidden = g.dataset.g !== t.dataset.g; });
      const first = stk.querySelector(`.stk-g[data-g="${t.dataset.g}"] button`); if (first) say(first);
      t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }));
    stk.querySelectorAll('.stk-g button').forEach((b) => { b.addEventListener('click', () => say(b)); b.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) say(b); }); });
    say(stk.querySelector('.stk-g button'));
  }

})();
