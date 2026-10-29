export const playerId='11111111-1111-4111-8111-111111111111';
export const otherId='22222222-2222-4222-8222-222222222222';
export const expected={playerId,generation:2,period:'weekly',offset:0};
export function activityDto(patch={}){
 return {playerId,generation:2,resetAt:null,observedAt:'2026-10-29T09:00:00Z',
  period:{kind:'weekly',offset:0,startsAt:'2026-10-25T20:00:00Z',endsAt:'2026-11-01T20:00:00Z',timeZone:'Asia/Manila',inProgress:true},
  activity:{code:'fully_active',ruleVersion:'activity-v1'},review:{state:'no_flags',ruleVersion:'review-v1',signals:[]},
  summary:{rankingTp:300,recordedTpDays:2,highestDailyTp:200,visitDays:2,questClaims:1,dungeonAttacks:1,lastRecordedVisitAt:'2026-10-28T09:00:00Z',lastRecordedActionAt:'2026-10-27T09:00:00Z'},
  days:[['2026-10-26',100,'recorded',1,1,0],['2026-10-27',0,'no_credit_record',0,0,1],['2026-10-28',200,'recorded',1,0,0],['2026-10-29',0,'no_credit_record',0,0,0],['2026-10-30',null,'future',0,0,0],['2026-10-31',null,'future',0,0,0],['2026-11-01',null,'future',0,0,0]].map(([day,rankingTp,creditStatus,visitDays,questClaims,dungeonAttacks])=>({day,rankingTp,creditStatus,visitDays,questClaims,dungeonAttacks})),
  coverage:{basis:'retained_records',questScope:'recorded_claims_excludes_legacy_mumu',resetExcludedDays:0,createdDuringPeriod:false},...patch};
}
