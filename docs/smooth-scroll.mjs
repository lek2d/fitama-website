import {createWheelGesture,nextStop,snapPosition} from './section-snap.mjs?v=slow-snap-v1';

/** Scroll the real document, with optional readable stops in the animated story.
 * installSmoothScroll({enabled,getStops,touchSurface}) returns a cleanup function.
 * The caller supplies its motion/pause policy; OS Reduce Motion is also respected here.
 */
export function advanceScroll(current, target, elapsedMs) {
  if (Math.abs(target - current) < .5) return target;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, elapsedMs) / 90));
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

export function installSmoothScroll({enabled = () => true,getStops = () => [],touchSurface = null} = {}) {
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => desktop.matches && !reduced.matches && enabled();
  const snapAllowed = () => !reduced.matches && enabled();
  const maximum = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  let frame = 0, target = scrollY, position = scrollY, applied = scrollY, lastTime = 0;
  let snapping = false, from = scrollY, started = 0, touch = null;
  let lastSnapDirection = 0, lastSnapWheelTime = -Infinity;
  const gesture = createWheelGesture();

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    snapping = false;
    target = position = applied = scrollY;
  }

  function interrupt() {stop();gesture.reset();touch=null;lastSnapDirection=0;lastSnapWheelTime=-Infinity;}

  function startSnap(destination) {
    if (destination === null) return;
    cancelAnimationFrame(frame);
    from = position = applied = scrollY;
    target = Math.max(0,Math.min(maximum(),destination));
    started = performance.now();
    snapping = true;
    frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    if (!(snapping ? snapAllowed() : allowed()) || document.hidden || Math.abs(scrollY - applied) > 1) return interrupt();
    target = wheelTarget(target, 0, maximum());
    position = snapping ? snapPosition(from,target,time-started) : advanceScroll(position, target, time - lastTime);
    lastTime = time;
    scrollTo({top: position, left: scrollX, behavior: 'instant'});
    applied = scrollY;
    if (position === target) return stop();
    frame = requestAnimationFrame(tick);
  }

  function wheel(event) {
    if (!allowed() || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || innerControlConsumes(event, event.deltaY)) {
      interrupt();
      return;
    }
    if (frame && Math.abs(scrollY - applied) > 1) interrupt();
    const pixels = wheelPixels(event.deltaY,event.deltaMode,innerHeight);
    // Line-mode mouse events are explicit steps, even at a one-line OS setting.
    const intent = event.deltaMode===1 ? Math.sign(pixels)*Math.max(120,Math.abs(pixels)) : pixels;
    const stops = getStops();
    const destination = nextStop(scrollY,pixels,stops);
    const now = performance.now();
    const outwardTail = destination===null && Math.sign(pixels)===lastSnapDirection && now-lastSnapWheelTime<180
      && (pixels>0 ? Math.abs(scrollY-stops.at(-1))<=2 : Math.abs(scrollY-stops[0])<=2);
    if (outwardTail) {
      event.preventDefault();gesture.push(intent,now);lastSnapWheelTime=now;return;
    }
    if (destination !== null) {
      event.preventDefault();
      const direction = gesture.push(intent,now);
      lastSnapWheelTime=now;
      // Ignore a continuing forward burst while traveling; a deliberate reversal
      // can immediately return from the visible position to the preceding stop.
      if (direction && (!frame || !snapping || direction*(target-scrollY)<0)) {
        lastSnapDirection=direction;startSnap(nextStop(scrollY,direction,stops));
      }
      return;
    }
    gesture.reset();lastSnapDirection=0;lastSnapWheelTime=-Infinity;
    if (snapping) stop();
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
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) interrupt();
  }
  function externalScroll() {
    if (frame && Math.abs(scrollY - applied) > 1) interrupt();
  }
  function visibility() { if (document.hidden) interrupt(); }
  function touchStart(event) {
    interrupt();
    if (!snapAllowed() || event.touches.length!==1 || !touchSurface?.contains(event.target)) return;
    if (innerControlConsumes(event,1) || innerControlConsumes(event,-1)) return;
    const point=event.touches[0];
    touch={x:point.clientX,y:point.clientY,origin:scrollY,dx:0,delta:0,destination:null,captured:false};
  }
  function touchMove(event) {
    if (!touch) return;
    if (!snapAllowed() || event.touches.length!==1) {touch=null;return;}
    const point=event.touches[0],dx=point.clientX-touch.x,dy=touch.y-point.clientY;
    touch.dx=dx;touch.delta=dy;
    if (Math.abs(dx)>12 && Math.abs(dx)>=Math.abs(dy)) {touch=null;return;}
    if (Math.abs(dy)<12) return;
    const destination=nextStop(touch.origin,dy,getStops());
    // If the browser has already committed native scrolling, let it finish.
    // Pinch zoom, horizontal gestures and controls are never made non-scrollable.
    if (destination===null || !event.cancelable || innerControlConsumes(event,dy)) {touch=null;return;}
    event.preventDefault();
    touch.delta=dy;touch.destination=destination;touch.captured=true;
  }
  function touchEnd(event) {
    const completed=touch;touch=null;
    if (!completed?.captured || !snapAllowed()) return;
    if (event.cancelable) event.preventDefault();
    const point=event.changedTouches?.[0];
    const dx=point ? point.clientX-completed.x : completed.dx;
    const dy=point ? completed.y-point.clientY : completed.delta;
    if (Math.abs(dy)<36 || Math.abs(dx)>=Math.abs(dy)) return;
    startSnap(nextStop(completed.origin,dy,getStops()));
  }
  const listeners = [
    [window, 'wheel', wheel, {passive: false}],
    [window, 'scroll', externalScroll, {passive: true}],
    [window, 'keydown', key, {passive: true}],
    [window, 'pointerdown', interrupt, {passive: true}],
    [window, 'touchstart', touchStart, {passive: true}],
    [window, 'touchmove', touchMove, {passive: false}],
    [window, 'touchend', touchEnd, {passive: false}],
    [window, 'touchcancel', interrupt, {passive: true}],
    [window, 'focusin', interrupt, {passive: true}],
    [window, 'resize', interrupt, {passive: true}],
    [document, 'visibilitychange', visibility],
    [desktop, 'change', interrupt],
    [reduced, 'change', interrupt],
  ];
  for (const [node, name, listener, options] of listeners) node.addEventListener(name, listener, options);
  return () => {
    interrupt();
    for (const [node, name, listener, options] of listeners) node.removeEventListener(name, listener, options);
  };
}
