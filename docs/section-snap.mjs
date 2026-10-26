import {introDistance} from './walkthrough.mjs?v=section-snap-v2';

// Rest only where an existing chapter's copy and its intended screen are visible.
export function storyStops(w,h,top=0) {
  if (![w,h,top].every(Number.isFinite) || w <= 0 || h <= 0) return [];
  const intro = introDistance(w,h);
  return [0,intro*.66,intro*.78,intro,
    intro+h,intro+2.1*h,intro+2.60*h,intro+2.75*h,intro+3.25*h,intro+4.35*h]
    .map(position => position+top);
}

export function nextStop(y,delta,stops) {
  if (!Number.isFinite(y) || !Number.isFinite(delta) || delta === 0 || !stops?.length) return null;
  const tolerance = 2;
  if (y < stops[0]-tolerance || y > stops.at(-1)+tolerance) return null;
  if (delta > 0) return stops.find(position => position > y+tolerance) ?? null;
  for (let index=stops.length-1;index>=0;index--) {
    if (stops[index] < y-tolerance) return stops[index];
  }
  return null;
}

export function snapPosition(from,to,elapsedMs,durationMs=1800) {
  if (!Number.isFinite(durationMs)) durationMs = 1800;
  if (durationMs <= 0) return to;
  if (!(elapsedMs > 0)) return from;
  if (elapsedMs >= durationMs) return to;
  const t = elapsedMs/durationMs;
  // Quintic easing reaches rest with zero velocity and acceleration at both ends.
  // Mirror the second half to avoid cancellation/overshoot near the destination.
  const edge = t <= .5 ? t : 1-t;
  const ramp = edge*edge*edge*(edge*(edge*6-15)+10);
  const eased = t <= .5 ? ramp : 1-ramp;
  return from+(to-from)*eased;
}

export function createWheelGesture({quietMs=180,threshold=36,reverseThreshold=72}={}) {
  let lastTime = -Infinity;
  let accepted = 0;
  let pending = 0;
  let reverse = 0;
  function reset() {
    lastTime = -Infinity;
    accepted = 0;
    pending = 0;
    reverse = 0;
  }
  return {
    reset,
    push(delta,time) {
      if (!Number.isFinite(delta) || !Number.isFinite(time) || delta === 0) return 0;
      if (time-lastTime >= quietMs || time < lastTime) reset();
      lastTime = time;
      if (!accepted) {
        pending += delta;
        if (Math.abs(pending) < threshold) return 0;
        accepted = Math.sign(pending);
        pending = 0;
        return accepted;
      }
      if (Math.sign(delta) === accepted) {
        reverse = 0;
        return 0;
      }
      reverse += Math.abs(delta);
      if (reverse < reverseThreshold) return 0;
      accepted = -accepted;
      reverse = 0;
      return accepted;
    },
  };
}
