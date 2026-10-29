const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kinds=new Set(['consumed','opened','used','gift_sent','gift_claimed','gift_incoming']);
const statuses=new Set(['pending','received','invalidated']);
const cursorKeys=['version','playerId','generation','days','anchorAt','beforeAt','beforeId'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const generation=value=>Number.isSafeInteger(value)&&value>=0;
const positive=value=>Number.isSafeInteger(value)&&value>0;
const eventId=value=>typeof value==='string'&&/^[a-z0-9:._-]{1,180}$/.test(value);
const itemId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]{0,119}$/.test(value);
const dayMicros=86400000000n;

// Date.parse truncates microseconds. Retain PostgreSQL's precision at window/cursor boundaries.
function instant(value){
  if(typeof value!=='string')throw new Error('Invalid timestamp');
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match)throw new Error('Invalid timestamp');
  const [year,month,day,hour,minute,second]=match.slice(1,7).map(Number);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59)throw new Error('Invalid timestamp');
  if(match[8]!=='Z'&&(Number(match[8].slice(1,3))>23||Number(match[8].slice(4))>59))throw new Error('Invalid timestamp');
  const millis=Date.parse(value);
  if(!Number.isFinite(millis))throw new Error('Invalid timestamp');
  return BigInt(millis)*1000n+BigInt((match[7]||'').padEnd(6,'0').slice(3));
}
const nullableInstant=value=>value===null?null:instant(value);
function cursor(value,target){
  if(!object(value)||Object.keys(value).length!==cursorKeys.length||cursorKeys.some(key=>!Object.hasOwn(value,key)))throw new Error('Invalid cursor');
  if(value.version!==1||value.playerId!==target.playerId||value.generation!==target.generation||value.days!==target.days||!eventId(value.beforeId))throw new Error('Invalid cursor');
  const anchor=instant(value.anchorAt),before=instant(value.beforeAt);
  if(before>=anchor||before<anchor-BigInt(target.days)*dayMicros)throw new Error('Invalid cursor');
  return Object.fromEntries(cursorKeys.map(key=>[key,value[key]]));
}
export function validateItemHistoryRequest(input){
  if(!object(input)||!UUID.test(input.playerId||'')||!generation(input.generation)||![7,30].includes(input.days)||!Number.isInteger(input.limit)||input.limit<1||input.limit>50)throw new Error('Reload the player details and choose a 7- or 30-day history period.');
  const result={playerId:input.playerId.toLowerCase(),generation:input.generation,days:input.days,after:null,limit:input.limit};
  if(input.after!==null)result.after=cursor(input.after,result);
  return result;
}
function group(row){
  if(!object(row)||!kinds.has(row.kind)||!itemId(row.itemId)||!positive(row.quantity))throw new Error('Invalid item group');
  const gift=row.kind.startsWith('gift_');
  if(gift?!statuses.has(row.status):row.status!==null)throw new Error('Invalid item status');
  if(row.kind==='gift_claimed'&&row.status!=='received'||row.kind==='gift_incoming'&&row.status==='received')throw new Error('Invalid gift status');
  return {kind:row.kind,itemId:row.itemId,status:row.status,quantity:row.quantity};
}
const groupKey=row=>JSON.stringify([row.kind,row.itemId,row.status]);
function peer(value){
  if(!object(value)||(value.playerId!==null&&!UUID.test(value.playerId||''))||!['at_send','current_profile','unavailable'].includes(value.nameSource))throw new Error('Invalid counterparty');
  if(value.username!==null&&(typeof value.username!=='string'||[...value.username].length>80))throw new Error('Invalid counterparty name');
  if(value.nameSource==='unavailable'&&value.username!==null)throw new Error('Invalid counterparty provenance');
  return {playerId:value.playerId,username:value.username,nameSource:value.nameSource};
}
export function parseItemHistory(value,expected){
  try{
    const target=validateItemHistoryRequest(expected);
    if(!object(value)||value.playerId!==target.playerId||value.generation!==target.generation||value.days!==target.days)throw new Error('Invalid history target');
    const from=instant(value.from),to=instant(value.to);
    if(to-from!==BigInt(target.days)*dayMicros||instant(value.observedAt)!==to||target.after&&instant(target.after.anchorAt)!==to)throw new Error('Invalid history window');
    const resetAt=nullableInstant(value.resetAt),coverage=value.coverage;
    if(!object(coverage)||coverage.basis!=='retained_server_records'||typeof coverage.undatedMagicUses!=='boolean'||typeof coverage.resetWithinWindow!=='boolean'||coverage.resetWithinWindow!==(resetAt!==null&&resetAt>=from&&resetAt<to))throw new Error('Invalid history coverage');
    if(!Array.isArray(value.summary)||value.summary.length>256||!Array.isArray(value.events)||value.events.length>target.limit)throw new Error('Invalid history rows');
    const summaryMap=new Map();
    const summary=value.summary.map(row=>{
      const result=group(row);
      if(!positive(row.eventCount)||result.quantity<row.eventCount||!result.kind.startsWith('gift_')&&result.quantity!==row.eventCount||summaryMap.has(groupKey(result)))throw new Error('Invalid history totals');
      result.eventCount=row.eventCount;summaryMap.set(groupKey(result),result);return result;
    });
    const seen=new Set(),visible=new Map();
    const events=value.events.map(row=>{
      const result=group(row),at=instant(row.recordedAt);
      if(!eventId(row.eventId)||seen.has(row.eventId)||!generation(row.generation)||at<from||at>=to)throw new Error('Invalid history event');
      // The RPC uses COLLATE C for its ASCII IDs, so the tuple boundary is exact here too.
      if(target.after){const before=instant(target.after.beforeAt);if(at>before||at===before&&row.eventId>=target.after.beforeId)throw new Error('History page replayed an earlier row');}
      seen.add(row.eventId);
      const sent=nullableInstant(row.sentAt),received=nullableInstant(row.receivedAt);
      const gift=result.kind.startsWith('gift_');
      if(!gift&&(result.quantity!==1||row.peer!==null||sent!==null||received!==null))throw new Error('Invalid item use');
      if(gift){
        if(sent===null||received!==null&&received<sent||result.status==='received'&&received===null||result.status!=='received'&&received!==null)throw new Error('Invalid gift times');
        if(at!==(result.kind==='gift_claimed'?received:sent))throw new Error('Invalid gift event time');
      }
      const key=groupKey(result),total=visible.get(key)||{quantity:0,eventCount:0};
      total.quantity+=result.quantity;total.eventCount++;visible.set(key,total);
      const counterparty=gift?peer(row.peer):null;
      if(gift&&(result.kind==='gift_sent'?counterparty.nameSource==='at_send':counterparty.nameSource==='current_profile'))throw new Error('Invalid counterparty provenance');
      return {eventId:row.eventId,...result,generation:row.generation,recordedAt:row.recordedAt,sentAt:row.sentAt,receivedAt:row.receivedAt,peer:counterparty};
    });
    for(let i=1;i<events.length;i++){
      const previous=events[i-1],current=events[i],before=instant(previous.recordedAt),at=instant(current.recordedAt);
      if(at>before||at===before&&current.eventId>=previous.eventId)throw new Error('History events are not newest first');
    }
    for(const [key,total]of visible){const full=summaryMap.get(key);if(!full||full.quantity<total.quantity||full.eventCount<total.eventCount)throw new Error('History totals omit visible events');}
    let nextCursor=null;
    if(value.nextCursor!==null){
      nextCursor=cursor(value.nextCursor,target);const last=events.at(-1);
      if(!last||instant(nextCursor.anchorAt)!==to||instant(nextCursor.beforeAt)!==instant(last.recordedAt)||nextCursor.beforeId!==last.eventId)throw new Error('Invalid next history page');
    }
    return {playerId:value.playerId,generation:value.generation,days:value.days,from:value.from,to:value.to,observedAt:value.observedAt,resetAt:value.resetAt,
      coverage:{basis:coverage.basis,undatedMagicUses:coverage.undatedMagicUses,resetWithinWindow:coverage.resetWithinWindow},summary,events,nextCursor};
  }catch{
    const error=new Error('Item history could not be verified. Refresh history to try again.');error.code='FITAMASTER_HISTORY_INVALID_RESPONSE';throw error;
  }
}
