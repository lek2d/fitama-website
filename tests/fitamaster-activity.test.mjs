import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortal} from '../src/fitamaster/core.mjs';
import {activityDto,playerId,otherId,expected} from './fixtures/fitamaster-activity.mjs';
const api=await import('../src/fitamaster/activity.mjs').catch(()=>({}));
const parse=(value=activityDto(),target=expected)=>{assert.equal(typeof api.parsePlayerActivity,'function');return api.parsePlayerActivity(value,target);};
const reject=(value,target=expected)=>assert.throws(()=>parse(value,target),error=>error.code==='FITAMASTER_ACTIVITY_INVALID_RESPONSE');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('request validation permits calendar weeks/months and six bounded offsets only',()=>{
 assert.equal(typeof api.validateActivityRequest,'function');
 assert.deepEqual(api.validateActivityRequest({playerId:playerId.toUpperCase(),period:'monthly',offset:5}),{playerId,period:'monthly',offset:5});
 for(const value of [{playerId:'bad'},{period:'rolling'},{offset:-1},{offset:6},{offset:'0'},{offset:0.5}])assert.throws(()=>api.validateActivityRequest({...expected,...value}));
});
test('verified calendar DTO is projected without arbitrary server properties',()=>{
 const dto=activityDto();dto.privateSource='secret';dto.summary.unrelated='secret';dto.days[0].raw='secret';
 const result=parse(dto);assert.equal(result.summary.rankingTp,300);assert.equal(result.days.length,7);
 assert.equal(result.privateSource,undefined);assert.equal(result.summary.unrelated,undefined);assert.equal(result.days[0].raw,undefined);
});
test('player, generation, rule versions and period must match the selected request',()=>{
 for(const patch of [{playerId:otherId},{generation:3},{generation:-1},{observedAt:'2026-02-30T00:00:00Z'},
  {period:{...activityDto().period,offset:1}},{period:{...activityDto().period,timeZone:'UTC'}},
  {period:{...activityDto().period,startsAt:'2026-10-25T00:00:00Z'}},{period:{...activityDto().period,inProgress:false}},
  {activity:{code:'fully_active',ruleVersion:'activity-v2'}},{coverage:{...activityDto().coverage,basis:'complete_history'}}])reject(activityDto(patch));
});
test('daily rows retain zero versus unknown reasons and reject missing, duplicate or outside days',()=>{
 const dto=activityDto();assert.equal(parse(dto).days[1].rankingTp,0);assert.equal(parse(dto).days[4].rankingTp,null);
 for(const change of [d=>d.days.pop(),d=>d.days.push({...d.days[0]}),d=>d.days[0].day='2026-10-25',d=>d.days[0].rankingTp=null,
 d=>d.days[4].rankingTp=0,d=>d.days[1].rankingTp=4,d=>d.days[0].visitDays=2,d=>d.days[0].questClaims=Number.MAX_SAFE_INTEGER+1,
 d=>d.days[4].dungeonAttacks=1,d=>d.days[0].creditStatus='future']){const d=activityDto();change(d);reject(d);}
});
test('period totals, last-observation times and engagement rule cannot contradict retained rows',()=>{
 for(const change of [d=>d.summary.rankingTp++,d=>d.summary.recordedTpDays++,d=>d.summary.highestDailyTp=100,d=>d.summary.visitDays++,
 d=>d.summary.questClaims++,d=>d.summary.lastRecordedVisitAt='2026-10-30T09:00:00Z',d=>d.activity.code='no_recorded_activity',
 d=>d.review.state='evidence_limited',d=>d.review.signals=[{code:'unknown',days:[],value:null}],d=>d.coverage.resetExcludedDays=2]){const d=activityDto();change(d);reject(d);}
});
test('month and older week windows follow Manila 04:00 across year and leap boundaries',()=>{
 const make=(observedAt,period,offset,startsAt,endsAt,dates,inProgress)=>activityDto({observedAt,period:{kind:period,offset,startsAt,endsAt,timeZone:'Asia/Manila',inProgress},activity:{code:'no_recorded_activity',ruleVersion:'activity-v1'},summary:{rankingTp:0,recordedTpDays:0,highestDailyTp:0,visitDays:0,questClaims:0,dungeonAttacks:0,lastRecordedVisitAt:null,lastRecordedActionAt:null},days:dates.map(day=>({day,rankingTp:0,creditStatus:'no_credit_record',visitDays:0,questClaims:0,dungeonAttacks:0}))});
 const feb=Array.from({length:29},(_,i)=>`2024-02-${String(i+1).padStart(2,'0')}`);
 assert.equal(parse(make('2024-03-01T20:00:00Z','monthly',1,'2024-01-31T20:00:00Z','2024-02-29T20:00:00Z',feb,false),{...expected,period:'monthly',offset:1}).days.length,29);
 const dates=['2025-12-22','2025-12-23','2025-12-24','2025-12-25','2025-12-26','2025-12-27','2025-12-28'];
 assert.equal(parse(make('2026-01-01T19:59:59Z','weekly',1,'2025-12-21T20:00:00Z','2025-12-28T20:00:00Z',dates,false),{...expected,offset:1}).period.offset,1);
});
function fixture(){
 const calls=[];let responder=async(name,args)=>({data:name==='fitamaster_player'?{profile:{id:args.p_player_id},generation:2}:activityDto()});
 const session={user:{id:playerId},expires_at:Date.now()/1000+3600};
 const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},rpc:async(name,args)=>{calls.push([name,args]);return name==='fitamaster_access_status'?{data:{allowed:true,mfaRequired:false}}:responder(name,args);}};
 return {portal:createPortal(client),calls,set responder(value){responder=value;}};
}
async function loaded(){const f=fixture();await f.portal.refresh();await f.portal.player(playerId);return f;}
test('scoped read keeps item-history state and sends only the activity request contract',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.playerActivity,'function');await f.portal.playerActivity({period:'weekly',offset:0});
 assert.equal(f.portal.state.activity.summary.rankingTp,300);assert.equal(f.portal.state.itemHistoryDays,7);
 const args=f.calls.find(([name])=>name==='fitamaster_player_activity')[1];assert.equal(args.p_player_id,playerId);assert.equal(args.p_period,'weekly');assert.equal(args.p_offset,0);
 assert.deepEqual(Object.keys(args).sort(),['p_offset','p_period','p_player_id','p_request_id']);
});
test('period, player and signout races discard old activity and errors',async()=>{
 for(const change of [async f=>{f.responder=async()=>({data:activityDto()});await f.portal.playerActivity({period:'weekly',offset:0});},f=>f.portal.player(otherId),f=>f.portal.players(),f=>f.portal.invalidate('login')]){
  const f=await loaded();assert.equal(typeof f.portal.playerActivity,'function');let resolve;
  f.responder=()=>new Promise(done=>resolve=done);const pending=f.portal.playerActivity();await tick();assert.equal(f.portal.state.activity,null);
  if(change.toString().includes('portal.player(')||change.toString().includes('portal.players('))f.responder=async(name,args)=>({data:name==='fitamaster_player'?{profile:{id:args.p_player_id},generation:2}:{players:[]}});
  await change(f);resolve({data:activityDto()});await pending;
  if(f.portal.state.selectedPlayer===playerId&&f.portal.state.phase==='ready')assert.equal(f.portal.state.activity?.playerId,playerId);else assert.equal(f.portal.state.activity,null);
  assert.equal(f.portal.state.activityError,'');
 }
});
test('invalid response becomes scoped Unknown/error and Refresh can recover',async()=>{
 const f=await loaded();assert.equal(typeof f.portal.playerActivity,'function');f.responder=async()=>({data:activityDto({playerId:otherId})});await f.portal.playerActivity();
 assert.equal(f.portal.state.activity,null);assert.match(f.portal.state.activityError,/could not be verified/i);assert.equal(f.portal.state.error,'');
 f.responder=async()=>({data:activityDto()});await f.portal.playerActivity();assert.equal(f.portal.state.activityError,'');assert.equal(f.portal.state.activity.activity.code,'fully_active');
});
test('future days cannot be accepted as recorded zero, even without activity observations',()=>{
 const dto=activityDto();dto.days[4].creditStatus='recorded';dto.days[4].rankingTp=0;dto.summary.recordedTpDays=3;reject(dto);
});
test('activity loading stays scoped while independent item history remains available',async()=>{
 const f=await loaded();let resolve;f.responder=()=>new Promise(done=>resolve=done);
 const pending=f.portal.playerActivity();await tick();assert.equal(f.portal.state.activityBusy,true);assert.equal(f.portal.state.busy,false);
 resolve({data:activityDto()});await pending;assert.equal(f.portal.state.activityBusy,false);
});
test('invalid credit is excluded with matching review evidence; negative totals never enter the UI',()=>{
 const dto=activityDto();dto.days[0].rankingTp=null;dto.days[0].creditStatus='invalid_credit';dto.summary.rankingTp=200;dto.summary.recordedTpDays=1;
 dto.review={state:'needs_review',ruleVersion:'review-v1',signals:[{code:'tp_data_needs_review',days:['2026-10-26'],value:-1}]};
 assert.equal(parse(dto).summary.rankingTp,200);
 for(const change of [d=>d.review.signals=[],d=>d.review.signals[0].value=100,d=>d.summary.rankingTp=-1,d=>d.review.signals[0].days=['2026-10-27']]){const d=structuredClone(dto);change(d);reject(d);}
});
test('positive credit without retained app evidence is amber and remains separate from engagement',()=>{
 const dto=activityDto();for(const day of dto.days)day.visitDays=day.questClaims=day.dungeonAttacks=0;
 dto.summary={...dto.summary,visitDays:0,questClaims:0,dungeonAttacks:0,lastRecordedVisitAt:null,lastRecordedActionAt:null};dto.activity.code='no_recorded_activity';
 dto.review={state:'evidence_limited',ruleVersion:'review-v1',signals:[{code:'activity_evidence_limited',days:['2026-10-26','2026-10-28'],value:300}]};
 assert.equal(parse(dto).review.state,'evidence_limited');const bad=structuredClone(dto);bad.review.signals=[];bad.review.state='no_flags';reject(bad);
});
test('reset-day credit stays unknown while post-reset own actions and independent visits remain countable',()=>{
 const dto=activityDto({resetAt:'2026-10-26T08:00:00Z'});dto.days[0].rankingTp=null;dto.days[0].creditStatus='reset_excluded';dto.summary.rankingTp=200;dto.summary.recordedTpDays=1;dto.coverage.resetExcludedDays=1;
 assert.equal(parse(dto).activity.code,'fully_active');assert.equal(parse(dto).days[0].questClaims,1);
});
test('starting a new player detail clears activity, selected period, scoped errors and reload requirements immediately',async()=>{
 const f=await loaded();await f.portal.playerActivity();let resolve;f.responder=()=>new Promise(done=>resolve=done);
 const pending=f.portal.player(otherId);await tick();assert.equal(f.portal.state.activity,null);assert.equal(f.portal.state.activityPeriod,'weekly');assert.equal(f.portal.state.activityBusy,false);
 resolve({data:{profile:{id:otherId},generation:2}});await pending;
});
test('a validated newer generation requires player reload while malformed responses remain retryable',async()=>{
 const f=await loaded();
 const malformed=activityDto({generation:3});malformed.summary.rankingTp++;
 f.responder=async()=>({data:malformed});await f.portal.playerActivity();
 assert.equal(f.portal.state.activityNeedsReload,false);assert.match(f.portal.state.activityError,/could not be verified/);
 f.responder=async()=>({data:activityDto({generation:3})});await f.portal.playerActivity();
 assert.equal(f.portal.state.activity,null);assert.equal(f.portal.state.activityNeedsReload,true);assert.match(f.portal.state.activityError,/Reload their details/);
 const reads=f.calls.length;assert.throws(()=>f.portal.playerActivity(),/Reload their details/);assert.equal(f.calls.length,reads);
 f.responder=async name=>({data:name==='fitamaster_player'?{profile:{id:playerId},generation:3}:activityDto({generation:3})});
 await f.portal.player(playerId);await f.portal.playerActivity();
 assert.equal(f.portal.state.activityNeedsReload,false);assert.equal(f.portal.state.activity.generation,3);
});
test('last observation days agree with daily records and own actions cannot precede reset',()=>{
 for(const change of [d=>d.summary.lastRecordedVisitAt='2026-10-26T09:00:00Z',d=>d.summary.lastRecordedActionAt='2026-10-26T09:00:00Z']){
  const dto=activityDto();change(dto);reject(dto);
 }
 const dto=activityDto({resetAt:'2026-10-27T10:00:00Z'});
 for(const row of dto.days.slice(0,2)){row.rankingTp=null;row.creditStatus='reset_excluded';}
 dto.summary.rankingTp=200;dto.summary.recordedTpDays=1;dto.coverage.resetExcludedDays=2;
 reject(dto);
 dto.days[0].questClaims=0;dto.summary.questClaims=0;dto.activity.code='app_active';reject(dto);
 dto.summary.lastRecordedActionAt='2026-10-27T11:00:00Z';assert.equal(parse(dto).summary.visitDays,2);
});
test('the backend reset-race error requires reload only for the current activity detail request',async()=>{
 const error={code:'P0001',message:'Activity reset changed; refresh'};
 const f=await loaded();await f.portal.playerActivity();f.responder=async()=>({error});await f.portal.playerActivity();
 assert.equal(f.portal.state.activity,null);assert.equal(f.portal.state.activityNeedsReload,true);assert.match(f.portal.state.activityError,/Reload their details/);assert.equal(f.portal.state.error,'');
 const list=await loaded();list.responder=async()=>({error});await list.portal.players();
 assert.equal(list.portal.state.activityNeedsReload,false);assert.equal(list.portal.state.activityError,'');assert.doesNotMatch(list.portal.state.error,/Reload their details/);assert.ok(list.portal.state.error);
 for(const change of [async stale=>{stale.responder=async()=>({data:activityDto()});await stale.portal.playerActivity();},async stale=>{stale.responder=async(name,args)=>({data:{profile:{id:args.p_player_id},generation:2}});await stale.portal.player(otherId);},stale=>stale.portal.invalidate('login')]){
  const stale=await loaded();let resolve;stale.responder=()=>new Promise(done=>resolve=done);
  const pending=stale.portal.playerActivity();await tick();await change(stale);resolve({error});await pending;
  assert.equal(stale.portal.state.activityNeedsReload,false);assert.equal(stale.portal.state.activityError,'');assert.equal(stale.portal.state.error,'');
 }
});
