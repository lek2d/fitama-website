import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as snap from '../docs/section-snap.mjs';

// Execute the actual scroll driver; only browser events, time and layout are virtual.
function harness({y=0,reduced=false,desktop=true,enabled=()=>true,stops=()=>[0,1000,2000,3000],getDuration}={}) {
  class Events {
    handlers=new Map();
    addEventListener(name,fn){const list=this.handlers.get(name)??[];list.push(fn);this.handlers.set(name,list);}
    removeEventListener(name,fn){this.handlers.set(name,(this.handlers.get(name)??[]).filter(f=>f!==fn));}
    fire(name,event={}){for(const fn of this.handlers.get(name)??[])fn(event);}
  }
  class Element extends Events {
    constructor(kind='div',parent=null){super();this.kind=kind;this.parent=parent;this.scrollTop=0;this.scrollHeight=900;this.clientHeight=900;this.style={overflowY:'visible',overscrollBehaviorY:'auto'};
      const classes=new Set();this.classList={toggle(name,on){if(on)classes.add(name);else classes.delete(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}};}
    matches(){return this.kind==='form';}
    contains(node){for(let current=node;current;current=current.parent)if(current===this)return true;return false;}
  }
  const window=new Events(),document=new Events(),body=new Element('body'),surface=new Element('section',body),target=new Element('div',surface);
  const html=new Element('html');html.scrollHeight=20000;
  Object.assign(document,{body,documentElement:html,hidden:false});
  let now=0,id=0,pendingScroll=false;const frames=new Map();
  const media=[];
  const context={...snap,window,document,Element,innerHeight:900,scrollY:y,scrollX:0,
    performance:{now:()=>now},getComputedStyle:node=>node.style,
    matchMedia:query=>{const value=new Events();value.matches=query.includes('reduced-motion')?reduced:desktop;media.push(value);return value;},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),
    scrollTo:({top})=>{context.scrollY=top;pendingScroll=true;},
  };
  const source=readFileSync(new URL('../docs/smooth-scroll.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  const api=vm.runInNewContext(source+'\n({installSmoothScroll})',context);
  const cleanup=api.installSmoothScroll({enabled,getStops:stops,getDuration,touchSurface:surface});
  const event=(properties={})=>({cancelable:true,defaultPrevented:false,deltaX:0,deltaY:0,deltaMode:0,
    ctrlKey:false,metaKey:false,shiftKey:false,target,composedPath:()=>[target,surface,body,html],
    preventDefault(){this.defaultPrevented=true;},...properties});
  return {window,document,surface,target,body,html,Element,context,cleanup,media,
    get y(){return context.scrollY;},get time(){return now;},
    fire(name,properties={}){const value=event(properties);window.fire(name,value);return value;},
    advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+16);const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);if(pendingScroll){pendingScroll=false;window.fire('scroll');}}},
  };
}

test('one wheel burst reaches exactly one slide and a fresh gesture reaches the next',()=>{
  const h=harness();
  assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,true);
  for(let n=0;n<40;n++){h.advance(16);h.fire('wheel',{deltaY:8});}
  h.advance(1500);
  assert.equal(h.y,1000,'momentum must not chain through the story');
  h.fire('wheel',{deltaY:120});h.advance(2100);
  assert.equal(h.y,2000,'a new gesture advances one more slide');
  h.cleanup();
});

test('a new same-direction burst during the transition cannot skip a slide',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(250);
  h.fire('wheel',{deltaY:120});h.advance(2100);
  assert.equal(h.y,1000);h.cleanup();
});

test('a single line-mode mouse step can advance and reverse without requiring several notches',()=>{
  const h=harness();h.fire('wheel',{deltaY:1,deltaMode:1});h.advance(2100);
  assert.equal(h.y,1000);h.fire('wheel',{deltaY:-1,deltaMode:1});h.advance(2100);
  assert.equal(h.y,0);h.cleanup();
});

test('a long momentum tail stays at the FAQ exit until a fresh gesture resumes ordinary scrolling',()=>{
  const h=harness({stops:()=>[0,1000]});h.fire('wheel',{deltaY:120});
  for(let n=0;n<110;n++){h.advance(16);h.fire('wheel',{deltaY:8});}
  h.advance(100);assert.equal(h.y,1000,'finishing the transition must not release its momentum into the FAQ');
  h.advance(200);h.fire('wheel',{deltaY:120});h.advance(2100);
  assert.equal(h.y,1120,'a fresh gesture can scroll freely past the story');h.cleanup();
});

test('deliberate reversal moves back from the visible position on the next frame',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(400);
  const before=h.y;assert.ok(before>0&&before<1000);
  h.fire('wheel',{deltaY:-120});h.advance(16);
  assert.ok(h.y<before,'reverse immediately rather than finish the forward slide');
  h.advance(2100);assert.equal(h.y,0);h.cleanup();
});

test('outside the story and at its outward boundary the ordinary wheel behavior remains',()=>{
  for(const start of [3000,5000]){
    const h=harness({y:start});h.fire('wheel',{deltaY:120});h.advance(2100);
    assert.equal(h.y,start+120);h.cleanup();
  }
  const h=harness();assert.equal(h.fire('wheel',{deltaY:-120}).defaultPrevented,false);h.cleanup();
});

test('forms, nested scrollers, zoom and horizontal gestures remain native',()=>{
  const cases=[{ctrlKey:true,deltaY:100},{metaKey:true,deltaY:100},{shiftKey:true,deltaY:100},{deltaX:150,deltaY:100}];
  for(const properties of cases){const h=harness();assert.equal(h.fire('wheel',properties).defaultPrevented,false);h.advance(1500);assert.equal(h.y,0);h.cleanup();}
  for(const kind of ['form','scroll']){
    const h=harness(),node=new h.Element(kind);
    if(kind==='scroll'){node.style.overflowY='auto';node.scrollHeight=2000;node.clientHeight=500;node.scrollTop=50;}
    assert.equal(h.fire('wheel',{deltaY:120,composedPath:()=>[node,h.body]}).defaultPrevented,false);
    h.advance(1500);assert.equal(h.y,0);h.cleanup();
  }
});

test('focus, pointer, keyboard, resize and external scrolling cancel unfinished travel',()=>{
  for(const name of ['focusin','pointerdown','keydown','resize']){
    const h=harness();h.fire('wheel',{deltaY:120});h.advance(200);
    h.fire(name,{key:'End'});const stopped=h.y;h.advance(1500);
    assert.equal(h.y,stopped,name);h.cleanup();
  }
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(100);h.context.scrollY=2400;h.fire('scroll');h.advance(1500);
  assert.equal(h.y,2400);h.cleanup();
});

test('reduced motion and a disabled/static page do not capture scroll',()=>{
  for(const options of [{reduced:true},{enabled:()=>false}]){
    const h=harness(options);assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,false);h.advance(1500);assert.equal(h.y,0);h.cleanup();
  }
});

test('one mobile vertical swipe advances on release, while taps and horizontal swipes remain native',()=>{
  const h=harness({desktop:false});
  const touch=(x,y)=>({clientX:x,clientY:y});
  assert.equal(h.fire('touchstart',{touches:[touch(100,500)]}).defaultPrevented,false);
  const move=h.fire('touchmove',{touches:[touch(105,380)]});
  assert.equal(move.defaultPrevented,true);assert.equal(h.y,0,'wait for release');
  h.fire('touchend',{touches:[],changedTouches:[touch(105,380)]});h.advance(2100);
  assert.equal(h.y,1000);h.cleanup();
  for(const end of [touch(101,499),touch(230,495)]){
    const h=harness({desktop:false});h.fire('touchstart',{touches:[touch(100,500)]});
    assert.equal(h.fire('touchmove',{touches:[end]}).defaultPrevented,false);
    assert.equal(h.fire('touchend',{touches:[],changedTouches:[end]}).defaultPrevented,false);
    h.advance(1500);assert.equal(h.y,0);h.cleanup();
  }
});

test('mobile pinch and touch gestures outside the story remain native',()=>{
  const h=harness({desktop:false}),touch={clientX:100,clientY:500};
  h.fire('touchstart',{touches:[touch,touch]});
  assert.equal(h.fire('touchmove',{touches:[touch,touch]}).defaultPrevented,false);
  h.fire('touchend',{touches:[],changedTouches:[touch]});h.advance(1500);assert.equal(h.y,0);
  h.fire('touchstart',{target:h.body,composedPath:()=>[h.body],touches:[touch]});
  assert.equal(h.fire('touchmove',{target:h.body,touches:[{...touch,clientY:300}]}).defaultPrevented,false);
  h.fire('touchend',{target:h.body,touches:[],changedTouches:[{...touch,clientY:300}]});h.advance(1500);assert.equal(h.y,0);h.cleanup();
});

test('a mobile drag that returns to its origin or finishes horizontally does not advance',()=>{
  for(const end of [{clientX:100,clientY:495},{clientX:300,clientY:410}]){
    const h=harness({desktop:false});h.fire('touchstart',{touches:[{clientX:100,clientY:500}]});
    h.fire('touchmove',{touches:[{clientX:100,clientY:380}]});
    h.fire('touchmove',{touches:[end]});
    h.fire('touchend',{touches:[],changedTouches:[end]});h.advance(1500);
    assert.equal(h.y,0,'release position decides whether a slide was requested');h.cleanup();
  }
});

test('cleanup removes gesture capture and pending animation',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(100);h.cleanup();const stopped=h.y;
  assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,false);h.advance(1500);assert.equal(h.y,stopped);
});

test('the installed driver stays in its slower transition without queuing an extra slide',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(1200);
  assert.ok(h.y>0 && h.y<1000,'the slow transition is still moving at 1.2 seconds');
  h.fire('wheel',{deltaY:120});h.advance(1000);
  assert.equal(h.y,1000,'a repeated gesture during travel cannot queue another slide');h.cleanup();
});

test('an authored intro duration slows only its first travel and still permits interruption',()=>{
  const h=harness({getDuration:(from,to)=>from===0&&to===1000?3000:1800});
  h.fire('wheel',{deltaY:120});h.advance(1900);
  assert.ok(h.y>0&&h.y<1000,'the first drop has not been rushed into the standard duration');
  h.advance(1200);assert.equal(h.y,1000);
  h.fire('wheel',{deltaY:120});h.advance(1900);assert.equal(h.y,2000,'later slides retain their current duration');
  h.fire('wheel',{deltaY:-120});h.advance(300);const before=h.y;
  h.fire('pointerdown');h.advance(4000);assert.equal(h.y,before,'user interaction can cancel the longer sequence');h.cleanup();
});
