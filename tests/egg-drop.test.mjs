import test from 'node:test';
import assert from 'node:assert/strict';
import {journey} from '../docs/journey-timeline.mjs';
import * as snap from '../docs/section-snap.mjs';

test('the egg changes scale gradually throughout its drop on large and small screens',()=>{
  for(const[w,h]of[[2560,1440],[1440,900],[390,844],[320,568]]){
    let previous=journey(0,w,h),maximum=0;
    const initial=previous.eggW;
    for(let ms=1000/60;ms<=3000;ms+=1000/60){
      const current=journey(snap.snapPosition(0,.66,ms,3000),w,h);
      maximum=Math.max(maximum,Math.abs(current.eggW-previous.eggW));previous=current;
    }
    assert.ok(maximum<initial*.055,`${w}×${h}: ${maximum.toFixed(2)}px per frame must not create a sudden shrink`);
  }
});

for(const[w,h]of[[1440,900],[390,844],[320,568]]){
  test(`phone entrance stays controlled during the authored first drop at ${w}×${h}`,()=>{
    let last=journey(0,w,h),maximum=0;
    for(let ms=1000/60;ms<=3000;ms+=1000/60){
      const current=journey(snap.snapPosition(0,.66,ms,3000),w,h);
      maximum=Math.max(maximum,Math.abs(current.phoneY-last.phoneY));last=current;
    }
    assert.ok(maximum<h*.06,`phone movement ${maximum.toFixed(2)}px/frame must not become a one-frame jump`);
  });

  test(`the platform does not kick when the falling egg touches it at ${w}×${h}`,()=>{
    const island=s=>s.phoneY+5+(s.phoneH-10)*330.3/844;
    let contact;
    for(let i=0;i<=360;i++){
      const current=journey(.30+i/1000,w,h);
      if(Math.abs(current.eggY-island(current))<1e-6){contact=current;break;}
    }
    assert.ok(contact,'egg reaches its island before the handoff');
    const epsilon=1e-7,before=journey(contact.p-epsilon,w,h),after=journey(contact.p+epsilon,w,h);
    for(const key of ['eggY','phoneY']){
      const incoming=(contact[key]-before[key])/epsilon,outgoing=(after[key]-contact[key])/epsilon;
      assert.ok(Math.abs(incoming)<1&&Math.abs(outgoing)<1,`${key} must meet at rest instead of producing a contact jolt`);
    }
  });
}

test('the hero-to-app drop has extra time while later, reverse and partial trips remain responsive',()=>{
  const duration=snap.storySnapDuration;
  for(const[from,to,w,h,top,want]of[
    [0,2673,1440,900,0,3000],[668.25,2673,1440,900,0,2250],
    [1336.5,2673,1440,900,0,1800],[2673,3159,1440,900,0,1800],
    [2673,0,1440,900,0,1800],[137,2810,1440,900,137,3000],
    [0,1838.232,390,844,0,3000],
  ])assert.equal(duration?.(from,to,w,h,top),want,`${from}→${to}`);
});
