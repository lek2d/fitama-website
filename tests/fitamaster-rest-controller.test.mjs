import test from 'node:test';
import assert from 'node:assert/strict';
import * as subject from '../src/fitamaster/rest-controller.mjs';
import {condition,intent,receipt,endedCondition,playerId,requestId} from './fixtures/fitamaster-condition.mjs';
function fixture(options={}){
 const calls=[];const portal={state:{phase:'ready',busy:false,selectedPlayer:playerId,player:{profile:{id:playerId,username:'Synthetic',friendCode:'TEST'},generation:2},condition:condition()},setError(message){calls.push(['error',message]);},async endDungeonRest(input){calls.push(['end',input]);return {receipt:receipt(),condition:endedCondition()};},async restEndStatus(input){calls.push(['status',input]);return {receipt:null};}};
 let refreshes=0;const controller=subject.createRestController(portal,{id:()=>requestId,now:()=>Date.parse('2026-10-29T09:00:00Z'),onConfirmed:async()=>{refreshes++;},...options});controller.sync(portal.state);return{portal,calls,controller,get refreshes(){return refreshes;}};
}
test('opening and frozen review never mutate; only explicit confirm sends frozen source and reason',async()=>{
 const f=fixture(),c=f.controller;c.actions.toggle(true);c.actions.change('reason','  Support case #12  ');c.actions.review(c.state.draft);
 assert.equal(f.calls.length,0);assert.equal(Object.isFrozen(c.state.review),true);assert.equal(c.state.review.sourceBattleId,intent().sourceBattleId);assert.equal(c.state.review.reason,'Support case #12');
 c.actions.change('reason','Changed');await c.actions.confirm();assert.equal(f.calls[0][0],'end');assert.equal(f.calls[0][1].requestId,requestId);assert.equal(c.state.result.requestId,requestId);assert.equal(f.refreshes,1);
});
test('uncertain outcomes require status lookup before exact retry and retain draft across redraws',async()=>{
 const f=fixture(),c=f.controller;f.portal.endDungeonRest=async input=>{f.calls.push(['end',input]);f.portal.state.restOutcome='uncertain';return null;};
 c.actions.review({reason:'Support case #12'});await c.actions.confirm();c.sync(f.portal.state);assert.equal(c.blocksNavigation,true);c.actions.edit();c.actions.change('reason','Changed');await c.actions.confirm();assert.equal(f.calls.length,1);
 await c.actions.checkStatus();assert.equal(c.state.statusChecked,true);await c.actions.confirm();assert.deepEqual(f.calls[0][1],f.calls[2][1]);assert.equal(c.state.statusChecked,false);
});
test('failed lookup cannot unlock retry; receipt lookup finishes without another write',async()=>{
 const f=fixture(),c=f.controller;f.portal.endDungeonRest=async()=>null;c.actions.review({reason:'Support case #12'});await c.actions.confirm();f.portal.restEndStatus=async()=>null;await c.actions.checkStatus();assert.equal(c.state.statusChecked,false);
 f.portal.restEndStatus=async()=>({receipt:receipt()});await c.actions.checkStatus();assert.equal(c.state.result.requestId,requestId);assert.equal(f.refreshes,1);
});
test('double confirm sends once; competing grants block review and mutation',async()=>{
 let blocked=true;const f=fixture({isBlocked:()=>blocked}),c=f.controller;c.actions.review({reason:'Support case #12'});assert.equal(c.state.review,null);blocked=false;c.actions.review({reason:'Support case #12'});let done;f.portal.endDungeonRest=input=>{f.calls.push(['end',input]);return new Promise(resolve=>done=resolve);};
 const pending=c.actions.confirm();await c.actions.confirm();assert.equal(f.calls.length,1);done({receipt:receipt(),condition:endedCondition()});await pending;
});
test('late target, generation or auth responses cannot restore erased views',async()=>{
 for(const mutation of [s=>s.phase='login',s=>s.selectedPlayer=requestId,s=>s.player.generation++]){
  const f=fixture(),c=f.controller;let done;f.portal.endDungeonRest=()=>new Promise(resolve=>done=resolve);c.actions.review({reason:'Support case #12'});const pending=c.actions.confirm();mutation(f.portal.state);c.sync(f.portal.state);done({receipt:receipt(),condition:endedCondition()});await pending;assert.equal(c.state.result,null);assert.equal(f.refreshes,0);
 }
});
test('source change before confirm prevents stale clearance and expired rest is not reviewable',async()=>{
 const f=fixture(),c=f.controller;c.actions.review({reason:'Support case #12'});f.portal.state.condition={...condition(),dungeonRest:{...condition().dungeonRest,restUntil:'2026-10-29T13:00:00Z'}};c.sync(f.portal.state);await c.actions.confirm();assert.equal(f.calls.length,0);assert.equal(c.state.review,null);
});
test('confirmed receipt survives refresh failure and same-target reload',async()=>{
 const f=fixture({onConfirmed:async()=>{throw new Error('Display refresh failed');}}),c=f.controller;c.actions.review({reason:'Support case #12'});await c.actions.confirm();assert.equal(c.state.result.requestId,requestId);assert.equal(c.state.uncertain,false);
 f.portal.state.player=null;c.sync(f.portal.state);assert.equal(c.state.result.requestId,requestId);
});
test('a cooldown that expires after review is not sent for clearance',async()=>{
 let clock=Date.parse('2026-10-29T09:00:00Z');const f=fixture({now:()=>clock}),c=f.controller;c.actions.review({reason:'Support case #12'});assert.ok(c.state.review);clock=Date.parse('2026-10-29T12:00:00Z');await c.actions.confirm();assert.equal(f.calls.some(([name])=>name==='end'),false);assert.equal(c.state.review,null);
});
test('a confirmed receipt persists until an explicit reset for a different current rest',async()=>{
 const f=fixture(),c=f.controller;c.actions.review({reason:'Support case #12'});await c.actions.confirm();assert.equal(c.state.result.requestId,requestId);
 c.actions.edit();assert.equal(c.state.result.requestId,requestId,'the same stale rest cannot restart review');
 f.portal.state.condition={...condition(),observedAt:'2026-10-29T09:02:00Z',dungeonRest:{...condition().dungeonRest,sourceBattleId:'44444444-4444-4444-8444-444444444444'}};c.sync(f.portal.state);assert.equal(c.state.result.requestId,requestId);assert.equal(c.state.review,null);assert.equal(f.calls.filter(([name])=>name==='end').length,1);
 c.actions.edit();assert.equal(c.state.result,null);assert.deepEqual(c.state.draft,{reason:''});assert.equal(c.state.review,null);assert.equal(f.calls.filter(([name])=>name==='end').length,1);
 c.actions.review({reason:'New support case'});assert.equal(c.state.review.sourceBattleId,'44444444-4444-4444-8444-444444444444');assert.equal(f.calls.filter(([name])=>name==='end').length,1);
});
