import {chooseAppearance} from './pet-traits.mjs?v=pet-rive-random-v1&release=20261026';

const assetRoot=new URL('./assets/pet-rive-v1/',import.meta.url);
const vendorRoot=new URL('./assets/vendor/rive-webgl2-2.42.0/',import.meta.url);
const bytes=new Map();
let runtimePromise,manifestPromise,catalogPromise;

export function previewPolicy({available,hovered,focused,pinned,paused,hidden,reduced}) {
  const open=!!(available&&(hovered||focused||pinned));
  return {open,animate:open&&!paused&&!hidden&&!reduced};
}

// Never publish half a face, and retain ownership of every decoded GPU image.
export async function bindPreviewAppearance(vm,plan,load,signal) {
  signal.throwIfAborted();
  const images=plan.images.map(image=>{
    const target=vm.image(image.property);
    if(!target)throw new Error(`Pet rig is missing ${image.property}`);
    return target;
  });
  const numbers=Object.entries(plan.numbers).map(([name,value])=>{
    const target=vm.number(name);
    if(!target||!Number.isFinite(value))throw new Error(`Pet rig is missing ${name}`);
    return {target,value};
  });
  const results=await Promise.allSettled(plan.images.map(image=>load(image)));
  const owned=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
  let released=false;
  const release=()=>{if(released)return;released=true;for(const image of owned){try{image.dispose();}catch{ /* Continue other image releases. */ }}};
  try {
    signal.throwIfAborted();
    for(const result of results)if(result.status==='rejected')throw result.reason;
    images.forEach((target,index)=>{target.value=owned[index].value;});
    numbers.forEach(({target,value})=>{target.value=value;});
    return release;
  } catch(error){release();throw error;}
}

function localUrl(path,base=assetRoot) {
  const url=new URL(path,base);
  if(url.origin!==location.origin)throw new Error('Pet preview assets must remain local');
  return url.href;
}
function fetchBytes(url) {
  if(!bytes.has(url))bytes.set(url,fetch(url).then(response=>{
    if(!response.ok)throw new Error(`Pet asset failed (${response.status})`);
    return response.arrayBuffer();
  }).catch(error=>{bytes.delete(url);throw error;}));
  return bytes.get(url);
}
function loadManifest() {
  if(!manifestPromise)manifestPromise=fetch(localUrl('manifest.json')).then(response=>{
    if(!response.ok)throw new Error('Pet preview manifest could not load');
    return response.json();
  }).catch(error=>{manifestPromise=null;throw error;});
  return manifestPromise;
}
function loadCatalog() {
  if(!catalogPromise)catalogPromise=fetch(localUrl('trait-catalog.json')).then(response=>{
    if(!response.ok)throw new Error('Pet trait catalog could not load');
    return response.json();
  }).catch(error=>{catalogPromise=null;throw error;});
  return catalogPromise;
}
function loadRuntime() {
  if(!runtimePromise)runtimePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=localUrl('rive.js',vendorRoot);script.async=true;
    script.onload=()=>{
      const api=globalThis.rive;
      if(!api?.Rive||!api.decodeImage)return reject(new Error('Pet animation runtime is unavailable'));
      api.RuntimeLoader.setWasmUrl(localUrl('rive.wasm',vendorRoot));
      api.RuntimeLoader.setWasmFallbackUrl(localUrl('rive_fallback.wasm',vendorRoot));
      api.RuntimeLoader.awaitInstance().then(()=>resolve(api),reject);
    };
    script.onerror=()=>{script.remove();reject(new Error('Pet animation runtime could not load'));};
    document.head.append(script);
  }).catch(error=>{runtimePromise=null;throw error;});
  return runtimePromise;
}

export function installPetPreviews({stage,buttons,getState}) {
  let disposed=false, warming=null;
  const entries=buttons.map(button=>{
    const id=button.classList.contains('clovie')?'clovie':button.classList.contains('ignie')?'ignie':'blukie';
    const frame=document.createElement('span');frame.className='pet-rive';frame.setAttribute('aria-hidden','true');
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');
    frame.append(canvas);button.append(frame);button.dataset.rivePet=id;button.dataset.riveState='idle';button.dataset.riveView='egg';
    return {button,id,frame,canvas,hovered:false,selected:false,session:null,retiring:null,failed:false,version:0,desired:null,committed:null,committedPlan:null,lockedPlan:null,nextPlan:null};
  });
  stage.classList.add('rive-previews-enabled');
  const current=(entry,session)=>!!session&&!disposed&&entry.session===session&&!session.abort.signal.aborted;
  const policy=entry=>previewPolicy({...getState(),hovered:entry.hovered,focused:entry.button.matches(':focus-visible'),pinned:entry.selected||entry.button.getAttribute('aria-pressed')==='true',hidden:document.hidden});

  function present(entry,state=policy(entry)) {
    const motion=getState();
    // Hover is intent, not pixel readiness. Keep the egg until this request's
    // complete look has painted; an older ready canvas is not the new look.
    entry.button.dataset.riveView=!state.open?'egg':entry.session?.ready&&entry.session.presentedVersion===entry.version?'rive'
      :entry.failed||motion.paused||motion.reduced?'fallback':'egg';
  }

  function destroy(session) {
    if(session.destroyed)return;session.destroyed=true;
    session.frames.forEach(cancelAnimationFrame);
    try{session.release?.();}catch{ /* Complete renderer cleanup. */ }
    try{session.player?.cleanup();}catch{ /* Context may already be lost. */ }
  }
  function nextFrame(session,callback) {
    const frame=requestAnimationFrame(()=>{session.frames.delete(frame);callback();});
    session.frames.add(frame);
  }
  function retire(session) {
    session.abort.abort();session.candidate?.abort.abort();
    try{session.player?.pause();}catch{ /* A lost context is still cleaned below. */ }
    session.playing=false;
    return Promise.resolve(session.binding).then(()=>destroy(session),()=>destroy(session));
  }
  function cancel(entry) {
    const session=entry.session;if(!session)return;
    entry.session=null;
    entry.button.classList.remove('rive-ready');
    entry.button.dataset.riveState='idle';entry.button.dataset.rivePlaying='false';
    present(entry);
    const retiring=retire(session).finally(()=>{
      if(entry.retiring===retiring){entry.retiring=null;syncEntry(entry);}
    });
    entry.retiring=retiring;
  }
  function fail(entry,session,error) {
    if(!current(entry,session)){retire(session);return;}
    cancel(entry);entry.failed=true;entry.button.dataset.riveState='fallback';present(entry);
    console.warn(`FiTama ${entry.id} preview kept its saved artwork:`,error?.message||error);
  }
  function resize(entry,session) {
    if(!current(entry,session)||!session.player)return;
    // Rive already measures transformed getBoundingClientRect() dimensions.
    session.player.resizeDrawingSurfaceToCanvas(Math.min(3,devicePixelRatio||1));
  }
  function playback(entry,session) {
    if(!session.bound)return;
    const play=policy(entry).animate;
    if(!play||session.boundVersion!==entry.version){
      // Rive.play() can draw synchronously. Never restart a suspended machine.
      try{if(session.playing)session.player.pause();}catch(error){fail(entry,session,error);return;}
      session.playing=false;entry.button.dataset.rivePlaying='false';return;
    }
    const mood=play&&(entry.hovered||entry.button.matches(':focus-visible'))?'happy':'idle';
    try {
      if(session.mood!==mood){
        // Recreate only the machine, then restore its SAME bound appearance.
        // Without rebinding, the recreated machine loses its happy subscription.
        session.player.stop(session.plan.stateMachine);
        session.player.play(session.plan.stateMachine);
        session.player.bindViewModelInstance(session.vm);
        session.playing=true;
        if(mood==='happy'){
          const happy=session.vm.trigger('happy');
          if(!happy)throw new Error('Pet rig is missing the happy reaction');
          happy.trigger();
        }
        session.mood=mood;
      }
      if(play!==session.playing){
        if(play)session.player.play(session.plan.stateMachine);else session.player.pause();
        session.playing=play;
      }
    }catch(error){fail(entry,session,error);return;}
    entry.button.dataset.riveMood=mood;
    entry.button.dataset.rivePlaying=String(play);
  }
  function requestLook(entry) {
    if(entry.selected)return;
    entry.version++;
    entry.desired=entry.nextPlan?{version:entry.version,plan:entry.nextPlan}:null;
    entry.nextPlan=null;entry.failed=false;
    if(entry.desired)entry.button.dataset.riveTarget=entry.desired.plan.choice.key;
    entry.session?.candidate?.abort.abort();
  }
  function select(entry) {
    if(entry.selected)return;
    entry.selected=true;
    entry.button.setAttribute('aria-pressed','true');
    entry.button.dataset.riveLocked='true';
    const visiblePlan=entry.button.dataset.riveView==='rive'?entry.committedPlan:null;
    if(visiblePlan){
      entry.lockedPlan=visiblePlan;
      // A pending hidden look is selected when its own paint gate completes.
      // Only an actually published look may replace the pending request here.
      if(entry.desired?.plan!==entry.lockedPlan){
        entry.version++;
        entry.desired={version:entry.version,plan:entry.lockedPlan};
        entry.button.dataset.riveTarget=entry.lockedPlan.choice.key;
        entry.session?.candidate?.abort.abort();
      }
    }
  }
  function desiredLook(entry,session) {
    if(!entry.desired||entry.desired.version!==entry.version){
      const plan=entry.lockedPlan||entry.nextPlan||chooseAppearance(session.base,session.catalog,entry.committed);
      entry.nextPlan=null;
      entry.desired={version:entry.version,plan};
      entry.button.dataset.riveTarget=plan.choice.key;
    }
    return entry.desired;
  }
  function paintReady(entry,session) {
    const paint=session.paint;if(!paint)return;
    if(paint.version!==entry.version){session.paint=null;return;}
    paint.advances++;
    if(paint.advances<2||paint.revealing)return;
    paint.revealing=true;
    nextFrame(session,()=>nextFrame(session,()=>{
      if(!current(entry,session)||session.paint!==paint)return;
      if(entry.version!==paint.version||!policy(entry).animate){paint.revealing=false;return;}
      session.ready=true;session.presentedVersion=paint.version;session.paint=null;entry.committed=paint.plan.choice;entry.committedPlan=paint.plan;
      if(entry.selected&&!entry.lockedPlan)entry.lockedPlan=paint.plan;
      entry.button.classList.add('rive-ready');entry.button.dataset.riveState='ready';
      entry.button.dataset.riveAppearance=paint.plan.choice.key;
      entry.button.dataset.riveTraits=JSON.stringify(paint.plan.traits);
      entry.canvas.dataset.riveFrames=String(session.advances);present(entry);playback(entry,session);
    }));
  }
  function drain(entry,session) {
    if(!current(entry,session)||!session.loaded||session.binding||!policy(entry).animate||session.failedVersion===entry.version)return;
    const desired=desiredLook(entry,session);
    if(session.boundVersion===desired.version)return;
    const candidate={...desired,abort:new AbortController(),vm:null,release:null,bound:false};
    session.candidate=candidate;
    entry.button.dataset.riveState=session.ready?'updating':'loading';
    session.binding=Promise.resolve().then(async()=>{
      try {
        candidate.vm=session.model.defaultInstance();
        if(!candidate.vm)throw new Error('Pet appearance model is missing');
        candidate.release=await bindPreviewAppearance(candidate.vm,candidate.plan,async image=>{
          const data=await fetchBytes(localUrl(image.url));candidate.abort.signal.throwIfAborted();
          const value=await session.api.decodeImage(new Uint8Array(data));
          return {value,dispose:()=>value.unref()};
        },candidate.abort.signal);
        if(!current(entry,session)||entry.version!==candidate.version||!policy(entry).animate)candidate.abort.abort();
        candidate.abort.signal.throwIfAborted();
        const previousRelease=session.release;
        // Rebinding cleans the old bound VM; only unbound candidates need explicit VM cleanup.
        session.player.bindViewModelInstance(candidate.vm);candidate.bound=true;
        session.release=candidate.release;candidate.release=null;
        previousRelease?.();
        session.plan=candidate.plan;session.vm=candidate.vm;session.mood=null;session.boundVersion=candidate.version;session.bound=true;
        session.paint={version:candidate.version,plan:candidate.plan,advances:0,revealing:false};
        resize(entry,session);
        playback(entry,session);
      }catch(error){
        if(current(entry,session)&&!candidate.abort.signal.aborted&&entry.version===candidate.version){
          session.failedVersion=candidate.version;
          if(session.ready&&!candidate.bound&&session.plan===entry.committedPlan){
            session.boundVersion=session.presentedVersion=entry.version;
            entry.desired={version:entry.version,plan:session.plan};
            entry.button.dataset.riveTarget=session.plan.choice.key;
            session.mood=null;entry.button.dataset.riveState='ready';present(entry);playback(entry,session);
            console.warn(`FiTama ${entry.id} kept its previous traits:`,error?.message||error);
          }else fail(entry,session,error);
        }
      }finally{
        if(!candidate.bound){
          candidate.release?.();
          try{candidate.vm?.cleanup();}catch{ /* A failed unbound candidate owns its VM. */ }
        }
        if(session.candidate===candidate)session.candidate=null;
        session.binding=null;
        if(current(entry,session))queueMicrotask(()=>drain(entry,session));
      }
    });
  }
  // Prepare bytes after the page is visible and between interactions. This
  // never instantiates or animates a renderer, and never blocks the page loader.
  function warm() {
    const state=getState();
    if(disposed||document.hidden||!state.available||state.paused||state.reduced)return Promise.resolve();
    if(warming)return warming;
    warming=Promise.all([loadRuntime(),loadManifest(),loadCatalog()]).then(async([,manifest,catalog])=>{
      if(disposed||document.hidden)return;
      if(catalog.sourceRevision!==manifest.sourceRevision)return;
      const tasks=[fetchBytes(localUrl(manifest.rig))];
      for(const entry of entries){
        if(entry.selected||policy(entry).open)continue;
        const base=manifest.pets.find(pet=>pet.id===entry.id),traits=catalog.pets[entry.id];
        if(!base||!traits)continue;
        entry.nextPlan??=chooseAppearance(base,traits,entry.committed);
        tasks.push(...entry.nextPlan.images.map(image=>fetchBytes(localUrl(image.url))));
      }
      await Promise.all(tasks);
    }).catch(()=>{ /* Optional preparation may retry through the normal hover path. */ })
      .finally(()=>{warming=null;});
    return warming;
  }
  function start(entry) {
    if(entry.session||entry.retiring||entry.failed||disposed)return;
    const session={abort:new AbortController(),frames:new Set(),ready:false,playing:false,advances:0,bound:false,destroyed:false,loaded:false,boundVersion:null,failedVersion:null};
    entry.session=session;entry.button.dataset.riveState='loading';
    Promise.all([loadRuntime(),loadManifest(),loadCatalog()]).then(async([api,manifest,catalog])=>{
      if(!current(entry,session))return;
      const plan=manifest.pets.find(pet=>pet.id===entry.id);
      if(!plan)throw new Error('This pet has no animation definition');
      if(catalog.sourceRevision!==manifest.sourceRevision||!catalog.pets[entry.id])throw new Error('Pet traits do not match this rig');
      const buffer=await fetchBytes(localUrl(manifest.rig));
      if(!current(entry,session))return;
      session.api=api;session.base=plan;session.catalog=catalog.pets[entry.id];session.plan=plan;
      entry.button.dataset.riveRevision=manifest.sourceRevision;
      Object.assign(entry.canvas.style,{width:`${plan.frame.canvasWidthPercent}%`,height:`${plan.frame.canvasHeightPercent}%`,left:`${plan.frame.leftPercent}%`,top:`${plan.frame.topPercent}%`});
      session.player=new api.Rive({
        buffer,canvas:entry.canvas,artboard:plan.artboard,stateMachine:plan.stateMachine,
        autoplay:false,useOffscreenRenderer:true,enableRiveAssetCDN:false,shouldDisableRiveListeners:true,
        layout:new api.Layout({fit:api.Fit.Contain,alignment:api.Alignment.Center}),
        onLoad:()=>{
          if(!current(entry,session))return;
          try {
            session.player.volume=0;
            session.model=session.player.viewModelByName(plan.viewModel);
            if(!session.model)throw new Error('Pet appearance model is missing');
            session.loaded=true;drain(entry,session);
          }catch(error){fail(entry,session,error);}
        },
        onLoadError:error=>fail(entry,session,error),
        onAdvance:()=>{
          if(!current(entry,session)||!session.bound)return;
          session.advances++;
          if(session.advances%15===0)entry.canvas.dataset.riveFrames=String(session.advances);
          paintReady(entry,session);
        },
      });
    }).catch(error=>fail(entry,session,error));
  }
  function syncEntry(entry) {
    if(disposed)return;
    const state=policy(entry);entry.button.classList.toggle('pet-preview-open',state.open);
    if(entry.session&&!entry.session.ready&&!state.animate)cancel(entry);
    if(entry.session?.candidate&&!state.animate)entry.session.candidate.abort.abort();
    if(state.animate&&!entry.session)start(entry);
    if(entry.session){playback(entry,entry.session);drain(entry,entry.session);}
    present(entry,state);
  }
  const sync=()=>entries.forEach(syncEntry);
  const removers=[];
  const listen=(target,name,handler)=>{target.addEventListener(name,handler);removers.push(()=>target.removeEventListener(name,handler));};
  for(const entry of entries){
    listen(entry.button,'pointerenter',event=>{entry.hovered=event.pointerType!=='touch';entry.failed=false;if(entry.hovered)requestLook(entry);syncEntry(entry);});
    listen(entry.button,'pointerleave',()=>{entry.hovered=false;syncEntry(entry);void warm();});
    listen(entry.button,'focusin',()=>queueMicrotask(()=>{
      if(entry.button.matches(':focus-visible')&&!entry.hovered&&entry.button.getAttribute('aria-pressed')!=='true')requestLook(entry);
      syncEntry(entry);
    }));
    listen(entry.button,'focusout',()=>queueMicrotask(()=>syncEntry(entry)));
    listen(entry.button,'click',()=>{select(entry);syncEntry(entry);});
    listen(entry.canvas,'webglcontextlost',()=>{if(entry.session)fail(entry,entry.session,new Error('Graphics context lost'));});
  }
  listen(document,'visibilitychange',sync);
  listen(window,'resize',()=>requestAnimationFrame(()=>entries.forEach(entry=>{if(entry.session)resize(entry,entry.session);})));
  const dispose=()=>{if(disposed)return;entries.forEach(cancel);disposed=true;removers.forEach(remove=>remove());};
  listen(window,'pagehide',event=>{if(event.persisted){entries.forEach(entry=>entry.session?.player?.pause());}else dispose();});
  listen(window,'pageshow',()=>{entries.forEach(entry=>{if(entry.session)entry.session.playing=false;});sync();});
  sync();
  return {sync,warm,dispose};
}
