const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const count=value=>Number.isSafeInteger(value)&&value>=0;
const dayMs=86400000,gameShift=4*3600000;
const activityCodes=new Set(['fully_active','app_active','no_recorded_activity','unknown']);
const reviewStates=new Set(['needs_review','evidence_limited','no_flags']);
const creditStatuses=new Set(['recorded','no_credit_record','before_creation','reset_excluded','future','invalid_credit']);
const summaryKeys=['rankingTp','recordedTpDays','highestDailyTp','visitDays','questClaims','dungeonAttacks','lastRecordedVisitAt','lastRecordedActionAt'];
const date=value=>new Date(value).toISOString().slice(0,10);
function instant(value){
 if(typeof value!=='string')throw new Error('Invalid timestamp');
 const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!parts)throw new Error('Invalid timestamp');
 const [year,month,day,hour,minute,second]=parts.slice(1,7).map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
 if(year<1||month<1||month>12||day<1||day>[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1]||hour>23||minute>59||second>59||parts[7]!=='Z'&&(Number(parts[7].slice(1,3))>23||Number(parts[7].slice(4))>59))throw new Error('Invalid timestamp');
 const result=Date.parse(value);if(!Number.isFinite(result))throw new Error('Invalid timestamp');return result;
}
function periodBounds(observed,kind,offset){
 const shifted=new Date(observed+gameShift);shifted.setUTCHours(0,0,0,0);
 if(kind==='weekly'){shifted.setUTCDate(shifted.getUTCDate()-(shifted.getUTCDay()+6)%7-offset*7);return [+shifted-gameShift,+shifted-gameShift+7*dayMs];}
 shifted.setUTCDate(1);shifted.setUTCMonth(shifted.getUTCMonth()-offset);const start=+shifted-gameShift;shifted.setUTCMonth(shifted.getUTCMonth()+1);return [start,+shifted-gameShift];
}
export function validateActivityRequest(input){
 if(!object(input)||!UUID.test(input.playerId||'')||!['weekly','monthly'].includes(input.period)||!Number.isInteger(input.offset)||input.offset<0||input.offset>5)throw new Error('Reload player details and choose a calendar week or month.');
 return {playerId:input.playerId.toLowerCase(),period:input.period,offset:input.offset};
}
export function parsePlayerActivity(value,expected){
 try{
  const target=validateActivityRequest(expected);
  if(!object(value)||value.playerId!==target.playerId||!count(value.generation)||expected.generation!==undefined&&value.generation!==expected.generation)throw new Error('Activity target changed');
  const observed=instant(value.observedAt),reset=value.resetAt===null?null:instant(value.resetAt),period=value.period;
  if(reset!==null&&reset>observed||!object(period)||period.kind!==target.period||period.offset!==target.offset||period.timeZone!=='Asia/Manila')throw new Error('Invalid activity period');
  const [start,end]=periodBounds(observed,target.period,target.offset);
  if(instant(period.startsAt)!==start||instant(period.endsAt)!==end||period.inProgress!==(observed<end))throw new Error('Invalid activity bounds');
  if(!object(value.activity)||!activityCodes.has(value.activity.code)||value.activity.ruleVersion!=='activity-v1'||!object(value.review)||!reviewStates.has(value.review.state)||value.review.ruleVersion!=='review-v1')throw new Error('Invalid rules');
  const coverage=value.coverage;
  if(!object(coverage)||coverage.basis!=='retained_records'||coverage.questScope!=='recorded_claims_excludes_legacy_mumu'||!count(coverage.resetExcludedDays)||typeof coverage.createdDuringPeriod!=='boolean')throw new Error('Invalid coverage');
  if(!Array.isArray(value.days)||value.days.length!==(end-start)/dayMs)throw new Error('Invalid daily rows');
  const today=date(observed+gameShift),resetDay=reset===null?null:date(reset+gameShift);
  const totals={rankingTp:0,recordedTpDays:0,highestDailyTp:null,visitDays:0,questClaims:0,dungeonAttacks:0};let resetDays=0;
  const days=value.days.map((row,index)=>{
   const day=date(start+gameShift+index*dayMs);
   if(!object(row)||row.day!==day||!creditStatuses.has(row.creditStatus)||!count(row.visitDays)||row.visitDays>1||!count(row.questClaims)||!count(row.dungeonAttacks))throw new Error('Invalid daily values');
   const included=['recorded','no_credit_record'].includes(row.creditStatus),future=day>today;
   if(future!==(row.creditStatus==='future')||(included?!count(row.rankingTp):row.rankingTp!==null))throw new Error('Invalid credit availability');
   if(row.creditStatus==='no_credit_record'&&row.rankingTp!==0||row.creditStatus==='recorded'&&row.rankingTp>1675)throw new Error('Invalid daily credit');
   if(row.creditStatus==='reset_excluded'){
    if(resetDay===null||day>resetDay)throw new Error('Invalid reset exclusion');resetDays++;
   }else if(resetDay!==null&&day<=resetDay&&!['future','before_creation'].includes(row.creditStatus))throw new Error('Missing reset exclusion');
   if(['future','before_creation'].includes(row.creditStatus)&&(row.visitDays||row.questClaims||row.dungeonAttacks))throw new Error('Invalid excluded actions');
   if(resetDay!==null&&day<resetDay&&(row.questClaims||row.dungeonAttacks))throw new Error('Actions precede reset');
   if(included){totals.rankingTp+=row.rankingTp;totals.highestDailyTp=Math.max(totals.highestDailyTp??0,row.rankingTp);if(row.creditStatus==='recorded')totals.recordedTpDays++;}
   for(const key of ['visitDays','questClaims','dungeonAttacks'])totals[key]+=row[key];
   return {day,rankingTp:row.rankingTp,creditStatus:row.creditStatus,visitDays:row.visitDays,questClaims:row.questClaims,dungeonAttacks:row.dungeonAttacks};
  });
  const summary=value.summary;
  if(!object(summary)||resetDays!==coverage.resetExcludedDays)throw new Error('Invalid summary');
  for(const [key,total]of Object.entries(totals))if((total!==null&&!count(total))||summary[key]!==total)throw new Error('Inconsistent daily totals');
  for(const key of ['lastRecordedVisitAt','lastRecordedActionAt']){
   const at=summary[key]===null?null:instant(summary[key]);
   if(at!==null&&(at<start||at>=end||at>observed))throw new Error('Invalid last observation');
   if((key==='lastRecordedVisitAt'?totals.visitDays:totals.questClaims+totals.dungeonAttacks)>0?at===null:at!==null)throw new Error('Missing last observation');
   if(at!==null){
    const latestDay=days.filter(row=>key==='lastRecordedVisitAt'?row.visitDays>0:row.questClaims+row.dungeonAttacks>0).at(-1)?.day;
    if(date(at+gameShift)!==latestDay||key==='lastRecordedActionAt'&&reset!==null&&at<reset)throw new Error('Inconsistent last observation');
   }
  }
  const code=totals.questClaims>0&&totals.dungeonAttacks>0?'fully_active':totals.visitDays+totals.questClaims+totals.dungeonAttacks>0?'app_active':'no_recorded_activity';
  if(value.activity.code!=='unknown'&&value.activity.code!==code)throw new Error('Inconsistent activity rule');
  if(!Array.isArray(value.review.signals)||value.review.signals.length>32)throw new Error('Invalid review signals');
  const invalidDays=new Set(days.filter(row=>row.creditStatus==='invalid_credit').map(row=>row.day));
  const positiveDays=days.filter(row=>row.rankingTp>0).map(row=>row.day),limited=totals.rankingTp>0&&code==='no_recorded_activity';let amber=false;
  const signals=value.review.signals.map(signal=>{
   if(!object(signal)||!Array.isArray(signal.days)||signal.days.some(day=>typeof day!=='string')||new Set(signal.days).size!==signal.days.length)throw new Error('Invalid signal days');
   if(signal.code==='tp_data_needs_review'){
    if(signal.days.length!==1||!invalidDays.delete(signal.days[0])||!Number.isSafeInteger(signal.value)||signal.value>=0&&signal.value<=1675)throw new Error('Invalid credit signal');
   }else if(signal.code==='activity_evidence_limited'){
    if(amber||!limited||signal.value!==totals.rankingTp||JSON.stringify(signal.days)!==JSON.stringify(positiveDays))throw new Error('Invalid evidence signal');amber=true;
   }else throw new Error('Invalid signal');
   return {code:signal.code,days:[...signal.days],value:signal.value};
  });
  const reviewState=signals.some(signal=>signal.code==='tp_data_needs_review')?'needs_review':amber?'evidence_limited':'no_flags';
  if(invalidDays.size||amber!==limited||value.review.state!==reviewState)throw new Error('Inconsistent review rule');
  return {playerId:value.playerId,generation:value.generation,resetAt:value.resetAt,observedAt:value.observedAt,
   period:{kind:period.kind,offset:period.offset,startsAt:period.startsAt,endsAt:period.endsAt,timeZone:period.timeZone,inProgress:period.inProgress},
   activity:{code:value.activity.code,ruleVersion:value.activity.ruleVersion},review:{state:reviewState,ruleVersion:value.review.ruleVersion,signals},
   summary:Object.fromEntries(summaryKeys.map(key=>[key,summary[key]])),days,
   coverage:{basis:coverage.basis,questScope:coverage.questScope,resetExcludedDays:coverage.resetExcludedDays,createdDuringPeriod:coverage.createdDuringPeriod}};
 }catch{const error=new Error('Activity and TP could not be verified. Refresh activity to try again.');error.code='FITAMASTER_ACTIVITY_INVALID_RESPONSE';throw error;}
}
export const activityLabels={fully_active:'Fully active',app_active:'App active',no_recorded_activity:'No recorded activity',unknown:'Unknown'};
export const reviewLabels={needs_review:'TP data needs review',evidence_limited:'Activity evidence limited',no_flags:'No configured flags'};
export function playerActivityPeriod(data){
 try{
  const period=data?.activityPeriod,[start,end]=periodBounds(instant(data?.observedAt),'weekly',0);
  if(!object(period)||instant(period.startsAt)!==start||instant(period.endsAt)!==end||period.timeZone!=='Asia/Manila')return null;
  return {startsAt:period.startsAt,endsAt:period.endsAt,timeZone:period.timeZone};
 }catch{return null;}
}
export function playerActivitySummary(player,data){
 const unknown={activity:'Unknown',review:'Not assessed'};
 try{
  const summary=player?.activitySummary;
  if(!object(summary)||!playerActivityPeriod(data)||!activityCodes.has(summary.code)||!reviewStates.has(summary.reviewState)||!['rankingTp','visitDays','questClaims','dungeonAttacks'].every(key=>count(summary[key])))return unknown;
  const code=summary.questClaims&&summary.dungeonAttacks?'fully_active':summary.visitDays+summary.questClaims+summary.dungeonAttacks?'app_active':'no_recorded_activity';
  if(summary.code==='unknown')return unknown;
  if(summary.code!==code||summary.reviewState==='evidence_limited'&&!(summary.rankingTp>0&&code==='no_recorded_activity')||summary.reviewState==='no_flags'&&summary.rankingTp>0&&code==='no_recorded_activity')return unknown;
  return {activity:activityLabels[summary.code],review:reviewLabels[summary.reviewState],reviewState:summary.reviewState};
 }catch{return unknown;}
}
