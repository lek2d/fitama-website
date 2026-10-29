import test from 'node:test';
import assert from 'node:assert/strict';
import {startPortal} from '../src/fitamaster/app.mjs';
import {activityDto,playerId,otherId} from './fixtures/fitamaster-activity.mjs';
import {Element,nodes,tags,button,click} from './fixtures/fitamaster-dom.mjs';
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const section=root=>nodes(root).find(node=>node.className==='section activity-section');
function result(args){
 const dto=activityDto({playerId:args.p_player_id});
 if(args.p_period==='monthly'||args.p_offset){
  const start=args.p_period==='monthly'?new Date(Date.UTC(2026,9-args.p_offset,1)):new Date(Date.UTC(2026,9,26-args.p_offset*7));
  const end=new Date(start);if(args.p_period==='monthly')end.setUTCMonth(end.getUTCMonth()+1);else end.setUTCDate(end.getUTCDate()+7);
  const dates=[];for(let at=+start;at<+end;at+=86400000){const day=new Date(at).toISOString().slice(0,10),future=day>'2026-10-29';dates.push({day,rankingTp:future?null:0,creditStatus:future?'future':'no_credit_record',visitDays:0,questClaims:0,dungeonAttacks:0});}
  dto.period={kind:args.p_period,offset:args.p_offset,startsAt:new Date(+start-14400000).toISOString(),endsAt:new Date(+end-14400000).toISOString(),timeZone:'Asia/Manila',inProgress:args.p_offset===0};
  dto.summary={rankingTp:0,recordedTpDays:0,highestDailyTp:0,visitDays:0,questClaims:0,dungeonAttacks:0,lastRecordedVisitAt:null,lastRecordedActionAt:null};dto.activity.code='no_recorded_activity';dto.days=dates;
 }
 return dto;
}
function fixture(){
 const root=new Element('root'),calls=[],events=new Map(),values=new Map();let authCallback,responder;
 const session={user:{id:playerId},expires_at:Date.now()/1000+3600};
 const document={visibilityState:'visible',createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text),getElementById:id=>id==='portal'?root:nodes(root).find(node=>node.attributes.id===id),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const browser={document,location:new URL('https://fitama.app/fitamaster/'),history:{replaceState(){}},sessionStorage:{get length(){return values.size;},key:i=>[...values.keys()][i],getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},addEventListener(){},removeEventListener(){}};document.defaultView=browser;
 const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}};},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},rpc:async(name,args)=>{
  calls.push([name,args]);if(name==='fitamaster_access_status')return {data:{allowed:true,mfaRequired:false}};
  if(name==='fitamaster_players')return {data:{players:[{id:playerId,username:'Alpha'},{id:otherId,username:'Beta'}]}};
  if(name==='fitamaster_player')return {data:{profile:{id:args.p_player_id,username:'Player'},generation:2,equipment:[],inventory:{items:[]}}};
  if(name==='fitamaster_player_activity')return responder?responder(args):{data:result(args)};
  if(name==='fitamaster_player_item_history')return {data:{playerId:args.p_player_id,generation:2,days:args.p_days,from:new Date(Date.parse('2026-10-29T09:00:00Z')-args.p_days*86400000).toISOString(),to:'2026-10-29T09:00:00Z',observedAt:'2026-10-29T09:00:00Z',resetAt:null,coverage:{basis:'retained_server_records',undatedMagicUses:false,resetWithinWindow:false},summary:[],events:[],nextCursor:null}};
  return {data:{reports:[],nextCursor:null}};
 }};
 return {root,browser,client,calls,set responder(value){responder=value;},signout(){authCallback('SIGNED_OUT',null);},get activityCalls(){return calls.filter(([name])=>name==='fitamaster_player_activity');}};
}
async function open(f){const running=await startPortal({window:f.browser,client:f.client});await flush();await click(button(f.root,'Alpha'));await flush();return running;}
test('opening player loads activity once; period controls and Refresh stay independent from item history',async()=>{
 const f=fixture(),running=await open(f);try{
  assert.equal(f.activityCalls.length,1);assert.match(section(f.root).textContent,/Fully active/);
  const historyReads=f.calls.filter(([name])=>name==='fitamaster_player_item_history').length;
  tags(section(f.root),'select')[0].events.change({currentTarget:{value:'monthly'}});await flush();
  assert.equal(f.activityCalls.at(-1)[1].p_period,'monthly');assert.equal(running.portal.state.activityOffset,0);assert.equal(running.portal.state.activity.days.length,31);
  click(button(section(f.root),'Previous period'));await flush();assert.equal(f.activityCalls.at(-1)[1].p_offset,1);
  click(button(section(f.root),'Refresh activity'));await flush();assert.equal(f.activityCalls.at(-1)[1].p_offset,1);
  assert.equal(f.calls.filter(([name])=>name==='fitamaster_player_item_history').length,historyReads);assert.equal(running.portal.state.itemHistoryDays,7);
  await running.portal.reports({playerId});await flush();assert.equal(f.activityCalls.length,4);
 }finally{running.dispose();}
});
test('new player resets activity calendar and stale old-player or signed-out responses stay erased',async()=>{
 const f=fixture(),running=await open(f);try{
  tags(section(f.root),'select')[0].events.change({currentTarget:{value:'monthly'}});await flush();let resolve;
  f.responder=args=>args.p_player_id===playerId?new Promise(done=>resolve=()=>done({data:result(args)})):{data:result(args)};
  click(button(section(f.root),'Refresh activity'));await flush();await running.portal.player(otherId);await flush();resolve();await flush();
  assert.equal(running.portal.state.activity.playerId,otherId);assert.equal(running.portal.state.activityPeriod,'weekly');
  f.responder=args=>new Promise(done=>resolve=()=>done({data:result(args)}));click(button(section(f.root),'Refresh activity'));await flush();f.signout();resolve();await flush();
  assert.equal(running.portal.state.activity,null);assert.equal(section(f.root),undefined);
 }finally{running.dispose();}
});
test('a reset generation mismatch offers explicit player reload and disables futile activity retries',async()=>{
 const f=fixture(),running=await open(f);try{
  f.responder=args=>({data:{...result(args),generation:3}});
  await click(button(section(f.root),'Refresh activity'));await flush();
  assert.equal(running.portal.state.activityNeedsReload,true);
  assert.match(section(f.root).textContent,/Reload their details/);
  assert.equal(button(section(f.root),'Refresh activity').disabled,true);
  assert.ok(button(f.root,'Reload player details'));
  assert.doesNotMatch(section(f.root).textContent,/Fully active|Ranking TP credited300/);
 }finally{running.dispose();}
});
