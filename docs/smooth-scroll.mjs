/** Ease desktop wheel input on the real document without section locks.
 * Touch, keyboard, anchors, controls and reduced-motion views remain native.
 */
export function advanceScroll(current, target, elapsedMs) {
  if (Math.abs(target - current) < .5) return target;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, elapsedMs) / 110));
}

export function wheelPixels(delta, mode, viewportHeight) {
  return delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
}

export function wheelTarget(pending, delta, maximum, current = pending) {
  // An opposite gesture cancels unfinished travel before moving in the new direction.
  const base = delta * (pending - current) < 0 ? current : pending;
  return Math.max(0, Math.min(Math.max(0, maximum), base + delta));
}

function innerControlConsumes(event, delta) {
  for (const node of event.composedPath()) {
    if (!(node instanceof Element)) continue;
    if (node.matches('form, dialog, [role="dialog"], input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
    if (node === document.body || node === document.documentElement) break;
    const style = getComputedStyle(node);
    if (!/^(auto|scroll|overlay)$/.test(style.overflowY) || node.scrollHeight <= node.clientHeight + 1) continue;
    if ((delta < 0 && node.scrollTop > 0) || (delta > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return true;
    if (/^(contain|none)$/.test(style.overscrollBehaviorY)) return true;
  }
  return false;
}

export function installSmoothScroll({enabled = () => true} = {}) {
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => desktop.matches && !reduced.matches && enabled();
  const maximum = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  let frame = 0, target = scrollY, position = scrollY, applied = scrollY, lastTime = 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    target = position = applied = scrollY;
  }

  function tick(time) {
    frame = 0;
    if (!allowed() || document.hidden || Math.abs(scrollY - applied) > 1) return stop();
    target = wheelTarget(target, 0, maximum());
    position = advanceScroll(position, target, time - lastTime);
    lastTime = time;
    scrollTo({top: position, left: scrollX, behavior: 'instant'});
    applied = scrollY;
    if (position === target) return stop();
    frame = requestAnimationFrame(tick);
  }

  function wheel(event) {
    if (!allowed() || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || innerControlConsumes(event, event.deltaY)) {
      stop();
      return;
    }
    if (frame && Math.abs(scrollY - applied) > 1) stop();
    const next = wheelTarget(frame ? target : scrollY, wheelPixels(event.deltaY, event.deltaMode, innerHeight), maximum(), scrollY);
    if (!frame && next === scrollY) return;
    event.preventDefault();
    if (!frame) {
      position = applied = scrollY;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
    target = next;
  }

  function key(event) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop();
  }
  function externalScroll() {
    if (frame && Math.abs(scrollY - applied) > 1) stop();
  }
  function visibility() { if (document.hidden) stop(); }
  const listeners = [
    [window, 'wheel', wheel, {passive: false}],
    [window, 'scroll', externalScroll, {passive: true}],
    [window, 'keydown', key, {passive: true}],
    [window, 'pointerdown', stop, {passive: true}],
    [window, 'touchstart', stop, {passive: true}],
    [window, 'focusin', stop, {passive: true}],
    [window, 'resize', stop, {passive: true}],
    [document, 'visibilitychange', visibility],
    [desktop, 'change', stop],
    [reduced, 'change', stop],
  ];
  for (const [node, name, listener, options] of listeners) node.addEventListener(name, listener, options);
  return () => {
    stop();
    for (const [node, name, listener, options] of listeners) node.removeEventListener(name, listener, options);
  };
}
