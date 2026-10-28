import {composeAppearance} from '../../docs/pet-traits.mjs';
import {bindPreviewAppearance} from '../../docs/pet-preview.mjs';

const species={blue:'blukie',nature:'clovie',red:'ignie'};
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const shown=value=>value===null||value===undefined?'Not available':String(value);
function rankText(rank){if(rank===null)return 'Unranked';if(!integer(rank)||rank===0)return 'Not available';const end=rank%100;return rank+((end>=11&&end<=13)?'th':({1:'st',2:'nd',3:'rd'}[rank%10]||'th'));}
export function petCardModel(player,now=Date.now()){
 const card=player?.petCard;if(!card||!species[card.variant]||!['egg','pet'].includes(card.stage))return null;
 const expiry=Date.parse(card.tpExpiresAt),validTp=integer(card.dailyTp)&&Number.isFinite(expiry)&&expiry>now;
 return{...card,name:card.stage==='egg'?'Tama-Egg':(typeof card.name==='string'&&card.name.trim()?card.name:'Not available'),species:species[card.variant],owner:player.profile?.username?'@'+String(player.profile.username).replace(/^@/,''):'Not available',country:typeof player.profile?.countryCode==='string'?player.profile.countryCode.toUpperCase():null,level:card.stage==='egg'?'—':integer(card.level)&&card.level>0?String(card.level):'Not available',rank:rankText(card.weeklyRank),tp:validTp?card.dailyTp.toLocaleString('en-US'):'Not available',status:card.stage==='egg'?'Egg':card.sleeping===true?'Sleeping':card.sleeping===false?'Awake':'Not available'};
}

// Resolve every saved ID against the versioned, approved catalog. Never choose a random look.
export function savedPetPlan(card,manifest,catalog){
 const id=species[card?.variant],appearance=card?.appearance;
 if(card?.stage!=='pet'||!id||appearance?.version!==1||appearance.kind!==id+'-v1'||!appearance.traits||Array.isArray(appearance.traits)||Object.keys(appearance.traits).length!==6||manifest?.sourceRevision!==catalog?.sourceRevision)return null;
 const base=manifest.pets?.find(pet=>pet.id===id),traits=catalog.pets?.[id];if(!base||!traits?.groups?.length)return null;
 let index=0,multiplier=1;const seen=new Set();
 for(const group of traits.groups){
  const choice=group.options.findIndex(option=>Object.entries(option.traits).every(([key,value])=>Object.hasOwn(appearance.traits,key)&&appearance.traits[key]===value));
  if(choice<0)return null;for(const key of Object.keys(group.options[choice].traits))seen.add(key);
  index+=choice*multiplier;multiplier*=group.options.length;
 }
 if(seen.size!==6||Object.keys(appearance.traits).some(key=>!seen.has(key)))return null;
 const plan=composeAppearance(base,traits,index);plan.numbers.sleeping=card.sleeping===true?1:0;return plan;
}

const assetRoot='/assets/pet-rive-v1/',vendorRoot='/assets/vendor/rive-webgl2-2.42.0/';
let resourcesPromise,runtimePromise;
const byteCache=new Map();
async function fetchLocal(path,kind='arrayBuffer'){
 const response=await fetch(path,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Pet artwork unavailable');return response[kind]();
}
function fetchAsset(path){if(!byteCache.has(path))byteCache.set(path,fetchLocal(path).catch(error=>{byteCache.delete(path);throw error;}));return byteCache.get(path);}
function loadRuntime(document){
 if(!runtimePromise)runtimePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=vendorRoot+'rive.js';script.async=true;
  script.onload=()=>{const api=globalThis.rive;if(!api?.Rive||!api.decodeImage){reject(new Error('Pet runtime unavailable'));return;}api.RuntimeLoader.setWasmUrl(vendorRoot+'rive.wasm');api.RuntimeLoader.setWasmFallbackUrl(vendorRoot+'rive_fallback.wasm');api.RuntimeLoader.awaitInstance().then(()=>resolve(api),reject);};
  script.onerror=()=>{script.remove();reject(new Error('Pet runtime unavailable'));};document.head.append(script);
 }).catch(error=>{runtimePromise=null;throw error;});return runtimePromise;
}
async function loadResources(document){
 if(!resourcesPromise)resourcesPromise=Promise.all([fetchLocal(assetRoot+'manifest.json','json'),fetchLocal(assetRoot+'trait-catalog.json','json')]).then(async([manifest,catalog])=>({manifest,catalog,buffer:await fetchAsset(assetRoot+manifest.rig)})).catch(error=>{resourcesPromise=null;throw error;});
 const [api,data]=await Promise.all([loadRuntime(document),resourcesPromise]);return{api,...data};
}

export function mountSavedPet({document,frame,card,loadResources:resources=()=>loadResources(document),fetchAsset:bytes=fetchAsset}){
 const browser=document.defaultView||globalThis.window,abort=new AbortController(),removers=[],frames=new Set();
 let player,release,vm,binding,disposed=false,cleaned=false,readyFrames=0,revealed=false,bound=false,canvas,observer;
 const listen=(target,name,handler)=>{target.addEventListener(name,handler);removers.push(()=>target.removeEventListener(name,handler));};
 const state=value=>frame.setAttribute('data-pet-state',value);
 const text=value=>{const p=document.createElement('p');p.className='pet-art-message';p.textContent=value;frame.replaceChildren(p);};
 const valid=()=>!disposed&&!abort.signal.aborted;
 const cleanup=()=>{if(cleaned)return;cleaned=true;release?.();release=null;try{player?.cleanup();}catch{}if(!bound)try{vm?.cleanup();}catch{}};
 const unavailable=()=>{if(!valid())return;state('unavailable');text('Saved appearance unavailable');};
 function dispose(){if(disposed)return;disposed=true;abort.abort();for(const id of frames)browser.cancelAnimationFrame(id);frames.clear();observer?.disconnect();removers.forEach(remove=>remove());state('disposed');frame.replaceChildren();if(binding)binding.then(cleanup,cleanup);else cleanup();}
 const id=species[card?.variant];state('loading');text('Loading saved appearance…');
 if(!id||!['egg','pet'].includes(card?.stage)){unavailable();return{dispose,ready:Promise.resolve()};}
 if(card.stage==='egg'||(card.appearance?.kind==='original'&&card.appearance.version===1)){
  const img=document.createElement('img');img.alt=card.stage==='egg'?'Tama-Egg':id+' original appearance';img.className='pet-still';
  img.src=card.stage==='egg'?'/assets/storyboard/egg-'+id+'.png':'/assets/fitamaster-pets/'+id+'-'+(card.sleeping===true?'sleep':'default')+'.png';
  img.addEventListener('error',unavailable,{once:true});frame.replaceChildren(img);state('still');return{dispose,ready:Promise.resolve()};
 }
 const media=browser.matchMedia?.('(prefers-reduced-motion: reduce)');
 const playback=()=>{if(!valid()||!player||!revealed)return;if(document.hidden||media?.matches)player.pause();else player.play();};
 listen(document,'visibilitychange',playback);if(media?.addEventListener)listen(media,'change',playback);
 const resize=()=>{if(valid()&&player)player.resizeDrawingSurfaceToCanvas(Math.min(3,browser.devicePixelRatio||1));};
 listen(browser,'resize',resize);
 const ready=Promise.resolve().then(async()=>{
  const {api,manifest,catalog,buffer}=await resources();if(!valid())return;
  const plan=savedPetPlan(card,manifest,catalog);if(!plan){unavailable();return;}
  canvas=document.createElement('canvas');canvas.className='pet-saved-canvas';canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{width:plan.frame.canvasWidthPercent+'%',height:plan.frame.canvasHeightPercent+'%',left:plan.frame.leftPercent+'%',top:plan.frame.topPercent+'%'});
  canvas.style.opacity='0';frame.append(canvas);
  listen(canvas,'webglcontextlost',()=>{if(!valid())return;unavailable();abort.abort();if(binding)binding.then(cleanup,cleanup);else cleanup();});
  const loaded=new Promise((resolve,reject)=>{
   abort.signal.addEventListener('abort',resolve,{once:true});
   player=new api.Rive({buffer,canvas,artboard:plan.artboard,stateMachine:plan.stateMachine,autoplay:false,useOffscreenRenderer:true,enableRiveAssetCDN:false,shouldDisableRiveListeners:true,
    layout:new api.Layout({fit:api.Fit.Contain,alignment:api.Alignment.Center}),
    onLoad:()=>resolve(),onLoadError:()=>reject(new Error('Pet artwork unavailable')),
    onAdvance:()=>{if(!valid()||!release||revealed||++readyFrames<2)return;const paint=browser.requestAnimationFrame(()=>{frames.delete(paint);if(!valid())return;revealed=true;for(const child of [...frame.children])if(child!==canvas)child.remove?.();canvas.style.opacity='1';state('ready');playback();});frames.add(paint);}
   });
  });
  await loaded;if(!valid()){cleanup();return;}
  const model=player.viewModelByName(plan.viewModel);vm=model?.defaultInstance();if(!vm)throw new Error('Pet artwork unavailable');
  binding=bindPreviewAppearance(vm,plan,async image=>{const data=await bytes(assetRoot+image.url);abort.signal.throwIfAborted();const imageValue=await api.decodeImage(new Uint8Array(data));return{value:imageValue,dispose:()=>imageValue.unref()};},abort.signal);
  release=await binding;binding=null;if(!valid()){cleanup();return;}
  player.bindViewModelInstance(vm);bound=true;resize();player.stop(plan.stateMachine);player.play(plan.stateMachine);player.bindViewModelInstance(vm);
  if(browser.ResizeObserver){observer=new browser.ResizeObserver(resize);observer.observe(frame);}
 }).catch(()=>{if(valid()){unavailable();cleanup();}});
 return{dispose,ready};
}
