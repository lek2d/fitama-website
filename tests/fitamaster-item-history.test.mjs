import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortal} from '../src/fitamaster/core.mjs';
const api=await import('../src/fitamaster/item-history.mjs').catch(()=>({}));
const playerId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const requestId='33333333-3333-4333-8333-333333333333';
const input={playerId,generation:2,days:7,after:null,limit:25};
function dto(patch={}){
 return {playerId,generation:2,days:7,from:'2026-10-22T00:00:00Z',to:'2026-10-29T00:00:00Z',observedAt:'2026-10-29T00:00:00Z',resetAt:null,
  coverage:{basis:'retained_server_records',undatedMagicUses:false,resetWithinWindow:false},
  summary:[{kind:'consumed',itemId:'health-potion',status:null,quantity:1,eventCount:1}],
  events:[{eventId:'care:2:one',kind:'consumed',itemId:'health-potion',quantity:1,generation:2,recordedAt:'2026-10-28T01:00:00Z',status:null,sentAt:null,receivedAt:null,peer:null}],nextCursor:null,...patch};
}
const validate=value=>{assert.equal(typeof api.validateItemHistoryRequest,'function');return api.validateItemHistoryRequest(value);};
const parse=(value,expected=input)=>{assert.equal(typeof api.parseItemHistory,'function');return api.parseItemHistory(value,expected);};
test('history request allows only exact target, generation, 7/30-day periods and bounded cursor/page inputs',()=>{
 assert.deepEqual(validate(input),input);assert.equal(validate({...input,days:30,limit:50}).days,30);
 for(const patch of [{playerId:'bad'},{generation:-1},{generation:1.5},{days:0},{days:14},{days:'7'},{limit:0},{limit:51},{after:'opaque'},{after:{}}])assert.throws(()=>validate({...input,...patch}));
});
test('history parser binds period and player, preserves retained coverage, and strips unrequested fields',()=>{
 const raw=dto({rawSave:'never retained'});raw.events[0].rawResult={secret:'unrequested'};
 const parsed=parse(raw);assert.equal(parsed.events[0].quantity,1);assert.equal(parsed.coverage.basis,'retained_server_records');
 assert.equal('rawSave' in parsed,false);assert.equal('rawResult' in parsed.events[0],false);
 for(const patch of [{playerId:otherId},{generation:3},{days:30},{observedAt:'bad'},{from:'2026-10-20T00:00:00Z'},{events:null},{summary:null},{coverage:{basis:'complete'}}])assert.throws(()=>parse(dto(patch)));
});
test('usage counts stay one per event; gift pending/claimed times and full-period totals cannot be fabricated',()=>{
 for(const patch of [{quantity:2},{recordedAt:'2026-10-29T00:00:00Z'},{recordedAt:'2026-10-21T23:59:59Z'},{kind:'unknown'},{status:'received'}]){
  const value=dto();value.events[0]={...value.events[0],...patch};assert.throws(()=>parse(value));
 }
 const duplicate=dto();duplicate.events.push({...duplicate.events[0]});assert.throws(()=>parse(duplicate));
 assert.throws(()=>parse(dto({summary:[]})));
 const gift={eventId:'gift:one:claimed',kind:'gift_claimed',itemId:'protein-bar',quantity:3,generation:1,recordedAt:'2026-10-28T01:00:00Z',sentAt:'2026-09-01T00:00:00Z',receivedAt:'2026-10-28T01:00:00Z',status:'received',peer:{playerId:otherId,username:'<img src=x>',nameSource:'at_send'}};
 const value=dto({events:[gift],summary:[{kind:'gift_claimed',itemId:'protein-bar',status:'received',quantity:3,eventCount:1}]});
 assert.equal(parse(value).events[0].peer.username,'<img src=x>');
 assert.throws(()=>parse({...value,events:[{...gift,status:'pending'}]}));
 assert.throws(()=>parse({...value,events:[{...gift,receivedAt:'2026-10-27T00:00:00Z'}]}));
});
test('microsecond boundaries and cursor anchoring remain exact across pages',()=>{
 const row=dto().events[0],value=dto({events:[{...row,recordedAt:'2026-10-28T23:59:59.999999Z'}]});
 const cursor={version:1,playerId,generation:2,days:7,anchorAt:value.to,beforeAt:value.events[0].recordedAt,beforeId:row.eventId};
 value.nextCursor=cursor;assert.deepEqual(parse(value).nextCursor,cursor);
 for(const patch of [{playerId:otherId},{generation:3},{days:30},{version:2},{beforeId:'bad key'},{anchorAt:'invalid'}])assert.throws(()=>validate({...input,after:{...cursor,...patch}}));
 assert.throws(()=>parse({...value,nextCursor:{...cursor,beforeId:'another'}}));
 assert.throws(()=>parse(value,{...input,after:{...cursor,anchorAt:'2026-10-28T00:00:00Z'}}));
});
test('malformed calendar dates, extra cursor keys, ambiguous gift provenance and replayed page rows are unavailable',()=>{
 const value=dto();
 for(const recordedAt of ['2026-02-30T00:00:00Z','2026-10-28','2026-10-28T24:00:00Z','2026-10-28T00:00:00'])assert.throws(()=>parse({...value,events:[{...value.events[0],recordedAt}]}));
 const after={version:1,playerId,generation:2,days:7,anchorAt:value.to,beforeAt:value.events[0].recordedAt,beforeId:value.events[0].eventId};
 assert.throws(()=>validate({...input,after:{...after,extra:'not allowed'}}));
 assert.throws(()=>parse(value,{...input,after}));
 const gift={eventId:'gift:one:sent',kind:'gift_sent',itemId:'treat',quantity:1,generation:2,recordedAt:'2026-10-28T01:00:00Z',sentAt:'2026-10-28T01:00:00Z',receivedAt:null,status:'pending',peer:{playerId:otherId,username:'name',nameSource:'at_send'}};
 assert.throws(()=>parse(dto({events:[gift],summary:[{kind:gift.kind,itemId:gift.itemId,status:gift.status,quantity:1,eventCount:1}]})));
});
test('event order is strictly newest first with the same ASCII tie-breaker as SQL',()=>{
 const value=dto(),row=value.events[0];value.summary[0]={...value.summary[0],quantity:2,eventCount:2};
 for(const events of [[{...row,recordedAt:'2026-10-27T00:00:00Z'},{...row,eventId:'care:2:two'}],[{...row,eventId:'care:2:aaa'},{...row,eventId:'care:2:zzz'}]])assert.throws(()=>parse({...value,events}));
 assert.equal(parse({...value,events:[{...row,eventId:'care:2:zzz'},{...row,eventId:'care:2:aaa'}]}).events.length,2);
});
function fixture({aal='aal2',allowed=true}={}){
 let responder=async name=>({data:name==='fitamaster_player'?{profile:{id:playerId},generation:2}:dto()});const calls=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:playerId},expires_at:Date.now()/1000+3600}}}),getUser:async()=>({data:{user:{id:playerId}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}}),listFactors:async()=>({data:{totp:[]}})}},rpc:async(name,args)=>{calls.push([name,args]);return name==='fitamaster_access_status'?{data:{allowed,mfaRequired:aal!=='aal2'}}:responder(name,args);}};
 return {portal:createPortal(client,{id:()=>requestId}),calls,set responder(value){responder=value;}};
}
async function loaded(options){const f=fixture(options);await f.portal.refresh();await f.portal.player(playerId);return f;}
test('history read uses the owner-gated exact RPC with target generation and never calls gameplay getters',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.playerItemHistory,'function');
 assert.deepEqual(await f.portal.playerItemHistory(input),parse(dto()));
 assert.deepEqual(f.calls.at(-1),['fitamaster_player_item_history',{p_request_id:requestId,p_player_id:playerId,p_generation:2,p_days:7,p_after:null,p_limit:25}]);
 assert.equal(f.calls.some(([name])=>/get_pet|receive_friend|use_|grant_item/.test(name)),false);
 assert.throws(()=>f.portal.playerItemHistory({...input,generation:3}));
});
test('period/target/auth changes and failed responses cannot restore previous history',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.playerItemHistory,'function');const replies=[];
 f.responder=()=>new Promise(resolve=>replies.push(resolve));
 const first=f.portal.playerItemHistory(input);await new Promise(resolve=>setTimeout(resolve,0));
 const second=f.portal.playerItemHistory({...input,days:30});await new Promise(resolve=>setTimeout(resolve,0));
 replies[1]({data:dto({days:30,from:'2026-09-29T00:00:00Z'})});await second;
 replies[0]({data:dto()});await first;assert.equal(f.portal.state.itemHistory.days,30);
 f.responder=async()=>({error:{code:'08006',message:'private diagnostics'}});await f.portal.playerItemHistory(input);
 assert.equal(f.portal.state.itemHistory,null);assert.ok(f.portal.state.itemHistoryError);assert.equal(f.portal.state.itemHistoryError.includes('private diagnostics'),false);
 let done;f.responder=()=>new Promise(resolve=>done=resolve);const pending=f.portal.playerItemHistory(input);await new Promise(resolve=>setTimeout(resolve,0));f.portal.invalidate('login');done({data:dto()});await pending;
 assert.equal(f.portal.state.itemHistory,null);assert.equal(f.portal.state.itemHistoryError,'');
});
test('missing owner/AAL2/target cannot issue a history read and wrong-period DTO fails unavailable',async()=>{
 for(const options of [{allowed:false},{aal:'aal1'}]){const f=await loaded(options);assert.equal(typeof f.portal.playerItemHistory,'function');assert.throws(()=>f.portal.playerItemHistory(input));assert.equal(f.calls.some(([name])=>name==='fitamaster_player_item_history'),false);}
 const f=await loaded();f.responder=async()=>({data:dto({playerId:otherId})});await f.portal.playerItemHistory(input);assert.equal(f.portal.state.itemHistory,null);assert.ok(f.portal.state.itemHistoryError);
});
test('late reads after player selection and navigation cannot restore history or local errors',async()=>{
 for(const change of [portal=>portal.player(otherId),portal=>portal.setView('history'),portal=>portal.players()]){
  const f=await loaded();let done;f.responder=name=>name==='fitamaster_player_item_history'?new Promise(resolve=>done=resolve):Promise.resolve({data:{profile:{id:otherId},generation:2}});
  const pending=f.portal.playerItemHistory(input);await new Promise(resolve=>setTimeout(resolve,0));await change(f.portal);done({error:{code:'08006',message:'private stale error'}});await pending;
  assert.equal(f.portal.state.itemHistory,null);assert.equal(f.portal.state.itemHistoryError,'');
 }
});
test('cached Previous pages retain their anchor, bind current target/period and cannot bypass reset mismatch',async()=>{
 const f=await loaded(),cached=await f.portal.playerItemHistory(input),before=f.calls.length;
 assert.deepEqual(f.portal.restorePlayerItemHistory(cached),cached);assert.equal(f.calls.length,before);
 assert.throws(()=>f.portal.restorePlayerItemHistory({...cached,playerId:otherId}));
 f.responder=async()=>({error:{code:'P0001',message:'FITAMASTER_HISTORY_TARGET_CHANGED'}});await f.portal.playerItemHistory(input);
 assert.equal(f.portal.state.itemHistoryNeedsReload,true);assert.equal(f.portal.state.itemHistory,null);
 assert.throws(()=>f.portal.restorePlayerItemHistory(cached));assert.throws(()=>f.portal.playerItemHistory(input));
 assert.equal(f.portal.state.player.profile.id,playerId);
 f.responder=async name=>({data:name==='fitamaster_player'?{profile:{id:playerId},generation:2}:dto()});await f.portal.player(playerId);
 assert.equal(f.portal.state.itemHistoryNeedsReload,false);assert.ok(await f.portal.playerItemHistory(input));
});
