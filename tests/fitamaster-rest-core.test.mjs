import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortal} from '../src/fitamaster/core.mjs';
import {condition,intent,receipt,endedCondition,playerId,requestId} from './fixtures/fitamaster-condition.mjs';
async function fixture({allowed=true,aal='aal2'}={}){
 const calls=[];let responder=async name=>({data:name==='fitamaster_player'?{profile:{id:playerId},generation:2}:name==='fitamaster_pet_condition'?condition():{receipt:receipt(),condition:endedCondition()}});
 const client={auth:{getSession:async()=>({data:{session:{user:{id:playerId},expires_at:Date.now()/1000+3600}}}),getUser:async()=>({data:{user:{id:playerId}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}}),listFactors:async()=>({data:{totp:[]}})}},rpc:async(name,args)=>{calls.push([name,args]);return name==='fitamaster_access_status'?{data:{allowed,mfaRequired:aal!=='aal2'}}:responder(name,args);}};
 const portal=createPortal(client,{id:()=>requestId});await portal.refresh();await portal.player(playerId);return{portal,calls,set responder(value){responder=value;}};
}
test('condition RPC validates the selected generation and sends only a pure read request',async()=>{
 const f=await fixture();assert.equal(typeof f.portal.petCondition,'function');assert.deepEqual(await f.portal.petCondition(),condition());assert.deepEqual(f.calls.at(-1),['fitamaster_pet_condition',{p_request_id:requestId,p_player_id:playerId}]);
 f.responder=async()=>({data:{...condition(),generation:3}});assert.equal(await f.portal.petCondition(),null);assert.equal(f.portal.state.condition,null);assert.match(f.portal.state.conditionError,/verif/);
});
test('end rest sends the frozen source tuple and validates receipt and post-clear condition',async()=>{
 const f=await fixture();assert.equal(typeof f.portal.endDungeonRest,'function');assert.deepEqual(await f.portal.endDungeonRest(intent()),{receipt:receipt(),condition:endedCondition()});
 assert.deepEqual(f.calls.at(-1),['fitamaster_end_dungeon_rest',{p_request_id:requestId,p_player_id:playerId,p_generation:2,p_source_battle_id:intent().sourceBattleId,p_rested_at:intent().restedAt,p_rest_until:intent().restUntil,p_reason:'Support case #12'}]);assert.equal(f.portal.state.restOutcome,'confirmed');assert.equal(f.portal.state.grantOutcome,null);
 f.responder=async()=>({data:{receipt:{...receipt(),reason:'wrong'},condition:endedCondition()}});await f.portal.endDungeonRest(intent());assert.equal(f.portal.state.restOutcome,'uncertain');assert.match(f.portal.state.error,/clearance status/);
});
test('unknown writes mutually block competing mutations; recovery sends the original nonce',async()=>{
 const f=await fixture();assert.equal(typeof f.portal.endDungeonRest,'function');f.responder=async()=>({error:{code:'08006',message:'Connection lost'}});await f.portal.endDungeonRest(intent());
 const count=f.calls.length;assert.equal(await f.portal.grantItem({playerId,generation:2,requestId,itemId:'treat',quantity:1,reason:'Support'}),null);assert.equal(f.calls.length,count);
 f.responder=async()=>({data:null});assert.deepEqual(await f.portal.restEndStatus(intent()),{receipt:null});assert.equal(f.calls.at(-1)[1].p_end_request_id,requestId);
 f.responder=async()=>({data:receipt()});assert.deepEqual(await f.portal.restEndStatus(intent()),{receipt:receipt()});
});
test('unknown grants block rest clear, but server rejection remains editable',async()=>{
 const f=await fixture();assert.equal(typeof f.portal.endDungeonRest,'function');f.responder=async()=>({error:{code:'08006',message:'Connection lost'}});await f.portal.grantItem({playerId,generation:2,requestId,itemId:'treat',quantity:1,reason:'Support'});const count=f.calls.length;assert.equal(await f.portal.endDungeonRest(intent()),null);assert.equal(f.calls.length,count);
 const g=await fixture();g.responder=async()=>({error:{code:'P0001',message:'FITAMASTER_REST_SOURCE_CHANGED'}});await g.portal.endDungeonRest(intent());assert.equal(g.portal.state.restOutcome,'rejected');assert.match(g.portal.state.error,/changed|refresh/i);
});
test('AAL2 and owner checks apply before new rest RPCs, auth loss discards late responses',async()=>{
 for(const options of [{allowed:false},{aal:'aal1'}]){const f=await fixture(options);assert.equal(typeof f.portal.endDungeonRest,'function');await assert.rejects(async()=>f.portal.endDungeonRest(intent()));assert.equal(f.calls.some(([name])=>name==='fitamaster_end_dungeon_rest'),false);}
 const f=await fixture();let done;f.responder=()=>new Promise(resolve=>done=resolve);const pending=f.portal.endDungeonRest(intent());await new Promise(r=>setTimeout(r,0));f.portal.invalidate('login');done({data:{receipt:receipt(),condition:endedCondition()}});await pending;assert.equal(f.portal.state.restReceipt,null);assert.equal(f.portal.state.restOutcome,null);
});
test('a status-confirmed receipt releases the competing mutation blocker even when display refresh fails',async()=>{
 const f=await fixture();f.responder=async()=>({error:{code:'08006',message:'Lost result'}});await f.portal.endDungeonRest(intent());f.responder=async()=>({data:receipt()});await f.portal.restEndStatus(intent());assert.equal(f.portal.state.restOutcome,'confirmed');
 const before=f.calls.length;f.responder=async()=>({error:{code:'P0001',message:'FITAMASTER_GRANT_DISABLED'}});await f.portal.grantItem({playerId,generation:2,requestId,itemId:'treat',quantity:1,reason:'Support'});assert.ok(f.calls.length>before);
});
test('admin rest history validates full immutable receipt before displaying it',async()=>{
 const f=await fixture();const event={action:'end_dungeon_rest',playerId,requestId,restEnd:receipt()};f.responder=async()=>({data:{events:[event],nextCursor:null}});assert.deepEqual((await f.portal.history()).events[0].restEnd,receipt());
 for(const restEnd of [null,{...receipt(),reason:'bad\nreason'},{...receipt(),careRevision:-1}]){f.responder=async()=>({data:{events:[{...event,restEnd}],nextCursor:null}});assert.equal(await f.portal.history(),null);assert.equal(f.portal.state.history,null);}
});
test('backend rest guard failures explain the actual refusal without implying another dungeon can be entered',async()=>{
 const f=await fixture();f.responder=async()=>({error:{code:'P0001',message:'FITAMASTER_REST_NOT_ALLOWED: active_dungeon'}});await f.portal.endDungeonRest(intent());assert.match(f.portal.state.error,/active or unresolved dungeon/i);
});
