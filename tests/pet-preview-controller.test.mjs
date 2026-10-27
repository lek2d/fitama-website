import test from 'node:test';
import assert from 'node:assert/strict';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};

// Only the DOM, local network and GPU renderer are doubles. The installed
// controller, random compositor, cancellation and paint gate are real modules.
async function previewFixture(t,{holdImages=false,failImages=false}={}) {
  const originals=new Map();
  const replace=(name,value)=>{originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});};
  class Element extends EventTarget {
    constructor(){super();this.dataset={};this.style={};this.attributes=new Map();this.children=[];const values=new Set();
      this.classList={add:(...names)=>names.forEach(name=>values.add(name)),remove:(...names)=>names.forEach(name=>values.delete(name)),contains:name=>values.has(name),toggle:(name,on)=>{if(on===undefined)on=!values.has(name);if(on)values.add(name);else values.delete(name);return on;}};
    }
    setAttribute(name,value){this.attributes.set(name,String(value));}
    getAttribute(name){return this.attributes.get(name)??null;}
    append(child){this.children.push(child);}
    matches(selector){return selector===':focus-visible'&&!!this.focusVisible;}
    remove(){}
  }
  const imageGate=deferred(),players=[],frames=new Map(),requests=[];let nextFrame=0,nextImageGate=null,failNextImages=false,failNextDecodes=false;
  const document=new EventTarget();document.hidden=false;document.createElement=()=>new Element();
  document.head={append:script=>queueMicrotask(()=>script.onload())};
  const window=new EventTarget(),stage=new Element(),button=new Element();button.setAttribute('aria-pressed','false');
  const state={available:true,paused:false,reduced:false};
  const base={id:'blukie',artboard:'Blukie',stateMachine:'State Machine 1',viewModel:'ViewModel1',
    frame:{canvasWidthPercent:128,canvasHeightPercent:146.286,leftPercent:-14,topPercent:-22.857},
    images:[{property:'eyes',url:'eyes01.png'}],numbers:{sleeping:0,ambientActivity:0,eyeStyle:2}};
  const manifest={sourceRevision:'fixture',rig:'pets.riv',pets:[base]};
  const catalog={sourceRevision:'fixture',pets:{blukie:{groups:[{key:'eyesBlush',options:[
    {id:'eyes01',traits:{eyes:'Eye+brow_01'},images:[],numbers:{}},
    {id:'eyes03',traits:{eyes:'Eye+brow_03'},images:[{property:'eyes',url:'eyes03.png'}],numbers:{eyeStyle:0}},
  ]}]}}};
  class Player {
    constructor(options){this.options=options;this.bound=0;this.playing=false;players.push(this);queueMicrotask(()=>options.onLoad());}
    viewModelByName(){return{defaultInstance:()=>({happyCount:0,image:()=>({value:null}),number:()=>({value:0}),trigger(name){return name==='happy'?{trigger:()=>this.happyCount++}:null;},cleanup(){}})};}
    bindViewModelInstance(vm){if(this.vm!==vm)this.bound++;this.vm=vm;this.bindCalls=(this.bindCalls||0)+1;}
    resizeDrawingSurfaceToCanvas(){}
    play(){this.playing=true;this.playCalls=(this.playCalls||0)+1;}
    stop(){this.playing=false;this.stops=(this.stops||0)+1;}
    pause(){this.playing=false;}
    cleanup(){this.destroyed=true;this.playing=false;}
    advance(){this.options.onAdvance();}
  }
  // Node imports this browser module from file:, whose URL origin is "null".
  // Fetch remains the controlled local boundary; no actual file/network fetch occurs.
  replace('document',document);replace('window',window);replace('location',{origin:'null'});replace('devicePixelRatio',1);
  replace('requestAnimationFrame',callback=>{const id=++nextFrame;frames.set(id,callback);return id;});
  replace('cancelAnimationFrame',id=>frames.delete(id));
  replace('rive',{Rive:Player,Layout:class{},Fit:{Contain:'contain'},Alignment:{Center:'center'},
    RuntimeLoader:{setWasmUrl(){},setWasmFallbackUrl(){},awaitInstance:async()=>({})},
    decodeImage:async()=>{if(failNextDecodes)throw new Error('Synthetic decode failure');return{unref(){}};}});
  replace('fetch',async url=>{
    const pathname=new URL(url).pathname;requests.push(pathname);
    if(pathname.endsWith('/manifest.json'))return{ok:true,json:async()=>manifest};
    if(pathname.endsWith('/trait-catalog.json'))return{ok:true,json:async()=>catalog};
    if(pathname.endsWith('.png')){
      if(holdImages)await imageGate.promise;
      if(nextImageGate)await nextImageGate.promise;
      if(failImages||failNextImages)throw new Error('Synthetic unavailable trait image');
    }
    return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};
  });
  const oldRandom=Math.random;Math.random=()=>0;
  let controller;
  t.after(async()=>{imageGate.resolve();nextImageGate?.resolve();controller?.dispose();for(let i=0;i<100;i++)await Promise.resolve();Math.random=oldRandom;for(const[name,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  const module=await import(`../docs/pet-preview.mjs?controller-presentation-${Date.now()}-${nextFixture++}`);
  controller=module.installPetPreviews({stage,buttons:[button],getState:()=>state});
  const dispatch=(name,pointerType='mouse')=>{const event=new Event(name);if(name.startsWith('pointer'))Object.defineProperty(event,'pointerType',{value:pointerType});button.dispatchEvent(event);};
  const settle=async(predicate)=>{for(let i=0;i<100&&!predicate();i++)await Promise.resolve();assert.ok(predicate(),'controller did not settle at the requested boundary');};
  const frame=()=>{const pending=[...frames];frames.clear();pending.forEach(([,callback])=>callback());};
  return{controller,button,state,players,requests,imageGate,document,dispatch,settle,frame,failNextImages:()=>{failNextImages=true;},failNextDecodes:()=>{failNextDecodes=true;},holdNextImages:()=>nextImageGate=deferred()};
}
let nextFixture=0;

test('cold hover retains the egg through trait decoding and both painted frame boundaries',async t=>{
  const f=await previewFixture(t,{holdImages:true});
  f.dispatch('pointerenter');
  await f.settle(()=>f.players.length===1);
  assert.equal(f.button.dataset.riveView,'egg','a pending first hover must not expose the generic SVG pet');
  f.imageGate.resolve();await f.settle(()=>f.players[0].bound===1);
  assert.equal(f.button.dataset.riveView,'egg','binding alone does not prove the selected pixels are painted');
  f.players[0].advance();f.players[0].advance();
  assert.equal(f.button.dataset.riveView,'egg');
  f.frame();assert.equal(f.button.dataset.riveView,'egg','the first queued frame is still inside the paint gate');
  f.frame();assert.equal(f.button.dataset.riveView,'rive');
});

test('leaving a cold hover prevents a late decoded pet from replacing the egg',async t=>{
  const f=await previewFixture(t,{holdImages:true});
  f.dispatch('pointerenter');await f.settle(()=>f.players.length===1);
  f.dispatch('pointerleave');f.imageGate.resolve();
  await f.settle(()=>f.players[0].destroyed);
  f.frame();f.frame();
  assert.equal(f.button.dataset.riveView,'egg');
  assert.equal(f.button.classList.contains('rive-ready'),false);
});

test('a genuine first-load failure exposes the static fallback instead of leaving a hidden preview',async t=>{
  const originalWarn=console.warn;console.warn=()=>{};t.after(()=>{console.warn=originalWarn;});
  const f=await previewFixture(t,{failImages:true});
  f.dispatch('pointerenter');await f.settle(()=>f.button.dataset.riveState==='fallback');
  assert.equal(f.button.dataset.riveView,'fallback');
});

test('Pause before first paint intentionally shows the static fallback without starting Rive',async t=>{
  const f=await previewFixture(t);f.state.paused=true;f.dispatch('pointerenter');
  assert.equal(f.button.dataset.riveView,'fallback');
  assert.equal(f.players.length,0);
});

test('a warm reroll retains the egg until only the newly requested look is painted',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');
  await f.settle(()=>f.players[0]?.bound===1);
  f.players[0].advance();f.players[0].advance();f.frame();f.frame();
  const shown=f.button.dataset.riveAppearance;
  f.dispatch('pointerleave');const pending=f.holdNextImages();f.dispatch('pointerenter');
  assert.equal(f.button.dataset.riveView,'egg','never flash the previous pet before the new random look');
  pending.resolve();await f.settle(()=>f.players[0].bound===2);
  assert.equal(f.button.dataset.riveView,'egg','binding does not prove new pixels have painted');
  f.players[0].advance();f.players[0].advance();f.frame();f.frame();
  assert.equal(f.button.dataset.riveView,'rive');
  assert.notEqual(f.button.dataset.riveAppearance,shown);
  assert.equal(f.players.length,1,'rerolls keep the warm renderer');
});

const publish=f=>{f.players[0].advance();f.players[0].advance();f.frame();f.frame();};

test('click keeps the painted traits visible and hover changes only the happy reaction',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');
  await f.settle(()=>f.players[0]?.bound===1);publish(f);
  const appearance=f.button.dataset.riveAppearance,traits=f.button.dataset.riveTraits,vm=f.players[0].vm;
  f.dispatch('click');await f.settle(()=>f.button.getAttribute('aria-pressed')==='true');
  f.dispatch('pointerleave');
  assert.equal(f.button.dataset.riveView,'rive','the chosen pet stays after the pointer leaves');
  assert.equal(f.button.dataset.riveMood,'idle');
  const reactions=vm.happyCount;
  f.dispatch('pointerenter');
  await f.settle(()=>vm.happyCount===reactions+1);
  assert.equal(f.button.dataset.riveMood,'happy');
  f.dispatch('pointerleave');f.dispatch('pointerenter');
  await f.settle(()=>vm.happyCount===reactions+2);
  assert.equal(f.players[0].vm,vm,'hover keeps the same bound view model');
  assert.equal(f.players[0].bound,1,'hover never binds a different appearance VM');
  assert.equal(f.button.dataset.riveAppearance,appearance);
  assert.equal(f.button.dataset.riveTraits,traits);
  f.dispatch('click');await Promise.resolve();f.dispatch('pointerleave');
  assert.equal(f.button.getAttribute('aria-pressed'),'true','another click cannot accidentally discard the chosen pet');
  assert.equal(f.button.dataset.riveView,'rive');
});

test('a click during cold loading keeps that first pending look through pointer exit',async t=>{
  const f=await previewFixture(t,{holdImages:true});f.dispatch('pointerenter');
  await f.settle(()=>f.players.length===1);
  f.dispatch('click');await Promise.resolve();f.dispatch('pointerleave');
  f.imageGate.resolve();await f.settle(()=>f.players[0].bound===1);publish(f);
  assert.equal(f.button.dataset.riveView,'rive');
  const appearance=f.button.dataset.riveAppearance;
  f.dispatch('pointerenter');await Promise.resolve();
  assert.equal(f.button.dataset.riveAppearance,appearance);
  assert.equal(f.players[0].bound,1);
});

test('a click while a reroll is pending selects that requested look without flashing the old pet',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');
  await f.settle(()=>f.players[0]?.bound===1);publish(f);
  const previous=f.button.dataset.riveAppearance;
  f.dispatch('pointerleave');const pending=f.holdNextImages();f.dispatch('pointerenter');
  await f.settle(()=>f.button.dataset.riveTarget!==previous);
  const target=f.button.dataset.riveTarget;
  f.dispatch('click');await Promise.resolve();f.dispatch('pointerleave');
  assert.equal(f.button.dataset.riveView,'egg','selection must not expose a stale appearance');
  pending.resolve();await f.settle(()=>f.players[0].bound===2);publish(f);
  assert.equal(f.button.dataset.riveView,'rive');
  assert.equal(f.button.dataset.riveAppearance,target);
  f.dispatch('pointerenter');await Promise.resolve();assert.equal(f.players[0].bound,2);
});

test('a chosen look survives leaving the hero and motion suspension without rerolling',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');
  await f.settle(()=>f.players[0]?.bound===1);publish(f);f.dispatch('click');await Promise.resolve();f.dispatch('pointerleave');
  const appearance=f.button.dataset.riveAppearance;
  f.state.available=false;f.controller.sync();assert.equal(f.button.dataset.riveView,'egg');
  f.state.available=true;f.controller.sync();assert.equal(f.button.dataset.riveView,'rive');
  for(const key of ['paused','reduced']){f.state[key]=true;f.controller.sync();assert.equal(f.players[0].playing,false);f.state[key]=false;f.controller.sync();}
  f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.players[0].playing,false);
  f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.players[0].playing,true);assert.equal(f.players[0].bound,1);assert.equal(f.button.dataset.riveAppearance,appearance);
});

test('a first touch click selects an idle pet without requiring hover or changing it on another tap',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter','touch');assert.equal(f.players.length,0);
  f.dispatch('click');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  const appearance=f.button.dataset.riveAppearance;
  assert.equal(f.button.dataset.riveView,'rive');assert.equal(f.button.dataset.riveMood,'idle');
  f.dispatch('click');await Promise.resolve();assert.equal(f.button.dataset.riveAppearance,appearance);assert.equal(f.players[0].bound,1);
});

test('a click between binding and paint waits for and locks the current requested look',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  f.dispatch('pointerleave');f.dispatch('pointerenter');await f.settle(()=>f.players[0].bound===2);
  const target=f.button.dataset.riveTarget;
  f.dispatch('click');assert.equal(f.button.dataset.riveView,'egg');publish(f);f.dispatch('pointerleave');
  assert.equal(f.button.dataset.riveAppearance,target);assert.equal(f.players[0].bound,2);
});

test('rapid leave and reenter cannot publish an obsolete paint gate',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  f.dispatch('pointerleave');f.dispatch('pointerenter');await f.settle(()=>f.players[0].bound===2);
  f.players[0].advance();f.players[0].advance();
  f.dispatch('pointerleave');f.dispatch('pointerenter');
  f.frame();f.frame();assert.equal(f.button.dataset.riveView,'egg','old paint callbacks cannot reveal a pet');
  await f.settle(()=>f.players[0].bound===3);publish(f);
  assert.equal(f.button.dataset.riveAppearance,f.button.dataset.riveTarget);
  assert.equal(f.button.dataset.riveView,'rive');
});

test('warming prepares shared assets and next-look bytes without an idle renderer or hover download',async t=>{
  const f=await previewFixture(t);
  await f.controller.warm();
  assert.equal(f.players.length,0,'background preparation does not animate hidden pets');
  assert.ok(f.requests.some(url=>url.endsWith('pets.riv')));
  const downloads=f.requests.length;
  f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  assert.equal(f.requests.length,downloads,'the first selected look is already fetched');
  f.dispatch('pointerleave');await f.controller.warm();
  const nextDownloads=f.requests.length;
  f.dispatch('pointerenter');await f.settle(()=>f.players[0].bound===2);publish(f);
  assert.equal(f.requests.length,nextDownloads,'next-hover assets are prepared while the egg is visible');
});

test('motion suspension never restarts or advances the happy machine before pausing',async t=>{
  const f=await previewFixture(t);f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);f.dispatch('click');
  const player=f.players[0],plays=player.playCalls,stops=player.stops;
  f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(player.playing,false);assert.equal(player.playCalls,plays);assert.equal(player.stops,stops);
});

test('a failed reroll retains an animated last good pet and does not retry endlessly',async t=>{
  const warn=console.warn;console.warn=()=>{};t.after(()=>{console.warn=warn;});
  const f=await previewFixture(t);f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  const previous=f.button.dataset.riveAppearance;
  f.failNextImages();f.dispatch('pointerleave');f.dispatch('pointerenter');
  await f.settle(()=>f.button.dataset.riveState==='ready'&&f.button.dataset.riveView==='rive');
  assert.equal(f.button.dataset.riveAppearance,previous);
  assert.equal(f.players[0].playing,true,'retained Rive must resume its hover reaction');
  assert.equal(f.button.dataset.riveMood,'happy');
  const requests=f.requests.length;
  for(let i=0;i<10;i++){f.controller.sync();await Promise.resolve();}
  assert.equal(f.requests.length,requests,'failed versions must not start a retry loop');
});

test('a touch selection uses its warmed appearance without an extra image fetch',async t=>{
  const f=await previewFixture(t);await f.controller.warm();const downloads=f.requests.length;
  f.dispatch('click');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  assert.equal(f.requests.length,downloads);
  assert.equal(f.button.dataset.riveView,'rive');assert.equal(f.button.dataset.riveMood,'idle');
});

test('a failed reroll after an unpublished binding falls back without exposing mismatched traits',async t=>{
  const warn=console.warn;console.warn=()=>{};t.after(()=>{console.warn=warn;});
  const f=await previewFixture(t);f.dispatch('pointerenter');await f.settle(()=>f.players[0]?.bound===1);publish(f);
  f.dispatch('pointerleave');f.dispatch('pointerenter');await f.settle(()=>f.players[0].bound===2);
  f.failNextDecodes();f.dispatch('pointerleave');f.dispatch('pointerenter');
  await f.settle(()=>['ready','fallback'].includes(f.button.dataset.riveState));
  assert.equal(f.button.dataset.riveView,'fallback','an unpublished canvas cannot masquerade as the last published look');
});
