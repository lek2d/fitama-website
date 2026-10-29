const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const count=value=>Number.isSafeInteger(value)&&value>=0;
const uuid=value=>typeof value==='string'&&UUID.test(value);
const blocked=new Set(['egg','care_unavailable','not_resting','active_dungeon','source_changed']);
function instant(value){
 if(typeof value!=='string')throw new Error('Invalid timestamp');
 const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!parts)throw new Error('Invalid timestamp');
 const [year,month,day,hour,minute,second]=parts.slice(1,7).map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
 if(year<1||month<1||month>12||day<1||day>[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1]||hour>23||minute>59||second>59||parts[7]!=='Z'&&(Number(parts[7].slice(1,3))>23||Number(parts[7].slice(4))>59))throw new Error('Invalid timestamp');
 const result=Date.parse(value);if(!Number.isFinite(result))throw new Error('Invalid timestamp');return result;
}
function instantMicros(value){return BigInt(instant(value))*1000n+BigInt((/\.(\d{1,6})/.exec(value)?.[1]||'').padEnd(6,'0').slice(3));}
function zone(value){if(typeof value!=='string'||!value||value.length>100)throw new Error('Invalid timezone');new Intl.DateTimeFormat('en',{timeZone:value});return value;}
const invalid=()=>Object.assign(new Error('Pet condition could not be verified. Refresh condition to try again.'),{code:'FITAMASTER_CONDITION_INVALID_RESPONSE'});
export function parsePetCondition(value,expected){
 try{
  if(!object(value)||value.schemaVersion!==1||!uuid(value.playerId)||value.playerId!==expected.playerId||!count(value.generation)||value.generation!==expected.generation)throw invalid();
  const observed=instant(value.observedAt),health=value.health,rest=value.dungeonRest,daily=value.dailyEntries,end=value.endRest,active=value.activeDungeon;
  if(!['egg','hatched'].includes(value.petStage)||value.careRevision!==null&&!count(value.careRevision)||!object(health)||typeof health.available!=='boolean'||!object(rest)||!object(daily)||!object(end))throw invalid();
  if(health.available?!(Number.isFinite(health.hearts)&&health.hearts>=0&&health.hearts<=3&&Number.isInteger(health.hearts*2)):health.hearts!==null||health.nextHeartAt!==null)throw invalid();
  if(health.nextHeartAt!==null&&instant(health.nextHeartAt)<=observed)throw invalid();
  if(!['resting','not_resting','unknown'].includes(rest.status)||rest.sourceBattleId!==null&&!uuid(rest.sourceBattleId)||rest.sourceStatus!==null&&!['cleared','lost'].includes(rest.sourceStatus))throw invalid();
  const start=rest.restedAt===null?null:instant(rest.restedAt),until=rest.restUntil===null?null:instant(rest.restUntil);
  if(rest.timeZone!==null)zone(rest.timeZone);
  if(start!==null&&start>observed||start!==null&&until!==null&&until<start)throw invalid();
  if(rest.status==='resting'&&(!uuid(rest.sourceBattleId)||start===null||until===null||until<=observed||rest.timeZone===null||rest.sourceStatus===null))throw invalid();
  if(active!==null&&(!object(active)||!uuid(active.battleId)||active.status!=='active'))throw invalid();
  if(!count(daily.used)||daily.limit!==2||instant(daily.dayStartedAt)>observed||instant(daily.resetsAt)<=observed)throw invalid();zone(daily.timeZone);
  if(typeof end.allowed!=='boolean'||(end.allowed?end.blockedReason!==null:!blocked.has(end.blockedReason)))throw invalid();
  if(end.allowed&&(value.petStage!=='hatched'||!health.available||value.careRevision===null||rest.status!=='resting'||active!==null))throw invalid();
  const expectedBlocked=value.petStage==='egg'?'egg':!health.available||value.careRevision===null?'care_unavailable':active!==null?'active_dungeon':rest.status==='unknown'?'source_changed':rest.status!=='resting'?'not_resting':null;
  if(end.allowed!==(expectedBlocked===null)||end.blockedReason!==expectedBlocked)throw invalid();
  return {schemaVersion:1,playerId:value.playerId,generation:value.generation,observedAt:value.observedAt,petStage:value.petStage,careRevision:value.careRevision,
   health:{available:health.available,hearts:health.hearts,nextHeartAt:health.nextHeartAt},
   dungeonRest:{status:rest.status,sourceBattleId:rest.sourceBattleId,restedAt:rest.restedAt,restUntil:rest.restUntil,timeZone:rest.timeZone,sourceStatus:rest.sourceStatus},
   activeDungeon:active===null?null:{battleId:active.battleId,status:'active'},
   dailyEntries:{used:daily.used,limit:2,dayStartedAt:daily.dayStartedAt,resetsAt:daily.resetsAt,timeZone:daily.timeZone},endRest:{allowed:end.allowed,blockedReason:end.blockedReason}};
 }catch{throw invalid();}
}
export function validateEndRest(input){
 if(!object(input)||!uuid(input.playerId)||!uuid(input.requestId)||!uuid(input.sourceBattleId)||!count(input.generation))throw new Error('Reload player details and review dungeon rest again.');
 if(instant(input.restUntil)<=instant(input.restedAt))throw new Error('Reload the current dungeon rest before reviewing.');
 if(typeof input.reason!=='string'||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(input.reason))throw new Error('Use a single-line reason without control characters.');
 const reason=input.reason.trim();if([...reason].length<1||[...reason].length>240)throw new Error('Enter a reason of 1–240 characters.');
 return {requestId:input.requestId,playerId:input.playerId,generation:input.generation,sourceBattleId:input.sourceBattleId,restedAt:input.restedAt,restUntil:input.restUntil,reason};
}
export function parseRestReceipt(value,expected){
 try{
  if(!object(value)||!uuid(value.requestId)||!uuid(value.playerId)||!uuid(value.sourceBattleId)||!count(value.generation)||!count(value.careRevision))throw invalid();
  const intent=validateEndRest({...value,restUntil:value.previousRestUntil});
  if(intent.reason!==value.reason||instant(value.endedAt)<instant(value.restedAt)||instant(value.endedAt)>=instant(value.previousRestUntil))throw invalid();zone(value.timeZone);
  if(expected){for(const key of ['requestId','playerId','generation','sourceBattleId','reason'])if(value[key]!==expected[key])throw invalid();if(instantMicros(value.restedAt)!==instantMicros(expected.restedAt)||instantMicros(value.previousRestUntil)!==instantMicros(expected.restUntil))throw invalid();}
  return {requestId:value.requestId,playerId:value.playerId,generation:value.generation,sourceBattleId:value.sourceBattleId,restedAt:value.restedAt,previousRestUntil:value.previousRestUntil,timeZone:value.timeZone,endedAt:value.endedAt,reason:value.reason,careRevision:value.careRevision};
 }catch{throw Object.assign(new Error('Rest clearance could not be confirmed. Check clearance status before trying again.'),{code:'FITAMASTER_REST_INVALID_RESPONSE'});}
}
export function parseRestResult(value,expected){
 const receipt=parseRestReceipt(value?.receipt,expected);
 const condition=parsePetCondition(value.condition,expected);
 if(condition&&(condition.careRevision!==receipt.careRevision||condition.dungeonRest.status!=='not_resting'||condition.endRest.allowed))throw invalid();
 return {receipt,condition};
}
export function sameRest(condition,intent){return condition?.playerId===intent?.playerId&&condition?.generation===intent?.generation&&condition?.dungeonRest?.sourceBattleId===intent?.sourceBattleId&&condition.dungeonRest.restedAt===intent.restedAt&&condition.dungeonRest.restUntil===intent.restUntil;}

/** Offer a fresh review only after a different, currently verified rest replaces the receipted one. */
export function hasNewRest(condition,receipt,now=Date.now()){
 if(!condition?.endRest.allowed||condition.playerId!==receipt?.playerId||condition.generation!==receipt?.generation||Date.parse(condition.dungeonRest?.restUntil)<=now)return false;
 const rest=condition.dungeonRest;
 try{return instantMicros(condition.observedAt)>=instantMicros(receipt.endedAt)&&(rest.sourceBattleId!==receipt.sourceBattleId||instantMicros(rest.restedAt)!==instantMicros(receipt.restedAt)||instantMicros(rest.restUntil)!==instantMicros(receipt.previousRestUntil));}catch{return false;}
}
