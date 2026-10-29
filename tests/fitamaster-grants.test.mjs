import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/fitamaster/core.mjs';
const playerId='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222';
const intent={playerId,generation:2,itemId:'treat',quantity:3,reason:'Support compensation',requestId};
const receipt={...intent,grantedAt:'2026-10-28T12:00:00Z'};
function fixture({allowed=true,aal='aal2'}={}){
 let responder=async(name)=>name==='fitamaster_player'?{data:{profile:{id:playerId,username:'sample',friendCode:'SAMPLE'},generation:2}}:{data:receipt};const calls=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:playerId},expires_at:Date.now()/1000+3600}}}),getUser:async()=>({data:{user:{id:playerId}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}}),listFactors:async()=>({data:{totp:[]}})}},rpc:async(name,args)=>{calls.push([name,args]);return name==='fitamaster_access_status'?{data:{allowed,mfaRequired:aal!=='aal2'}}:responder(name,args);}};
 const portal=core.createPortal(client,{id:()=>requestId});return{portal,client,calls,set responder(value){responder=value;}};
}
async function loaded(options){const f=fixture(options);await f.portal.refresh();await f.portal.player(playerId);return f;}
test('grant validation accepts only normal catalog items and exact bounded intent',()=>{
 assert.equal(typeof core.validateItemGrant,'function');assert.deepEqual(core.validateItemGrant({...intent,quantity:'3',reason:'  Support compensation  '}),intent);
 for(const change of [{itemId:'ancient-compass'},{itemId:'power-bottle'},{itemId:'future-item'},{quantity:0},{quantity:100},{quantity:1.5},{quantity:'1e1'},{generation:-1},{playerId:'bad'},{requestId:'bad'},{reason:''},{reason:'x'.repeat(241)},{reason:'\nSupport'},{reason:'Support\u200b'}])assert.throws(()=>core.validateItemGrant({...intent,...change}));
 assert.equal(core.validateItemGrant({...intent,itemId:'vitaslash',quantity:1}).quantity,1);assert.throws(()=>core.validateItemGrant({...intent,itemId:'vitaslash',quantity:2}));
});
test('Magic Potion enables one tester entitlement and cannot be granted as potion stock',()=>{
 const unlock={...intent,itemId:'magic-potion',quantity:1};
 assert.deepEqual(core.validateItemGrant(unlock),unlock);
 assert.deepEqual(core.validateItemGrant({...unlock,quantity:'1'}),unlock);
 for(const quantity of [0,2,99,100,1.5,'2','1e0'])assert.throws(()=>core.validateItemGrant({...unlock,quantity}));
 assert.equal(core.publicError({code:'P0001',message:'FITAMASTER_GRANT_ALREADY_ENABLED'}),'Magic Potion test access is already unlocked for this account.');
});
test('Magic Potion uses the same explicit target, immutable receipt and status RPC contract',async()=>{
 const f=await loaded(),unlock={...intent,itemId:'magic-potion',quantity:1},delivered={...unlock,grantedAt:receipt.grantedAt};
 f.responder=async name=>({data:name==='fitamaster_grant_status'?delivered:delivered});
 assert.deepEqual(await f.portal.grantItem(unlock),delivered);
 assert.deepEqual(f.calls.at(-1),['fitamaster_grant_item',{p_request_id:requestId,p_player_id:playerId,p_generation:2,p_item_id:'magic-potion',p_quantity:1,p_reason:intent.reason}]);
 assert.deepEqual(await f.portal.grantStatus(unlock),{receipt:delivered});
});
test('grant uses reviewed target/generation and the same immutable request ID',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.grantItem,'function');const result=await f.portal.grantItem(intent);
 assert.deepEqual(result,receipt);assert.equal(f.portal.state.grantOutcome,'confirmed');
 assert.deepEqual(f.calls.at(-1),['fitamaster_grant_item',{p_request_id:requestId,p_player_id:playerId,p_generation:2,p_item_id:'treat',p_quantity:3,p_reason:'Support compensation'}]);
 assert.throws(()=>f.portal.grantItem({...intent,generation:3}));
});
test('a missing owner or aal2 never sends a grant RPC',async()=>{
 for(const options of [{allowed:false},{aal:'aal1'}]){const f=await loaded(options);assert.equal(typeof f.portal.grantItem,'function');await assert.rejects(async()=>f.portal.grantItem(intent));assert.equal(f.calls.some(([n])=>n==='fitamaster_grant_item'),false);}
});
test('transport ambiguity keeps an uncertain outcome, while server rejection permits correction',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.grantItem,'function');f.responder=async()=>({error:{message:'Failed to fetch',code:''}});await f.portal.grantItem(intent);assert.equal(f.portal.state.grantOutcome,'uncertain');
 f.responder=async()=>({error:{message:'FITAMASTER_GRANT_INVENTORY_UNAVAILABLE',code:'P0001'}});await f.portal.grantItem(intent);assert.equal(f.portal.state.grantOutcome,'rejected');assert.match(f.portal.state.error,/sync|open.*app/i);
});
test('wrong or malformed receipt is uncertain instead of a false success',async()=>{
 for(const result of [null,{...receipt,playerId:requestId},{...receipt,quantity:8},{...receipt,grantedAt:'invalid'},{...receipt,grantedAt:2000}]){const f=await loaded();assert.equal(typeof f.portal.grantItem,'function');f.responder=async()=>({data:result});await f.portal.grantItem(intent);assert.equal(f.portal.state.grantReceipt,null);assert.equal(f.portal.state.grantOutcome,'uncertain');}
});
test('status distinguishes a completed grant, a checked absence, and a failed check',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.grantStatus,'function');f.responder=async()=>({data:null});assert.deepEqual(await f.portal.grantStatus(intent),{receipt:null});
 f.responder=async()=>({data:receipt});assert.deepEqual(await f.portal.grantStatus(intent),{receipt});assert.equal(f.calls.at(-1)[0],'fitamaster_grant_status');assert.equal(f.calls.at(-1)[1].p_grant_request_id,requestId);
 f.responder=async()=>({error:{code:'',message:'Failed to fetch'}});assert.equal(await f.portal.grantStatus(intent),null);assert.equal(f.portal.state.grantCheck,null);
});
test('auth loss clears grant results and ignores a late completion',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.grantItem,'function');let done;f.responder=()=>new Promise(resolve=>done=resolve);const pending=f.portal.grantItem(intent);await new Promise(r=>setTimeout(r,0));f.portal.invalidate('login');done({data:receipt});await pending;
 assert.equal(f.portal.state.grantReceipt,null);assert.equal(f.portal.state.grantCheck,null);assert.equal(f.portal.state.grantOutcome,null);
});
test('changing target prevents a late grant response from restoring the previous target view',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.grantItem,'function');let done;f.responder=()=>new Promise(resolve=>done=resolve);const pending=f.portal.grantItem(intent);await new Promise(r=>setTimeout(r,0));f.portal.setView('players');done({data:receipt});await pending;assert.equal(f.portal.state.grantReceipt,null);assert.equal(f.portal.state.selectedPlayer,null);
});
test('database connection loss and gateway infrastructure errors retain an unknown write outcome',async()=>{
 for(const code of ['08006','08007','40003','PGRST000','PGRST001','PGRST002']){
  const f=await loaded();f.responder=async()=>({error:{code,status:500,message:'connection lost after commit'}});await f.portal.grantItem(intent);assert.equal(f.portal.state.grantOutcome,'uncertain',code);
 }
});
