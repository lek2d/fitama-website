import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemGrantController} from '../src/fitamaster/grant-controller.mjs';
const playerId='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222';
const receipt=intent=>({...intent,grantedAt:'2026-10-28T09:00:00Z'});
function fixture(){
  const calls=[];const portal={state:{phase:'ready',busy:false,selectedPlayer:playerId,player:{profile:{id:playerId,username:'Synthetic',friendCode:'TEST'},generation:3}},setError(message){calls.push(['error',message]);},async grantItem(input){calls.push(['grant',input]);return receipt(input);},async grantStatus(input){calls.push(['status',input]);return {receipt:null};}};
  let refreshes=0,draws=0;const controller=createItemGrantController(portal,{id:()=>requestId,onChange:()=>draws++,onConfirmed:async()=>{refreshes++;}});controller.sync(portal.state);
  return{portal,calls,controller,get refreshes(){return refreshes;},get draws(){return draws;}};
}
const draft={itemId:'health-potion',quantity:2,reason:'Support case #12'};
test('review creates a frozen explicit player intent and never sends before confirm',async()=>{
  const f=fixture(),c=f.controller;c.actions.review(draft);assert.equal(f.calls.length,0);assert.equal(c.state.review.playerId,playerId);assert.equal(c.state.review.generation,3);assert.equal(c.state.review.requestId,requestId);
  c.actions.change('reason','Changed');assert.equal(c.state.review.reason,draft.reason);
  await c.actions.confirm();assert.equal(f.calls.filter(([name])=>name==='grant').length,1);assert.equal(c.state.result.requestId,requestId);assert.equal(f.refreshes,1);
  c.actions.edit();assert.equal(c.state.result,null);assert.equal(c.state.review,null);assert.deepEqual(c.state.draft,{itemId:'',quantity:1,reason:''});
});
test('edit preserves unsent draft; selecting equipment resets quantity to one',()=>{
  const f=fixture(),c=f.controller;c.actions.review(draft);c.actions.edit();assert.equal(c.state.draft.itemId,draft.itemId);assert.equal(c.state.draft.reason,draft.reason);c.actions.change('itemId','vitaslash');assert.equal(c.state.draft.quantity,1);
});
test('lost response requires status check; absent result retries the same immutable request',async()=>{
  const f=fixture(),c=f.controller;f.portal.grantItem=async input=>{f.calls.push(['grant',input]);f.portal.state.grantOutcome='uncertain';return null;};
  c.actions.review(draft);await c.actions.confirm();assert.equal(c.state.uncertain,true);c.actions.edit();c.actions.change('reason','different');assert.equal(c.state.review.reason,draft.reason);
  await c.actions.confirm();assert.equal(f.calls.length,1);await c.actions.checkStatus();assert.equal(c.state.statusChecked,true);
  await c.actions.confirm();const sends=f.calls.filter(([name])=>name==='grant');assert.equal(sends.length,2);assert.deepEqual(sends[0][1],sends[1][1]);assert.equal(c.state.statusChecked,false);
});
test('found status finishes without a second send; failed status cannot unlock retry',async()=>{
  const f=fixture(),c=f.controller;f.portal.grantItem=async()=>{f.portal.state.grantOutcome='uncertain';return null;};c.actions.review(draft);await c.actions.confirm();
  f.portal.grantStatus=async()=>null;await c.actions.checkStatus();assert.equal(c.state.statusChecked,false);
  f.portal.grantStatus=async input=>({receipt:receipt(input)});await c.actions.checkStatus();assert.ok(c.state.result);assert.equal(f.refreshes,1);
});
test('double confirm sends once and target/auth changes discard delayed responses',async()=>{
  for(const change of ['target','session']){const f=fixture(),c=f.controller;let resolve;f.portal.grantItem=()=>new Promise(done=>resolve=done);c.actions.review(draft);const intent=c.state.review;const pending=c.actions.confirm();await c.actions.confirm();
    if(change==='target'){f.portal.state.selectedPlayer='33333333-3333-4333-8333-333333333333';f.portal.state.player=null;}else f.portal.state.phase='login';c.sync(f.portal.state);resolve(receipt(intent));await pending;
    assert.equal(c.state.result,null);assert.equal(c.state.review,null);assert.equal(f.refreshes,0);
  }
});
test('server rejection allows editing and generation changes invalidate old confirmation',async()=>{
  const f=fixture(),c=f.controller;f.portal.grantItem=async()=>{f.portal.state.grantOutcome='rejected';return null;};c.actions.review(draft);await c.actions.confirm();assert.equal(c.state.uncertain,false);c.actions.edit();assert.equal(c.state.review,null);c.actions.review(draft);
  f.portal.state.player.generation++;c.sync(f.portal.state);await c.actions.confirm();assert.equal(c.state.review,null);
});
