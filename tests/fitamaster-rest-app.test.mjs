import test from 'node:test';
import assert from 'node:assert/strict';
import {startPortal} from '../src/fitamaster/app.mjs';
import {Element,nodes,button,click} from './fixtures/fitamaster-dom.mjs';
import {condition,receipt,endedCondition,playerId} from './fixtures/fitamaster-condition.mjs';
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,0));};
function fixture(){
 const root=new Element('root'),calls=[],events=new Map(),storage=new Map();let unknown=false,cleared=false,failPlayer=false,status=null,authCallback;
 const document={visibilityState:'visible',createElement:t=>new Element(t),createTextNode:v=>new Element('#text',v),getElementById:id=>id==='portal'?root:null,addEventListener(){},removeEventListener(){}};
 const browser={document,location:new URL('https://fitama.app/fitamaster/'),history:{replaceState(){}},sessionStorage:{get length(){return storage.size;},key:i=>[...storage.keys()][i],getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},addEventListener:(n,fn)=>events.set(n,fn),removeEventListener:n=>events.delete(n)};
 const time=Date.now(),stamp=offset=>new Date(time+offset).toISOString();
 const c=condition();c.observedAt=stamp(0);c.dungeonRest.restedAt=stamp(-3600000);c.dungeonRest.restUntil=stamp(10800000);c.health.nextHeartAt=stamp(3600000);c.dailyEntries.dayStartedAt=stamp(-3600000);c.dailyEntries.resetsAt=stamp(82800000);
 const r={...receipt(),restedAt:c.dungeonRest.restedAt,previousRestUntil:c.dungeonRest.restUntil,endedAt:stamp(1000)};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:playerId},expires_at:Date.now()/1000+3600}}}),getUser:async()=>({data:{user:{id:playerId}}}),onAuthStateChange:fn=>{authCallback=fn;return{data:{subscription:{unsubscribe(){}}}};},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},rpc:async(name,args)=>{
  calls.push([name,args]);if(name==='fitamaster_access_status')return{data:{allowed:true,mfaRequired:false}};
  if(name==='fitamaster_players')return{data:{players:[{id:playerId,username:'Synthetic'}],nextCursor:null}};
  if(name==='fitamaster_player')return failPlayer?{error:{code:'',message:'Display failed'}}:{data:{profile:{id:playerId,username:'Synthetic',friendCode:'TEST'},generation:2}};
  if(name==='fitamaster_pet_condition')return{data:cleared?{...c,careRevision:5,dungeonRest:endedCondition().dungeonRest,endRest:endedCondition().endRest}:c};
  if(name==='fitamaster_end_dungeon_rest'){if(unknown)throw new Error('Lost result');cleared=true;return{data:{receipt:{...r,requestId:args.p_request_id,reason:args.p_reason},condition:{...c,careRevision:5,dungeonRest:endedCondition().dungeonRest,endRest:endedCondition().endRest}}};}
  if(name==='fitamaster_rest_end_status')return{data:status};
  return{data:{reports:[],events:[],nextCursor:null}};
 }};
 return{root,browser,client,calls,events,set unknown(v){unknown=v;},set failPlayer(v){failPlayer=v;},set status(v){status=v;},get writeCalls(){return calls.filter(([n])=>n==='fitamaster_end_dungeon_rest');},get conditionCalls(){return calls.filter(([n])=>n==='fitamaster_pet_condition');},signOutEvent(){authCallback('SIGNED_OUT',null);}};
}
async function open(f){const running=await startPortal({window:f.browser,client:f.client});await flush();await click(button(f.root,'Synthetic'));await flush();return running;}
function review(f){const textarea=nodes(f.root).find(n=>n.attributes.id==='rest-reason');assert.ok(textarea);textarea.value='Support case #12';textarea.events.input({currentTarget:textarea});const form=nodes(f.root).find(n=>n.className==='rest-form');form.events.submit({preventDefault(){}});}
test('selected player auto-loads condition once; review sends nothing until confirmation and receipt survives refresh failure',async()=>{
 const f=fixture(),running=await open(f);try{assert.equal(f.conditionCalls.length,1);review(f);assert.equal(f.writeCalls.length,0);await running.portal.reports({playerId});assert.equal(f.conditionCalls.length,1);assert.match(f.root.textContent,/Review end dungeon rest/);f.failPlayer=true;await click(button(f.root,'Confirm end rest'));await flush();assert.equal(f.writeCalls.length,1);assert.match(f.root.textContent,/Dungeon rest ended/);assert.match(f.root.textContent,/Support case #12/);}finally{running.dispose();}
});
test('uncertain rest blocks navigation, player reload, grant review and unloading until status-gated exact retry',async()=>{
 const f=fixture(),running=await open(f);try{f.unknown=true;review(f);await click(button(f.root,'Confirm end rest'));await flush();const count=f.calls.length;await click(button(f.root,'Back to players'));await click(button(f.root,'History'));assert.equal(f.calls.length,count);assert.equal(running.portal.state.selectedPlayer,playerId);let prevented=false;const event={preventDefault(){prevented=true;}};f.events.get('beforeunload')(event);assert.equal(prevented,true);assert.equal(event.returnValue,'');
 const grantForm=nodes(f.root).find(n=>n.className==='grant-form');assert.ok(grantForm);grantForm.events.submit({preventDefault(){}});assert.equal(nodes(f.root).some(n=>n.tagName==='h3'&&n.textContent==='Review item addition'),false);assert.equal(f.calls.length,count);assert.equal(button(f.root,'Review item').disabled,true);
 await click(button(f.root,'Check clearance status'));await flush();assert.ok(button(f.root,'Retry same clearance'));f.unknown=false;await click(button(f.root,'Retry same clearance'));await flush();assert.equal(f.writeCalls.length,2);assert.deepEqual(f.writeCalls[0][1],f.writeCalls[1][1]);assert.match(f.root.textContent,/Dungeon rest ended/);
 }finally{running.dispose();}
});
test('auth loss clears pending rest state and player facts',async()=>{const f=fixture(),running=await open(f);try{f.unknown=true;review(f);await click(button(f.root,'Confirm end rest'));f.signOutEvent();assert.equal(running.portal.state.condition,null);assert.equal(running.portal.state.restReceipt,null);assert.doesNotMatch(f.root.textContent,/Support case #12/);}finally{running.dispose();}});
