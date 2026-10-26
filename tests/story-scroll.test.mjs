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

test('wheel travel follows accumulated pixels instead of jumping to a chapter',()=>{
  const h=harness();
  assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,true);
  h.advance(16);assert.ok(h.y>0&&h.y<120,'ease the input rather than jump');
  for(let n=0;n<40;n++){h.advance(16);h.fire('wheel',{deltaY:8});}
  h.advance(1500);assert.equal(h.y,440,'120 + forty 8px deltas');h.cleanup();
});

test('same-direction input during travel adds distance immediately',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(32);
  h.fire('wheel',{deltaY:120});h.advance(1500);
  assert.equal(h.y,240);h.cleanup();
});

test('line-mode notches retain their actual distance without a minimum chapter step',()=>{
  const h=harness();h.fire('wheel',{deltaY:1,deltaMode:1});h.advance(1500);
  assert.equal(h.y,16);h.fire('wheel',{deltaY:-1,deltaMode:1});h.advance(1500);
  assert.equal(h.y,0);h.cleanup();
});

test('continuous momentum crosses a former story boundary without swallowing input',()=>{
  const h=harness({y:900,stops:()=>[0,1000]});h.fire('wheel',{deltaY:120});
  for(let n=0;n<40;n++){h.advance(16);h.fire('wheel',{deltaY:8});}
  h.advance(1500);assert.equal(h.y,1340);h.cleanup();
});

test('opposite input reverses on the next frame from the visible position',()=>{
  const h=harness();h.fire('wheel',{deltaY:600});h.advance(48);
  const before=h.y;assert.ok(before>0&&before<600);
  h.fire('wheel',{deltaY:-40});h.advance(16);
  assert.ok(h.y<before,'do not finish the pending downward travel');
  h.advance(1500);assert.ok(Math.abs(h.y-(before-40))<.001);h.cleanup();
});

test('outward input at either document edge remains native',()=>{
  for(const [y,deltaY] of [[0,-120],[19100,120]]){
    const h=harness({y});assert.equal(h.fire('wheel',{deltaY}).defaultPrevented,false);
    h.advance(1500);assert.equal(h.y,y);h.cleanup();
  }
});

test('forms, nested scrollers, zoom and horizontal gestures remain native',()=>{
  const cases=[{ctrlKey:true,deltaY:100},{metaKey:true,deltaY:100},{shiftKey:true,deltaY:100},{deltaX:150,deltaY:100},{cancelable:false,deltaY:100}];
  for(const properties of cases){const h=harness();assert.equal(h.fire('wheel',properties).defaultPrevented,false);h.advance(1500);assert.equal(h.y,0);h.cleanup();}
  for(const kind of ['form','scroll']){
    const h=harness(),node=new h.Element(kind);
    if(kind==='scroll'){node.style.overflowY='auto';node.scrollHeight=2000;node.clientHeight=500;node.scrollTop=50;}
    assert.equal(h.fire('wheel',{deltaY:120,composedPath:()=>[node,h.body]}).defaultPrevented,false);
    h.advance(1500);assert.equal(h.y,0);h.cleanup();
  }
});

test('focus, pointer, touch, keyboard, resize and external scrolling cancel unfinished easing',()=>{
  for(const name of ['focusin','pointerdown','touchstart','keydown','resize']){
    const h=harness();h.fire('wheel',{deltaY:600});h.advance(32);
    h.fire(name,{key:'End',touches:[]});const stopped=h.y;h.advance(1500);
    assert.equal(h.y,stopped,name);h.cleanup();
  }
  const h=harness();h.fire('wheel',{deltaY:600});h.advance(32);h.context.scrollY=2400;h.fire('scroll');h.advance(1500);
  assert.equal(h.y,2400);h.cleanup();
});

test('reduced motion, mobile wheel and disabled/static views do not capture input',()=>{
  for(const options of [{reduced:true},{desktop:false},{enabled:()=>false}]){
    const h=harness(options);assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,false);h.advance(1500);assert.equal(h.y,0);h.cleanup();
  }
});

test('mobile vertical swipes, horizontal swipes and pinch gestures remain completely native',()=>{
  for(const points of [[{clientX:105,clientY:300}],[{clientX:300,clientY:495}],[{clientX:100,clientY:300},{clientX:180,clientY:300}]]){
    const h=harness({desktop:false});
    assert.equal(h.fire('touchstart',{touches:[{clientX:100,clientY:500}]}).defaultPrevented,false);
    assert.equal(h.fire('touchmove',{touches:points}).defaultPrevented,false);
    assert.equal(h.fire('touchend',{touches:[],changedTouches:points}).defaultPrevented,false);
    h.advance(1500);assert.equal(h.y,0,'the driver must not start a release animation');h.cleanup();
  }
});

test('visibility and motion preference changes cancel pending frames',()=>{
  const hidden=harness();hidden.fire('wheel',{deltaY:600});hidden.advance(32);
  hidden.document.hidden=true;hidden.document.fire('visibilitychange');const hiddenY=hidden.y;hidden.advance(1500);
  assert.equal(hidden.y,hiddenY);hidden.cleanup();
  const reduced=harness();reduced.fire('wheel',{deltaY:600});reduced.advance(32);
  reduced.media[1].matches=true;reduced.media[1].fire('change');const reducedY=reduced.y;reduced.advance(1500);
  assert.equal(reduced.y,reducedY);reduced.cleanup();
});

test('cleanup removes wheel capture and pending easing',()=>{
  const h=harness();h.fire('wheel',{deltaY:120});h.advance(32);h.cleanup();const stopped=h.y;
  assert.equal(h.fire('wheel',{deltaY:120}).defaultPrevented,false);h.advance(1500);assert.equal(h.y,stopped);
});
