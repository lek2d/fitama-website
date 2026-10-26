import test from 'node:test';
import assert from 'node:assert/strict';
import {walkthrough} from '../docs/walkthrough.mjs';

import {storyStops,nextStop,snapPosition,createWheelGesture} from '../docs/section-snap.mjs';

for (const [w,h] of [[320,568],[390,844],[699,900],[700,900],[1440,900],[2560,1440]]) {
  test(`every snap has readable copy and a distinct story beat at ${w}×${h}`, () => {
    const stops = storyStops(w,h);
    assert.equal(stops.length,10);
    assert.equal(stops[0],0);
    assert.ok(stops.every((position,index) => Number.isFinite(position) && (index === 0 || position > stops[index-1])));
    const views = stops.map(position => walkthrough(position,w,h));
    assert.equal(views[0].scene.heroOpacity,1);
    assert.equal(views[1].scene.followOpacity,1,'the egg-follow copy is completely readable');
    assert.equal(views[2].scene.landingOpacity,1,'the hatch copy is completely readable');
    const visibleScreen = view => view.active === 0 ? 'movement' : view.active === 1 ? 'health'
      : view.active === 2 ? view.result > .5 ? 'result' : view.battle > .5 ? 'battle' : 'map'
      : view.progressScreen;
    assert.deepEqual(views.slice(3).map(visibleScreen),['movement','health','map','battle','result','equipment','shop']);
    for (const view of views.slice(3)) {
      assert.equal(view.textOpacity[view.active],1,'snapping never parks between copy fades');
      assert.equal(view.scene.tpOpacity,1);
    }
  });
}

test('story stops follow the document top without changing their spacing', () => {
  const stops = storyStops;
  const base = stops(1440,900);
  assert.deepEqual(stops(1440,900,137),base.map(position => position+137));
  assert.deepEqual(stops(0,900),[]);
  assert.deepEqual(stops(390,Infinity),[]);
});

for (const [w,h] of [[390,844],[1440,900]]) {
  test(`intro snaps complete the egg handoff and hatch before gameplay grows at ${w}×${h}`, () => {
    const stops = storyStops(w,h);
    const follow = walkthrough(stops[1],w,h).scene;
    const hatch = walkthrough(stops[2],w,h).scene;
    assert.equal(follow.screenOpacity,1,'the egg is completely handed into the phone');
    assert.equal(follow.eggOpacity,0,'no duplicate floating egg remains');
    assert.equal(follow.reveal,0,'the egg has not hatched at the follow stop');
    assert.equal(hatch.reveal,1,'the hatch completes before stopping');
    assert.equal(follow.followOpacity,1);
    assert.equal(hatch.landingOpacity,1);
    assert.equal(hatch.phoneW,follow.phoneW,'the hatch keeps the complete intro frame before gameplay growth');
    assert.equal(hatch.phoneX,follow.phoneX);
    assert.equal(hatch.phoneY,follow.phoneY);
  });
}

test('nextStop moves one slide in either direction from an anchor or an interrupted position', () => {
  const next = nextStop;
  const stops = [100,500,900,1400];
  for (const [position,delta,want] of [[100,1,500],[500,1,900],[500,-1,100],
    [700,1,900],[700,-1,500],[1400,-1,900],[100,-1,null],[1400,1,null]]) {
    assert.equal(next(position,delta,stops),want,`${position} with direction ${delta}`);
  }
});

test('nextStop tolerates subpixel resting errors while letting native scroll handle outside boundaries', () => {
  const next = nextStop;
  const stops = [100,500,900];
  assert.equal(next(499,1,stops),900);
  assert.equal(next(501,-1,stops),100);
  assert.equal(next(98.5,-1,stops),null);
  assert.equal(next(901.5,1,stops),null);
  for (const position of [0,97,903,1000]) {
    assert.equal(next(position,1,stops),null);
    assert.equal(next(position,-1,stops),null);
  }
  assert.equal(next(500,0,stops),null);
  assert.equal(next(500,NaN,stops),null);
  assert.equal(next(500,1,[]),null);
});

test('snapPosition reaches exact endpoints and never overshoots in either direction', () => {
  const position = snapPosition;
  for (const [from,to] of [[100,1800],[1800,100],[300,300]]) {
    assert.equal(position(from,to,-20),from);
    assert.equal(position(from,to,0),from);
    assert.equal(position(from,to,1800),to);
    assert.equal(position(from,to,1900),to);
    const samples = Array.from({length:181},(_,index) => position(from,to,index*10));
    assert.ok(samples.every(value => Number.isFinite(value) && value >= Math.min(from,to) && value <= Math.max(from,to)));
    assert.ok(samples.every((value,index) => index === 0 || (to >= from ? value >= samples[index-1] : value <= samples[index-1])));
    assert.ok(Math.abs(position(from,to,900)-(from+to)/2)<1e-9);
  }
  assert.equal(position(100,500,1,0),500);
});

test('snapPosition depends on elapsed time, so 60 Hz and 144 Hz produce the same transition', () => {
  const position = snapPosition;
  const sixty = Array.from({length:109},(_,i) => position(0,2000,i*1000/60));
  const highRefresh = Array.from({length:261},(_,i) => position(0,2000,i*1000/144));
  assert.equal(sixty[30],highRefresh[72]);
  assert.ok(position(0,2000,100) < 2000*100/1800,'the transition eases in');
  assert.ok(position(0,2000,1700) > 2000*1700/1800,'the transition eases out');
  assert.equal(position(100,500,300,600),300);
});

test('snapPosition preserves exact fractional endpoints and handles a missing clock sample', () => {
  const position = snapPosition;
  assert.equal(position(10000000000.3,.1,1800),.1);
  assert.equal(position(.1,10000000000.3,-1),.1);
  assert.equal(position(100,500,NaN),100);
  assert.equal(position(100,500,Infinity),500);
  assert.ok(Number.isFinite(position(100,500,100,NaN)));
});

test('one wheel burst accepts once and its trailing momentum cannot skip more slides', () => {
  const gesture = createWheelGesture();
  assert.deepEqual([gesture.push(12,0),gesture.push(12,16),gesture.push(12,32),
    gesture.push(400,48),gesture.push(80,90),gesture.push(2,140)],[0,0,1,0,0,0]);
  assert.equal(gesture.push(36,320),1,'180 ms quiet starts the next deliberate gesture');
  assert.equal(gesture.push(500,336),0);
});

test('tiny opposite jitter does not reverse a gesture but a deliberate cumulative reversal can interrupt', () => {
  const gesture = createWheelGesture();
  assert.equal(gesture.push(36,0),1);
  assert.equal(gesture.push(-8,30),0);
  assert.equal(gesture.push(10,40),0,'same-direction momentum clears isolated jitter');
  assert.equal(gesture.push(-30,50),0);
  assert.equal(gesture.push(-30,66),0);
  assert.equal(gesture.push(-11,82),0);
  assert.equal(gesture.push(-1,98),-1);
  assert.equal(gesture.push(-120,114),0,'reverse momentum still accepts only once');
});

test('wheel bursts work upward and reset discards partial and accepted input', () => {
  const gesture = createWheelGesture();
  assert.equal(gesture.push(-20,0),0);
  gesture.reset();
  assert.equal(gesture.push(-20,10),0);
  assert.equal(gesture.push(-16,20),-1);
  gesture.reset();
  assert.equal(gesture.push(-36,30),-1);
  assert.equal(gesture.push(0,40),0);
  assert.equal(gesture.push(NaN,50),0);
  assert.equal(gesture.push(Infinity,60),0);
});

test('gesture intent is stable across high-frequency momentum and custom thresholds', () => {
  const create = createWheelGesture;
  const gesture = create();
  const accepted = [];
  for (let index=0;index<200;index++) accepted.push(gesture.push(4,index*7));
  assert.equal(accepted.filter(Boolean).length,1);
  const custom = create({quietMs:100,threshold:20,reverseThreshold:50});
  assert.equal(custom.push(20,0),1);
  assert.equal(custom.push(-49,10),0);
  assert.equal(custom.push(-1,20),-1);
  assert.equal(custom.push(20,120),1);
});

// Catch an early/default-duration finish and abrupt acceleration at either end.
test('the slower default snap remains in travel after 1.2 seconds and settles by 1.8 seconds',()=>{
  const halfway=snapPosition(0,1000,1200);
  assert.ok(halfway>0 && halfway<1000,'do not finish at the former short duration');
  assert.equal(snapPosition(0,1000,1800),1000);
});

test('easing leaves and approaches a rest with a gentle acceleration ramp',()=>{
  const start=snapPosition(0,1000,10,1000);
  const finish=1000-snapPosition(0,1000,990,1000);
  assert.ok(start>0 && start<.02,'ease into travel without the previous acceleration step');
  assert.ok(finish>0 && finish<.02,'ease out without an acceleration step at rest');
});
