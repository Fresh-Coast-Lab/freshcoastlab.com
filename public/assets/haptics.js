// A little buzz when you tap the sign.
// Android: the Vibration API. iPhone: Safari has no vibration API, but tapping a native switch
// (<input type="checkbox" switch>, iOS 18+) gives a system haptic tick, so an invisible one sits over the sign.
(() => {
  const orbit = document.querySelector('.hero .orbit');
  if (!orbit) return;
  const sw = document.createElement('input');
  sw.type = 'checkbox';
  sw.setAttribute('switch', '');
  sw.className = 'haptic-tap';
  sw.tabIndex = -1;
  sw.setAttribute('aria-hidden', 'true');
  orbit.append(sw);
  // the tap lands on the switch (haptic on iPhone); its click bubbles up to the sign, which starts the next act
  sw.addEventListener('click', () => {
    try { if (navigator.vibrate) navigator.vibrate([18, 40, 28]); } catch (e) { /* not supported */ }
    // and the sign takes a jolt: a hard, buzzing flicker
    orbit.classList.remove('zap'); void orbit.offsetWidth; orbit.classList.add('zap');
    clearTimeout(sw._z); sw._z = setTimeout(() => orbit.classList.remove('zap'), 900);
  });
})();
