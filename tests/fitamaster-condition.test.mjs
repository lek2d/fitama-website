import test from 'node:test';
import assert from 'node:assert/strict';
import * as subject from '../src/fitamaster/condition.mjs';
import {condition,intent,receipt,endedCondition,playerId} from './fixtures/fitamaster-condition.mjs';
test('condition validates target and distinct zero-heart cooldown facts without conflating daily limit with rest permission',()=>{
 assert.deepEqual(subject.parsePetCondition(condition(),{playerId,generation:2}),condition());
 const unknown=condition();unknown.health={available:false,hearts:null,nextHeartAt:null};unknown.careRevision=null;unknown.dungeonRest={status:'unknown',sourceBattleId:null,restedAt:null,restUntil:null,timeZone:null,sourceStatus:null};unknown.endRest={allowed:false,blockedReason:'care_unavailable'};
 assert.equal(subject.parsePetCondition(unknown,{playerId,generation:2}).health.hearts,null);
});
test('malformed, inconsistent, stale or differently targeted condition never becomes actionable',()=>{
 for(const change of [c=>c.schemaVersion=2,c=>c.playerId='bad',c=>c.generation=3,c=>c.careRevision=-1,c=>c.observedAt='2026-02-30T09:00:00Z',c=>c.health.hearts=NaN,c=>c.health.nextHeartAt=c.observedAt,c=>c.dungeonRest.restUntil=c.observedAt,c=>c.dungeonRest.sourceBattleId=null,c=>c.dailyEntries.used=-1,c=>c.dailyEntries.limit=3,c=>c.dailyEntries.timeZone='invalid/timezone',c=>c.endRest.blockedReason='egg',c=>c.activeDungeon={battleId:playerId,status:'active'},c=>c.petStage='egg']){
  const c=condition();change(c);assert.throws(()=>subject.parsePetCondition(c,{playerId,generation:2}));
 }
});
test('end-rest review normalizes one immutable intent; receipts bind every frozen value and changed care revision',()=>{
 assert.deepEqual(subject.validateEndRest({...intent(),reason:'  Support case #12  '}),intent());
 for(const patch of [{requestId:'bad'},{generation:-1},{reason:'x\ny'},{reason:'\u200b'},{reason:'x'.repeat(241)},{restedAt:'bad'},{restUntil:intent().restedAt}])assert.throws(()=>subject.validateEndRest({...intent(),...patch}));
 assert.deepEqual(subject.parseRestReceipt(receipt(),intent()),receipt());
 for(const patch of [{reason:'different'},{sourceBattleId:playerId},{previousRestUntil:'2026-10-29T13:00:00Z'},{endedAt:'2026-10-29T12:01:00Z'},{careRevision:null},{timeZone:'invalid'}])assert.throws(()=>subject.parseRestReceipt({...receipt(),...patch},intent()));
 assert.deepEqual(subject.parseRestResult({receipt:receipt(),condition:endedCondition()},intent()),{receipt:receipt(),condition:endedCondition()});
 assert.throws(()=>subject.parseRestResult({receipt:receipt(),condition:condition()},intent()));
});
test('projected half-hearts and expired zero-length source rest remain valid facts',()=>{
 const c=condition();c.health.hearts=0.5;assert.equal(subject.parsePetCondition(c,{playerId,generation:2}).health.hearts,0.5);
 const expired=condition();expired.dungeonRest.restUntil=expired.dungeonRest.restedAt;expired.dungeonRest.status='not_resting';expired.endRest={allowed:false,blockedReason:'not_resting'};assert.equal(subject.parsePetCondition(expired,{playerId,generation:2}).dungeonRest.status,'not_resting');
 for(const hearts of [-0.5,0.25,3.5,Infinity])assert.throws(()=>subject.parsePetCondition({...condition(),health:{...condition().health,hearts}},{playerId,generation:2}));
});
test('receipt source timestamps retain microsecond precision while accepting equivalent ISO timezone forms',()=>{
 const expected={...intent(),restedAt:'2026-10-29T08:00:00.123456Z'};
 assert.throws(()=>subject.parseRestReceipt({...receipt(),restedAt:'2026-10-29T08:00:00.123457Z'},expected));
 assert.equal(subject.parseRestReceipt({...receipt(),restedAt:'2026-10-29T16:00:00.123456+08:00'},expected).restedAt,'2026-10-29T16:00:00.123456+08:00');
});
test('condition blocker must describe the actual stage, care, active dungeon or cooldown facts',()=>{
 for(const blockedReason of ['egg','care_unavailable','not_resting','active_dungeon','source_changed'])assert.throws(()=>subject.parsePetCondition({...condition(),endRest:{allowed:false,blockedReason}},{playerId,generation:2}));
});
