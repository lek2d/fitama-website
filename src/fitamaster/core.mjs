import {parsePetCondition,validateEndRest,parseRestReceipt,parseRestResult} from './condition.mjs';
import {GRANTABLE_ITEMS} from './grant-catalog.mjs';
import {validateItemHistoryRequest,parseItemHistory} from './item-history.mjs';
import {validateActivityRequest,parsePlayerActivity} from './activity.mjs';
export const SUPABASE_ORIGIN='https://ormclcexntojipbyrlnh.supabase.co';
export const AUTH_STORAGE_KEY='fitamaster-auth';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseAuthCallback(location){
  const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash?.replace(/^#/,''));
  const keys=['code','error','error_code','error_description','access_token','refresh_token','token_type','token_hash','expires_in','expires_at','provider_token','provider_refresh_token','type','sb_flow_id','sb'];
  const queryKeys=[...query.keys()].map(key=>key.toLowerCase()),hashKeys=[...hash.keys()].map(key=>key.toLowerCase());
  const hasCallback=queryKeys.some(key=>keys.includes(key))||hashKeys.some(key=>keys.includes(key));
  const codes=query.getAll('code');
  const bounded=(location.search?.length||0)+(location.hash?.length||0)<=24576;
  const legacyCode=bounded&&!hashKeys.some(key=>keys.includes(key))&&!queryKeys.some(key=>keys.includes(key)&&key!=='code')&&codes.length===1&&/^[A-Za-z0-9_-]{1,1024}$/.test(codes[0]);
  // Supabase Auth's AsRedirectURL includes a single empty sb identifier.
  const allowedFragment=['access_token','refresh_token','token_type','type','expires_in','expires_at','sb'];
  const access=hash.get('access_token'),refresh=hash.get('refresh_token');
  const emailSession=bounded&&!queryKeys.some(key=>keys.includes(key))&&[...hash.keys()].every(key=>allowedFragment.includes(key)&&hash.getAll(key).length===1)&&(!hash.has('sb')||hash.get('sb')==='')&&hash.get('type')==='magiclink'&&hash.get('token_type')==='bearer'&&/^[A-Za-z0-9._-]{1,16384}$/.test(access||'')&&/^[A-Za-z0-9_-]{1,4096}$/.test(refresh||'')&&['expires_in','expires_at'].every(key=>!hash.has(key)||/^[0-9]{1,10}$/.test(hash.get(key)));
  return {hasCallback,code:legacyCode?codes[0]:null,session:emailSession?{access_token:access,refresh_token:refresh}:null,failed:hasCallback&&!legacyCode&&!emailSession,cleanUrl:location.origin+location.pathname};
}
export function sessionIdentity(session){
  try{const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return session.user?.id&&typeof claims.session_id==='string'?JSON.stringify([session.user.id,claims.session_id]):null;}catch{return null;}
}
export function validateConfig(config) {
  if(config?.url!==SUPABASE_ORIGIN || typeof config.key!=='string' || !config.key) throw new Error('Portal configuration is incomplete.');
  if(config.key.startsWith('sb_publishable_')) return config;
  try {const claims=JSON.parse(atob(config.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.role==='anon')return config;} catch {}
  throw new Error('Only a public Supabase key is permitted.');
}
export function createSessionStorage(storage) {
  return {getItem:key=>storage.getItem(key),setItem:(key,value)=>storage.setItem(key,value),removeItem:key=>storage.removeItem(key),clear(){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(AUTH_STORAGE_KEY))storage.removeItem(key);}}};
}
export function clearAuthForPhase(storage,phase){
  // Retain a verifier only for an older PKCE link still pending in this tab.
  if(phase==='login')storage.removeItem(AUTH_STORAGE_KEY);
  if(phase==='denied')storage.clear();
}
export function publicError(error) {
  const code=String(error?.code||''); const message=String(error?.message||'');
  if(code==='FITAMASTER_ACTIVITY_INVALID_RESPONSE')return 'Activity and TP could not be verified. Refresh activity to try again.';
  if(message==='FITAMASTER_ACTIVITY_TARGET_CHANGED')return 'This player’s progress changed. Reload their details.';
  if(message==='FITAMASTER_ACTIVITY_INVALID_ARGUMENT')return 'Choose a calendar week or month and one of the six available periods.';
  if(code==='FITAMASTER_HISTORY_INVALID_RESPONSE')return 'Item history could not be verified. Refresh history to try again.';
  if(message==='FITAMASTER_HISTORY_INVALID_CURSOR')return 'The history page expired or changed. Refresh history.';
  if(message==='FITAMASTER_HISTORY_TARGET_CHANGED')return 'This player’s progress changed. Reload their details.';
  if(message==='FITAMASTER_HISTORY_INVALID_ARGUMENT')return 'Reload the player details and choose a 7- or 30-day history period.';
  if(message==='FITAMASTER_GRANT_ALREADY_ENABLED')return 'Magic Potion test access is already unlocked for this account.';
  const restMessages={FITAMASTER_REST_TARGET_CHANGED:'The player changed or reset. Reload their details and review again.',FITAMASTER_REST_SOURCE_CHANGED:'Dungeon rest changed. Refresh condition and review again.',FITAMASTER_REST_NOT_RESTING:'Dungeon rest ended or expired. Refresh condition.',FITAMASTER_REST_ACTIVE_DUNGEON:'This player has an active or unresolved dungeon. End rest is unavailable.',FITAMASTER_REST_CARE_UNAVAILABLE:'Ask this player to open and sync Fitama before reviewing dungeon rest.',FITAMASTER_REST_EGG:'Eggs do not have dungeon rest to end.',FITAMASTER_REST_BUSY:'The player is busy. Check clearance status before retrying.',FITAMASTER_REST_REQUEST_CONFLICT:'This clearance differs from an earlier request. Check admin history before starting another.',FITAMASTER_REST_DISABLED:'Ending dungeon rest is temporarily unavailable.',FITAMASTER_REST_INVALID_REASON:'Enter a single-line reason of 1–240 characters.'};
  if(Object.hasOwn(restMessages,message))return restMessages[message];
  const restRefusal=/^FITAMASTER_REST_NOT_ALLOWED: (egg|care_unavailable|active_dungeon|source_changed|not_resting)$/.exec(message);
  if(restRefusal){const key={egg:'EGG',care_unavailable:'CARE_UNAVAILABLE',active_dungeon:'ACTIVE_DUNGEON',source_changed:'SOURCE_CHANGED',not_resting:'NOT_RESTING'}[restRefusal[1]];return restMessages['FITAMASTER_REST_'+key];}
  if(message==='FITAMASTER_REST_OVERFLOW')return 'This care record needs review before ending rest.';
  if(code==='FITAMASTER_CONDITION_INVALID_RESPONSE'||code==='FITAMASTER_REST_INVALID_RESPONSE')return message;
  const grantMessages={FITAMASTER_GRANT_INVENTORY_UNAVAILABLE:'Ask this player to open and sync Fitama before adding this item.',FITAMASTER_GRANT_TARGET_CHANGED:'The player changed or reset. Reload their details and review again.',FITAMASTER_GRANT_BUSY:'The player inventory is busy. Check delivery status before retrying.',FITAMASTER_GRANT_OVERFLOW:'This item would exceed the inventory limit.',FITAMASTER_GRANT_REQUEST_CONFLICT:'This send differs from an earlier request. Check admin history before starting another.',FITAMASTER_GRANT_BALANCE_REVIEW:'This box balance needs review before adding this item.',FITAMASTER_GRANT_DISABLED:'Item additions are temporarily unavailable.',FITAMASTER_GRANT_INVALID_ITEM:'Choose an available item.',FITAMASTER_GRANT_INVALID_QUANTITY:'Check the item quantity.',FITAMASTER_GRANT_INVALID_REASON:'Enter a single-line reason of 1–240 characters.'};
  if(Object.hasOwn(grantMessages,message))return grantMessages[message];
  if(code==='over_email_send_rate_limit')return 'Email sign-in is temporarily limited. Check your inbox for the newest unused link, or wait before requesting another.';
  if(code==='over_request_rate_limit'||code==='429'||error?.status===429||/rate.limit/i.test(message))return 'Too many requests. Wait before trying again.';
  if(code==='invalid_credentials')return 'Sign-in failed. Check your email and password.';
  if(/mfa.*(invalid|expired)|invalid.*(mfa|code)/i.test(code+' '+message))return 'That verification code was not accepted. Enter a current code.';
  if(code==='23505'||/request.*conflict/i.test(message))return 'This retry conflicts with an earlier request. Reload the report list before trying again.';
  if(code==='22023'||code==='22001')return 'The supplied information was not accepted. Check the report format, size and target player.';
  if(code==='42501'||code==='PGRST301'||code==='401'||code==='403')return 'Your access could not be verified. Sign in again.';
  return 'The request could not be completed. Try again.';
}
export function validateReport(body) {
  if(typeof body!=='string'||new TextEncoder().encode(body).length>32768)throw new Error('Diagnostics must be plain text no larger than 32 KiB.');
  const normalized=body.replace(/\r\n/g,'\n').trimEnd();
  const lines=normalized.split('\n');
  if(lines.shift()!=='Fitama sync diagnostics since the app started'||!lines.length)throw new Error('Paste the minimal sync diagnostics text shared by the player. Recovery JSON is not supported.');
  if(lines.length===1&&lines[0]==='No requests recorded since the app started.')return normalized;
  const row=/^[a-z][a-z0-9_]{0,100}: \d+ calls?, \d+ failed(?: \([a-zA-Z0-9_. ,:-]{1,200}\))?, slowest \d+ ms$/;
  if(lines.some(line=>!row.test(line))||/(?:eyJ[A-Za-z0-9_-]{12,}|sb_secret_|bearer\s|access[_ -]?token|refresh[_ -]?token|password|secret|authorization)/i.test(normalized))throw new Error('Use only the minimal sync diagnostics text. Remove credentials and rich recovery data.');
  return normalized;
}
const grantCatalog=new Map(GRANTABLE_ITEMS.map(item=>[item.itemId,item]));
export function validateItemGrant(input){
  if(!input||typeof input!=='object'||!UUID.test(input.playerId||'')||!UUID.test(input.requestId||''))throw new Error('Reload the player details and review this item again.');
  if(!Number.isSafeInteger(input.generation)||input.generation<0)throw new Error('Reload the player details before adding an item.');
  const item=grantCatalog.get(input.itemId);if(!item)throw new Error('Choose an available item.');
  const quantity=typeof input.quantity==='number'?input.quantity:typeof input.quantity==='string'&&/^[0-9]{1,2}$/.test(input.quantity)?Number(input.quantity):NaN;
  if(!Number.isInteger(quantity)||quantity<1||quantity>item.maxQuantity)throw new Error(item.grantKind==='unlock'?'Unlock Magic Potion test access once per account.':item.grantKind==='equipment'?'Add one equipment copy at a time.':'Choose a quantity from 1 to 99.');
  const raw=input.reason;if(typeof raw!=='string'||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(raw))throw new Error('Use a single-line reason without control characters.');
  const reason=raw.trim();if([...reason].length<1||[...reason].length>240)throw new Error('Enter a reason of 1–240 characters.');
  return{playerId:input.playerId.toLowerCase(),generation:input.generation,itemId:item.itemId,quantity,reason,requestId:input.requestId.toLowerCase()};
}
function grantReceipt(value,intent){
  if(!value||typeof value!=='object'||typeof value.grantedAt!=='string'||!Number.isFinite(Date.parse(value.grantedAt)))throw new Error('Grant outcome could not be confirmed.');
  for(const key of ['requestId','playerId','generation','itemId','quantity','reason'])if(value[key]!==intent[key])throw new Error('Grant outcome could not be confirmed.');
  return{...intent,grantedAt:value.grantedAt};
}
const empty=()=>({players:null,player:null,reports:null,report:null,history:null,itemHistory:null,itemHistoryError:'',itemHistoryDays:7,itemHistoryNeedsReload:false,activity:null,activityError:'',activityPeriod:'weekly',activityOffset:0,activityBusy:false,activityNeedsReload:false,selectedPlayer:null,enrollment:null,factorId:null,error:'',notice:'',busy:false,view:'players',query:'',grantReceipt:null,grantCheck:null,grantOutcome:null,condition:null,conditionError:'',restReceipt:null,restCheck:null,restOutcome:null});
// Every view lives only in memory. Epochs prevent late network responses from restoring erased content.
export function createPortal(client,{id=()=>crypto.randomUUID(),now=()=>Date.now()}={}) {
  let state={...empty(),phase:'loading'};let epoch=0,currentIdentity=null,emailLinkInFlight=false;const versions=new Map();const pending=new Map();const listeners=new Set();
  const emit=patch=>{state={...state,...patch};for(const listener of listeners)listener(state);};
  const invalidate=(phase='login',error='')=>{epoch++;versions.clear();pending.clear();if(['login','denied','signing-out'].includes(phase))currentIdentity=null;emit({...empty(),phase,error});};
  const cancel=keys=>{for(const key of keys){versions.set(key,(versions.get(key)||0)+1);pending.delete(key);}};
  const settle=key=>{pending.delete(key);return {busy:[...pending.keys()].some(name=>name!=='activity'),...(key==='activity'?{activityBusy:false}:{})};};
  const same=stamp=>stamp===epoch;
  const authoritativeDenial=error=>['42501','PGRST301','401','403','session_not_found','user_not_found','refresh_token_not_found','invalid_token'].includes(String(error?.code))||[401,403].includes(error?.status);
  function verificationFailure(error){invalidate(authoritativeDenial(error)?'denied':'verification-error',authoritativeDenial(error)?'Your access is no longer available. Sign in again.':publicError(error));}
  async function gate(stamp) {
    try{
    const {data:sessionData,error:sessionError}=await client.auth.getSession();if(!same(stamp))return false;
    const session=sessionData?.session;
    if(sessionError){verificationFailure(sessionError);return false;}
    if(!session?.user?.id||!session.expires_at||session.expires_at*1000<=now()){if(state.phase!=='login')invalidate('login');return false;}
    const identity=sessionIdentity(session);
    if(currentIdentity&&identity!==currentIdentity){invalidate('loading');currentIdentity=identity;await gate(epoch);return false;}
    currentIdentity=identity;
    const {data:userData,error:userError}=await client.auth.getUser();if(!same(stamp))return false;
    if(userError){verificationFailure(userError);return false;}
    if(userData?.user?.id!==session.user.id){invalidate('login');return false;}
    const {data:status,error:statusError}=await client.rpc('fitamaster_access_status');if(!same(stamp))return false;
    if(statusError){verificationFailure(statusError);return false;}
    if(status?.allowed===false){invalidate('denied','This account does not have owner access.');return false;}
    if(status?.allowed!==true){verificationFailure({});return false;}
    const {data:assurance,error:aalError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(!same(stamp))return false;
    if(aalError){verificationFailure(aalError);return false;}
    if(assurance?.currentLevel!=='aal2'||status.mfaRequired){
      const {data:factors,error}=await client.auth.mfa.listFactors();if(!same(stamp))return false;
      if(error){verificationFailure(error);return false;}
      const factor=factors?.totp?.find(f=>f.status==='verified');
      // Do not create a factor until the owner explicitly starts enrollment.
      const phase=factor?'challenge':'enroll';
      if(state.phase!==phase||['players','player','reports','report','history','itemHistory','activity'].some(key=>state[key]!==null))invalidate(phase);
      emit({phase,factorId:factor?.id||state.enrollment?.id||null,busy:false});return false;
    }
    if(state.phase!=='ready')emit({phase:'ready',error:''});return true;
    }catch(error){if(same(stamp))verificationFailure(error);return false;}
  }
  async function refresh(){await gate(epoch);}
  async function request(name,args,key,patch={},options={}) {
    const stamp=epoch;const version=(versions.get(key)||0)+1;versions.set(key,version);
    pending.set(key,version);
    emit({...patch,[key]:null,...(options.errorKey?{[options.errorKey]:''}:{}),...(options.write?{[options.outcomeKey||'grantOutcome']:null}:{}),busy:[...pending.keys()].some(name=>name!=='activity'),error:'',notice:'',...(key==='activity'?{activityBusy:true}:{})});
    try {
      if(!await gate(stamp)||!same(stamp)||versions.get(key)!==version){if(same(stamp)&&versions.get(key)===version)emit(settle(key));return null;}
      const {data,error}=await client.rpc('fitamaster_'+name,{p_request_id:id(),...args});
      if(!same(stamp)||versions.get(key)!==version)return null;
      if(name==='player_activity'&&error?.code==='P0001'&&error.message==='Activity reset changed; refresh')throw new Error('FITAMASTER_ACTIVITY_TARGET_CHANGED');
      if(error){if(['42501','PGRST301','401','403'].includes(String(error.code))){invalidate('denied',publicError(error));return null;}throw error;}
      const result=options.parse?options.parse(data):data;
      emit({[key]:result,...(options.resultPatch?options.resultPatch(result):{}),...(options.write?{[options.outcomeKey||'grantOutcome']:'confirmed'}:{}),...settle(key)});return result;
    }catch(error){if(same(stamp)&&versions.get(key)===version){const code=String(error?.code||'');const definitive=['P0001','22023','22003','23502','23503','23505','23514','40001','40P01','55P03','57014','PGRST202'].includes(code)||(!code&&[400,404,409,413,422,429].includes(error?.status));emit({...settle(key),[options.errorKey||'error']:options.write&&!definitive?(options.uncertainMessage||'Delivery could not be confirmed. Check delivery status before trying again.'):publicError(error),...(options.write?{[options.outcomeKey||'grantOutcome']:definitive?'rejected':'uncertain'}:{}),...(key==='itemHistory'&&error?.message==='FITAMASTER_HISTORY_TARGET_CHANGED'?{itemHistoryNeedsReload:true}:{}),...(key==='activity'&&error?.message==='FITAMASTER_ACTIVITY_TARGET_CHANGED'?{activityNeedsReload:true}:{})});}return null;}
  }
  async function authAction(action){const stamp=epoch;emit({busy:true,error:'',notice:''});try{const result=await action();if(!same(stamp))return;if(result?.error)throw result.error;emit({busy:false});return result?.data;}catch(error){if(same(stamp))emit({busy:false,error:publicError(error)});}}
  const api={get state(){return state;},subscribe(listener){listeners.add(listener);listener(state);return()=>listeners.delete(listener);},invalidate,refresh,
    setError(message){emit({error:message,busy:false});},setView(view){epoch++;versions.clear();pending.clear();emit({view,error:'',notice:'',busy:false,players:null,player:null,reports:null,report:null,history:null,itemHistory:null,itemHistoryError:'',itemHistoryDays:7,itemHistoryNeedsReload:false,activity:null,activityError:'',activityPeriod:'weekly',activityOffset:0,activityBusy:false,activityNeedsReload:false,selectedPlayer:null,grantReceipt:null,grantCheck:null,grantOutcome:null,condition:null,conditionError:'',restReceipt:null,restCheck:null,restOutcome:null});},
    async login(email,password){const result=await authAction(()=>client.auth.signInWithPassword({email,password}));if(result)await refresh();},
    async emailLink(email,redirectTo){if(emailLinkInFlight)return;emailLinkInFlight=true;try{const result=await authAction(()=>client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:redirectTo}}));if(result)emit({notice:'If this email can sign in, a link has been sent. Open the newest link from your email in any tab or browser, then complete authenticator verification.'});}finally{emailLinkInFlight=false;}},
    async enroll(){const stamp=epoch;await gate(stamp);
      if(state.phase!=='enroll'||!same(stamp))return;
      const result=await authAction(()=>client.auth.mfa.enroll({factorType:'totp',friendlyName:'Fitamaster owner'}));
      if(result&&same(stamp))emit({enrollment:result, factorId:result.id});
    },
    async verify(code){if(!/^\d{6}$/.test(code)){emit({error:'Enter the six-digit code from your authenticator.'});return;}const factorId=state.factorId;if(!factorId)return;const result=await authAction(()=>client.auth.mfa.challengeAndVerify({factorId,code}));if(result){emit({enrollment:null});await refresh();}},
    async signOut(){invalidate('signing-out');try{await client.auth.signOut({scope:'local'});}catch{}finally{invalidate('login');}},
    players({query=state.query,after=null}={}){if(typeof query!=='string'||query.length>80||/[\x00-\x1f\x7f]/.test(query))throw new Error('Use a player search of 80 characters or fewer, without control characters.');cancel(['player','reports','report','grantReceipt','grantCheck','condition','restReceipt','restCheck','itemHistory','activity']);return request('players',{p_query:query,p_after:after,p_limit:25},'players',{query,view:'players',player:null,report:null,reports:null,itemHistory:null,itemHistoryError:'',itemHistoryDays:7,itemHistoryNeedsReload:false,activity:null,activityError:'',activityPeriod:'weekly',activityOffset:0,activityBusy:false,activityNeedsReload:false,selectedPlayer:null,grantReceipt:null,grantCheck:null,grantOutcome:null,condition:null,conditionError:'',restReceipt:null,restCheck:null,restOutcome:null});},
    player(playerId){cancel(['players','reports','report','grantReceipt','grantCheck','condition','restReceipt','restCheck','itemHistory','activity']);return request('player',{p_player_id:playerId},'player',{selectedPlayer:playerId,report:null,reports:null,itemHistory:null,itemHistoryError:'',itemHistoryDays:7,itemHistoryNeedsReload:false,activity:null,activityError:'',activityPeriod:'weekly',activityOffset:0,activityBusy:false,activityNeedsReload:false,grantReceipt:null,grantCheck:null,grantOutcome:null,condition:null,conditionError:'',restReceipt:null,restCheck:null,restOutcome:null});},
    playerActivity({playerId=state.selectedPlayer,period=state.activityPeriod,offset=state.activityOffset}={}){
      const intent=validateActivityRequest({playerId,period,offset}),generation=state.player?.generation;
      if(state.phase!=='ready'||state.activityNeedsReload||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||!Number.isSafeInteger(generation)||generation<0)throw new Error('Player details changed. Reload their details before viewing activity.');
      return request('player_activity',{p_player_id:intent.playerId,p_period:intent.period,p_offset:intent.offset},'activity',{activityPeriod:intent.period,activityOffset:intent.offset},{parse:value=>{
        const result=parsePlayerActivity(value,intent);
        if(result.generation!==generation)throw new Error('FITAMASTER_ACTIVITY_TARGET_CHANGED');
        return result;
      },errorKey:'activityError'});
    },
    playerItemHistory({playerId=state.selectedPlayer,generation=state.player?.generation,days=state.itemHistoryDays,after=null,limit=25}={}){
      const intent=validateItemHistoryRequest({playerId,generation,days,after,limit});
      if(state.phase!=='ready'||state.itemHistoryNeedsReload||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||state.player?.generation!==intent.generation)throw new Error('Player details changed. Reload their details before viewing item history.');
      return request('player_item_history',{p_player_id:intent.playerId,p_generation:intent.generation,p_days:intent.days,p_after:intent.after,p_limit:intent.limit},'itemHistory',{itemHistoryDays:intent.days},{parse:value=>parseItemHistory(value,intent),errorKey:'itemHistoryError'});
    },
    restorePlayerItemHistory(data){
      const intent=validateItemHistoryRequest({playerId:state.selectedPlayer,generation:state.player?.generation,days:state.itemHistoryDays,after:null,limit:25});
      if(state.phase!=='ready'||state.itemHistoryNeedsReload||state.player?.profile?.id!==intent.playerId)throw new Error('Reload player details before viewing cached history.');
      const result=parseItemHistory(data,intent);cancel(['itemHistory']);emit({itemHistory:result,itemHistoryError:'',busy:[...pending.keys()].some(name=>name!=='activity')});return result;
    },
    reports({playerId=null,after=null}={}){return request('reports',{p_player_id:playerId,p_after:after,p_limit:25},'reports');},
    report(reportId){return request('report',{p_report_id:reportId},'report');},
    history({after=null}={}){return request('history',{p_after:after,p_limit:25},'history',{view:'history'},{parse:value=>{
      if(!Array.isArray(value?.events))throw new Error('Admin history could not be verified. Refresh history.');
      return {...value,events:value.events.map(event=>{
        if(event.action!=='end_dungeon_rest'&&event.restEnd==null)return event;
        const restEnd=parseRestReceipt(event.restEnd);
        if(event.action!=='end_dungeon_rest'||event.playerId!=null&&event.playerId!==restEnd.playerId||event.requestId!==restEnd.requestId)throw new Error('Admin rest history could not be verified. Refresh history.');
        return {...event,restEnd};
      })};
    }});},
    petCondition(){
      const playerId=state.selectedPlayer,generation=state.player?.generation;
      if(state.phase!=='ready'||state.player?.profile?.id!==playerId||!Number.isSafeInteger(generation)||generation<0)throw new Error('Reload player details before viewing condition.');
      return request('pet_condition',{p_player_id:playerId},'condition',{}, {parse:value=>parsePetCondition(value,{playerId,generation}),errorKey:'conditionError'});
    },
    endDungeonRest(input){
      const intent=validateEndRest(input);
      if(state.phase!=='ready'||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||state.player?.generation!==intent.generation)throw new Error('Player details changed. Reload and review dungeon rest again.');
      if(pending.has('restReceipt')||pending.has('restCheck')||pending.has('grantReceipt')||pending.has('grantCheck')||state.grantOutcome==='uncertain')return Promise.resolve(null);
      return request('end_dungeon_rest',{p_request_id:intent.requestId,p_player_id:intent.playerId,p_generation:intent.generation,p_source_battle_id:intent.sourceBattleId,p_rested_at:intent.restedAt,p_rest_until:intent.restUntil,p_reason:intent.reason},'restReceipt',{}, {write:true,outcomeKey:'restOutcome',uncertainMessage:'Rest clearance could not be confirmed. Check clearance status before trying again.',parse:value=>parseRestResult(value,intent)});
    },
    restEndStatus(input){
      const intent=validateEndRest(input);
      if(state.phase!=='ready'||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||state.player?.generation!==intent.generation)throw new Error('Player details changed. Reload and review dungeon rest again.');
      if(pending.has('restReceipt')||pending.has('restCheck')||pending.has('grantReceipt')||pending.has('grantCheck')||state.grantOutcome==='uncertain')return Promise.resolve(null);
      return request('rest_end_status',{p_end_request_id:intent.requestId},'restCheck',{}, {parse:value=>({receipt:value===null?null:parseRestReceipt(value,intent)}),resultPatch:result=>result.receipt?{restOutcome:'confirmed'}:{}});
    },
    grantItem(input){
      const intent=validateItemGrant(input);
      if(state.phase!=='ready'||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||state.player?.generation!==intent.generation)throw new Error('Player details changed. Reload and review this item again.');
      if(pending.has('grantReceipt')||pending.has('grantCheck')||pending.has('restReceipt')||pending.has('restCheck')||state.restOutcome==='uncertain')return Promise.resolve(null);
      return request('grant_item',{p_request_id:intent.requestId,p_player_id:intent.playerId,p_generation:intent.generation,p_item_id:intent.itemId,p_quantity:intent.quantity,p_reason:intent.reason},'grantReceipt',{}, {write:true,parse:value=>grantReceipt(value,intent)});
    },
    grantStatus(input){
      const intent=validateItemGrant(input);
      if(state.phase!=='ready'||state.selectedPlayer!==intent.playerId||state.player?.profile?.id!==intent.playerId||state.player?.generation!==intent.generation)throw new Error('Player details changed. Reload and review this item again.');
      if(pending.has('grantReceipt')||pending.has('grantCheck')||pending.has('restReceipt')||pending.has('restCheck')||state.restOutcome==='uncertain')return Promise.resolve(null);
      return request('grant_status',{p_grant_request_id:intent.requestId},'grantCheck',{}, {parse:value=>({receipt:value===null?null:grantReceipt(value,intent)}),resultPatch:result=>result.receipt?{grantOutcome:'confirmed'}:{}});
    },
    async importReport({playerId,title,body,capturedAt=null,build=null,requestId=id()}){
      if(!UUID.test(playerId))throw new Error('Enter the target player UUID.');
      const safeTitle=title?.trim()||'',safeBuild=build?.trim()||null;
      if(!/^[A-Za-z0-9][A-Za-z0-9 ._()#-]{0,119}$/.test(safeTitle))throw new Error('Use a 1–120 character case title starting with a letter or number. Allowed: letters, numbers, spaces, . _ ( ) # -.');
      if(safeBuild&&!/^[A-Za-z0-9][A-Za-z0-9 ._()+-]{0,63}$/.test(safeBuild))throw new Error('Use up to 64 characters for build, starting with a letter or number. Allowed: letters, numbers, spaces, . _ ( ) + -.');
      if(/bearer|password|secret|token|credential|eyJ[A-Za-z0-9_-]{8,}|[A-Za-z0-9_-]{64,}/i.test(safeTitle+' '+safeBuild))throw new Error('Do not include tokens, passwords, secrets or credentials in the title or build.');
      let safeCapturedAt=null;
      if(capturedAt){const millis=Date.parse(capturedAt);if(!Number.isFinite(millis)||millis>now())throw new Error('Captured time must be a valid time in the past.');safeCapturedAt=new Date(millis).toISOString();}
      const safeBody=validateReport(body);return request('import_report',{p_request_id:requestId,p_player_id:playerId,p_title:safeTitle,p_body:safeBody,p_captured_at:safeCapturedAt,p_build:safeBuild},'report');
    },
    reviewReport(reportId,status,requestId=id()){return request('review_report',{p_request_id:requestId,p_report_id:reportId,p_status:status},'report');}
  };return api;
}
