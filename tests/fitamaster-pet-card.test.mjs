import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const api=await import('../src/fitamaster/pet-card.mjs').catch(()=>({}));
const manifest=JSON.parse(await readFile(new URL('../docs/assets/pet-rive-v1/manifest.json',import.meta.url)));
const catalog=JSON.parse(await readFile(new URL('../docs/assets/pet-rive-v1/trait-catalog.json',import.meta.url)));
const variants={blukie:'blue',clovie:'nature',ignie:'red'};
const appearance=id=>({version:1,kind:id+'-v1',traits:Object.assign({},...catalog.pets[id].groups.map(group=>group.options.at(-1).traits))});
// A random/default selector, a missing trait validator, or an expiry bypass must fail these cases.
for(const [id,variant] of Object.entries(variants))test('saved '+id+' traits produce the exact deterministic rig plan',()=>{
 assert.equal(typeof api.savedPetPlan,'function');
 const a=appearance(id),card={stage:'pet',variant,appearance:a,sleeping:true};
 const plan=api.savedPetPlan(card,manifest,catalog);
 assert.deepEqual(plan.traits,a.traits);assert.equal(plan.numbers.sleeping,1);
 assert.deepEqual(api.savedPetPlan(card,manifest,catalog),plan);
 assert.equal(api.savedPetPlan({...card,appearance:{...a,traits:{...a.traits,mouth:'invalid'}}},manifest,catalog),null);
 assert.equal(api.savedPetPlan({...card,appearance:{...a,traits:{...a.traits,extra:'bad'}}},manifest,catalog),null);
});
test('eggs never expose a reserved future appearance and unknown versions never invent a look',()=>{
 assert.equal(typeof api.savedPetPlan,'function');
 assert.equal(api.savedPetPlan({stage:'egg',variant:'blue',appearance:appearance('blukie')},manifest,catalog),null);
 assert.equal(api.savedPetPlan({stage:'pet',variant:'blue',appearance:{...appearance('blukie'),version:2}},manifest,catalog),null);
 assert.equal(api.savedPetPlan({stage:'pet',variant:'red',appearance:appearance('blukie')},manifest,catalog),null);
 assert.equal(api.savedPetPlan({stage:'pet',variant:'blue',appearance:{version:1,kind:'original'}},manifest,catalog),null);
});
test('card uses only valid nonexpired TP and distinguishes eggs, unknown and unranked',()=>{
 assert.equal(typeof api.petCardModel,'function');const now=Date.parse('2026-10-28T12:00:00Z');
 const player={profile:{username:'<owner>',countryCode:'PH'},petCard:{stage:'pet',variant:'blue',name:'Saved name',level:5,weeklyRank:12,dailyTp:1400,tpExpiresAt:'2026-10-28T13:00:00Z',sleeping:false}};
 const card=api.petCardModel(player,now);assert.equal(card.tp,'1,400');assert.equal(card.rank,'12th');assert.equal(card.name,'Saved name');
 assert.equal(api.petCardModel({...player,petCard:{...player.petCard,tpExpiresAt:'2026-10-28T11:00:00Z'}},now).tp,'Not available');
 assert.equal(api.petCardModel({...player,petCard:{...player.petCard,stage:'egg',level:99,weeklyRank:null}},now).level,'—');
 assert.equal(api.petCardModel({...player,petCard:{...player.petCard,weeklyRank:null}},now).rank,'Unranked');
 assert.equal(api.petCardModel({profile:player.profile},now),null);
});
class Node {constructor(tag){this.tagName=tag;this.children=[];this.style={};this.attrs={};this.textContent='';this.classList={add(){},remove(){}};}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(){}removeEventListener(){}}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function rendererFixture({deferImages=false}={}){
 const frame=new Node('div'),listeners=new Map(),decoded=[],pending=[];let instance,options,cleanup=0;
 const browser={devicePixelRatio:1,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k),matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 const document={hidden:false,defaultView:browser,createElement:t=>new Node(t),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
 const vm={image:()=>({value:null}),number:()=>({value:null}),cleanup(){}};
 const runtime={Rive:class {constructor(o){options=o;instance=this;queueMicrotask(o.onLoad);}viewModelByName(){return{defaultInstance:()=>vm};}bindViewModelInstance(){}resizeDrawingSurfaceToCanvas(){}play(){queueMicrotask(()=>{options.onAdvance();options.onAdvance();});}pause(){}stop(){}cleanup(){cleanup++;}},Layout:class{},Fit:{Contain:'contain'},Alignment:{Center:'center'},decodeImage:async()=>{if(deferImages)await new Promise(r=>pending.push(r));const image={unref(){image.releases++;},releases:0};decoded.push(image);return image;}};
 const loadResources=async()=>({api:runtime,manifest,catalog,buffer:new ArrayBuffer(1)}),fetchAsset=async()=>new ArrayBuffer(1);
 return{frame,document,loadResources,fetchAsset,pending,decoded,listeners,get cleanup(){return cleanup;},get options(){return options;},get instance(){return instance;}};
}
test('disposal during image decoding releases every owned image and never reveals a stale pet',async()=>{
 assert.equal(typeof api.mountSavedPet,'function');const f=rendererFixture({deferImages:true});
 const r=api.mountSavedPet({...f,card:{stage:'pet',variant:'blue',appearance:appearance('blukie')}});
 await tick();await tick();assert.ok(f.pending.length>0);r.dispose();for(const done of f.pending)done();await r.ready;
 assert.equal(f.frame.attrs['data-pet-state'],'disposed');assert.equal(f.cleanup,1);assert.ok(f.decoded.every(x=>x.releases===1));assert.equal(f.listeners.size,0);
});
test('a ready renderer reveals only after binding and releases its runtime on signout/navigation',async()=>{
 assert.equal(typeof api.mountSavedPet,'function');const f=rendererFixture();const r=api.mountSavedPet({...f,card:{stage:'pet',variant:'blue',appearance:appearance('blukie')}});
 await r.ready;await tick();await tick();assert.equal(f.frame.attrs['data-pet-state'],'ready');
 r.dispose();r.dispose();assert.equal(f.cleanup,1);assert.ok(f.decoded.every(x=>x.releases===1));assert.equal(f.listeners.size,0);
});
