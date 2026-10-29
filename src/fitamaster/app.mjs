import {createClient} from '@supabase/supabase-js';
import {createPortal,createSessionStorage,validateConfig,AUTH_STORAGE_KEY,clearAuthForPhase,parseAuthCallback,sessionIdentity} from './core.mjs';
import {renderPortal} from './view.mjs';
import {mountSavedPet} from './pet-card.mjs';
import {createItemGrantController} from './grant-controller.mjs';
import {createRestController} from './rest-controller.mjs';
import portalConfig from '../../docs/fitamaster/config.mjs';

export async function startPortal({window:browser=globalThis.window,document=browser.document,location=browser.location,history=browser.history,storage=browser.sessionStorage,client:injectedClient}={}){
  const root=document.getElementById('portal');let config;
  const callback=parseAuthCallback(location);
  // Scrub callback credentials before configuration checks, Auth initialization or any network activity.
  if(callback.hasCallback)history.replaceState(null,'',callback.cleanUrl);
  const authStorage=createSessionStorage(storage);
  if(!injectedClient){try{config=validateConfig(portalConfig);}catch{authStorage.clear();renderPortal(document,root,{phase:'config'},{},{});return;}}
  const client=injectedClient||createClient(config.url,config.key,{auth:{storage:authStorage,storageKey:AUTH_STORAGE_KEY,flowType:'implicit',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(url,options={})=>fetch(url,{...options,cache:'no-store',referrerPolicy:'no-referrer'})}});
  const portal=createPortal(client);const ui={pages:{players:[],reports:[],history:[],itemHistory:[]},cursors:{players:null,reports:null,history:null,itemHistory:null},importDraft:null,importOpen:false,emailLinkOpen:false,emailLinkEmail:''};let wasReady=false,expiryTimer,expiryVersion=0,activeIdentity=null,disposed=false,petRenderer=null,cardExpiryTimer;
  let importIntent=null,historyPlayer=null,historyLoadVersion=0,historyReloadPeriod=null,activityPlayer=null,activityLoadVersion=0,conditionPlayer=null,conditionLoadVersion=0;const reviewIntents=new Map();
  const run=async action=>{try{return await action();}catch(error){portal.setError(error.message||'The request could not be completed. Try again.');return null;}};
  const load=(kind,after=null)=>kind==='players'?portal.players({after}):kind==='reports'?portal.reports({after,playerId:portal.state.selectedPlayer}):portal.history({after});
  const resetPage=kind=>{ui.pages[kind]=[];ui.cursors[kind]=null;};
  const historyTarget=()=>{
    const state=portal.state,p=state.player;
    return !disposed&&state.phase==='ready'&&state.view==='players'&&state.selectedPlayer===p?.profile?.id
      &&Number.isSafeInteger(p?.generation)&&p.generation>=0?{playerId:p.profile.id,generation:p.generation}:null;
  };
  const loadItemHistory=({days=portal.state.itemHistoryDays||7,after=null}={})=>{
    const target=historyTarget();if(!target||portal.state.itemHistoryNeedsReload)return Promise.resolve(null);
    return run(()=>portal.playerItemHistory({...target,days,after,limit:25}));
  };
  const loadActivity=({period=portal.state.activityPeriod||'weekly',offset=portal.state.activityOffset||0}={})=>{
    const target=historyTarget();if(!target||portal.state.activityNeedsReload)return Promise.resolve(null);
    return run(()=>portal.playerActivity({playerId:target.playerId,period,offset}));
  };
  const activityAction=async(options,focus)=>{
    const target=historyTarget();if(!target||portal.state.busy||portal.state.activityBusy||portal.state.activityNeedsReload)return;
    await loadActivity(options);
    if(historyTarget()?.playerId===target.playerId)root.querySelector?.('#'+focus)?.focus();
  };
  const reloadPlayer=async(id,days=7)=>{
    historyReloadPeriod={playerId:id,days};resetPage('itemHistory');
    await run(()=>portal.player(id));
    if(portal.state.phase==='ready'&&portal.state.selectedPlayer===id&&portal.state.player?.profile?.id===id)
      await run(()=>portal.reports({playerId:id}));
  };
  let rest;
  const grant=createItemGrantController(portal,{isBlocked:()=>!!rest?.blocksNavigation,onChange:({focus})=>{renderCurrent(portal.state);if(focus)root.querySelector?.('.grant-panel h3, #grant-item')?.focus();},onConfirmed:async receipt=>{
    if(portal.state.phase!=='ready'||portal.state.selectedPlayer!==receipt.playerId)return;
    await reloadPlayer(receipt.playerId,portal.state.itemHistoryDays||7);
  }});
  rest=createRestController(portal,{isBlocked:()=>grant.blocksNavigation,onChange:({focus})=>{renderCurrent(portal.state);if(focus)root.querySelector?.('.rest-panel h3, #rest-reason')?.focus();},onConfirmed:async receipt=>{
    if(portal.state.phase!=='ready'||portal.state.selectedPlayer!==receipt.playerId)return;
    await reloadPlayer(receipt.playerId,portal.state.itemHistoryDays||7);
  }});
  const leaveGrant=()=>{if(!grant.blocksNavigation&&!rest.blocksNavigation)return true;portal.setError(rest.blocksNavigation?'Check this rest clearance before leaving or changing this player. Retry only the same clearance if no completed request is found.':'Check this item delivery before leaving the player. Retry only the same addition if no delivery is found.');return false;};
  const actions={
    itemGrant:grant.actions,
    endRest:rest.actions,
    petCondition:{refresh(){if(!leaveGrant()||portal.state.busy||!historyTarget())return;return run(()=>portal.petCondition());}},
    activity:{
      period(period){if(!['weekly','monthly'].includes(period)||period===portal.state.activityPeriod)return;return activityAction({period,offset:0},'activity-period');},
      offset(offset){if(!Number.isInteger(offset)||offset<0||offset>5||offset===portal.state.activityOffset)return;return activityAction({offset},offset>portal.state.activityOffset?'activity-previous':'activity-next');},
      refresh(){return activityAction({},'activity-refresh');}
    },
    itemHistory:{
      period(days){if(![7,30].includes(days)||portal.state.busy||!historyTarget()||portal.state.itemHistoryNeedsReload||days===portal.state.itemHistoryDays)return;resetPage('itemHistory');return loadItemHistory({days});},
      refresh(){if(portal.state.busy||!historyTarget()||portal.state.itemHistoryNeedsReload)return;resetPage('itemHistory');return loadItemHistory();},
      page(direction,next){
        if(portal.state.busy||!historyTarget()||portal.state.itemHistoryNeedsReload||!portal.state.itemHistory)return;
        if(direction==='next'){
          if(!next||next!==portal.state.itemHistory.nextCursor)return;
          ui.pages.itemHistory.push({cursor:ui.cursors.itemHistory,data:portal.state.itemHistory});ui.cursors.itemHistory=next;
          return loadItemHistory({after:next});
        }
        if(direction!=='previous'||!ui.pages.itemHistory.length)return;
        const previous=ui.pages.itemHistory.pop();ui.cursors.itemHistory=previous.cursor;
        try{portal.restorePlayerItemHistory(previous.data);}catch(error){resetPage('itemHistory');portal.setError(error.message||'Refresh item history to continue.');}
      }
    },
    reloadPlayer:()=>{if(!leaveGrant()||portal.state.busy||!portal.state.selectedPlayer)return;return reloadPlayer(portal.state.selectedPlayer,portal.state.itemHistoryDays||7);},
    login:(email,password)=>run(()=>portal.login(email,password)),emailLink:email=>{ui.emailLinkOpen=true;ui.emailLinkEmail=email;return run(()=>portal.emailLink(email,location.origin+location.pathname));},enroll:()=>run(()=>portal.enroll()),verify:code=>run(()=>portal.verify(code)),
    setEmailLinkOpen:value=>{ui.emailLinkOpen=!!value;},updateEmailLinkEmail:value=>{ui.emailLinkEmail=String(value);ui.emailLinkOpen=true;},
    retryVerification:()=>run(()=>portal.refresh()),
    updateDraft:(name,value)=>{if(['playerId','title','body','capturedAt','build'].includes(name)){ui.importDraft={playerId:portal.state.selectedPlayer||'',...ui.importDraft,[name]:value};ui.importOpen=true;}},
    setImportOpen:value=>{ui.importOpen=!!value;},
    signOut:async()=>{expiryVersion++;clearTimeout(expiryTimer);try{await portal.signOut();}finally{authStorage.clear();}},
    navigate:view=>{if(!leaveGrant())return;portal.setView(view);resetPage(view==='history'?'history':view==='reports'?'reports':'players');run(()=>load(view==='history'?'history':view==='reports'?'reports':'players'));},
    search:query=>{if(!leaveGrant())return;resetPage('players');run(()=>portal.players({query}));},
    player:async id=>{if(!leaveGrant())return;resetPage('reports');ui.importDraft=null;ui.importOpen=false;importIntent=null;await reloadPlayer(id);},
    backPlayers:()=>{if(!leaveGrant())return;portal.setView('players');run(()=>load('players',ui.cursors.players));},
    report:id=>run(()=>portal.report(id)),
    page:(kind,direction,next)=>{if(!leaveGrant())return;let cursor;if(direction==='next'){if(!next)return;ui.pages[kind].push(ui.cursors[kind]);cursor=next;}else{if(!ui.pages[kind].length)return;cursor=ui.pages[kind].pop();}ui.cursors[kind]=cursor;run(()=>load(kind,cursor));},
    importReport:async draft=>{if(!leaveGrant())return;ui.importDraft=draft;const canonical=JSON.stringify(draft);if(importIntent?.canonical!==canonical)importIntent={canonical,id:crypto.randomUUID()};
      const report=await run(()=>portal.importReport({...draft,requestId:importIntent.id}));if(report?.id){ui.importDraft=null;importIntent=null;resetPage('reports');await run(()=>portal.reports({playerId:portal.state.selectedPlayer}));await run(()=>portal.report(report.id));}},
    review:async(id,status)=>{if(!leaveGrant())return;const key=id+':'+status;if(!reviewIntents.has(key))reviewIntents.set(key,crypto.randomUUID());const result=await run(()=>portal.reviewReport(id,status,reviewIntents.get(key)));if(result){reviewIntents.delete(key);await run(()=>portal.report(id));await run(()=>load('reports',ui.cursors.reports));}}
  };
  function renderCurrent(state){
    if(disposed)return;
    ui.itemGrant=grant.state;ui.endRest=rest.state;
    petRenderer?.dispose();petRenderer=null;clearTimeout(cardExpiryTimer);
    const rendered=renderPortal(document,root,state,actions,ui);
    if(rendered?.petArtwork)petRenderer=mountSavedPet({document,...rendered.petArtwork});
    const cardExpiry=Date.parse(state.player?.petCard?.tpExpiresAt);
    if(state.phase==='ready'&&cardExpiry>Date.now())cardExpiryTimer=setTimeout(()=>renderCurrent(portal.state),Math.min(2147483647,cardExpiry-Date.now()+10));
  }
  portal.subscribe(state=>{
    grant.sync(state);rest.sync(state);
    clearAuthForPhase(authStorage,state.phase);
    if(state.phase!=='login'){ui.emailLinkOpen=false;ui.emailLinkEmail='';}
    if(state.phase!=='ready'){ui.importDraft=null;ui.importOpen=false;importIntent=null;reviewIntents.clear();historyReloadPeriod=null;ui.pages={players:[],reports:[],history:[],itemHistory:[]};ui.cursors={players:null,reports:null,history:null,itemHistory:null};}
    const target=historyTarget();
    if(!target||state.itemHistoryNeedsReload){historyLoadVersion++;resetPage('itemHistory');if(!target)historyPlayer=null;}
    else if(state.player!==historyPlayer){
      historyPlayer=state.player;resetPage('itemHistory');const version=++historyLoadVersion,p=state.player;
      const days=historyReloadPeriod?.playerId===target.playerId?historyReloadPeriod.days:7;historyReloadPeriod=null;
      queueMicrotask(()=>{if(!disposed&&version===historyLoadVersion&&portal.state.player===p&&historyTarget())loadItemHistory({days});});
    }
    if(!target){activityLoadVersion++;activityPlayer=null;}
    else if(state.player!==activityPlayer){
      activityPlayer=state.player;const version=++activityLoadVersion,p=state.player;
      queueMicrotask(()=>{if(!disposed&&version===activityLoadVersion&&portal.state.player===p&&historyTarget())loadActivity({period:'weekly',offset:0});});
    }
    if(!target){conditionLoadVersion++;conditionPlayer=null;}
    else if(state.player!==conditionPlayer){
      conditionPlayer=state.player;const version=++conditionLoadVersion,p=state.player;
      queueMicrotask(()=>{if(!disposed&&version===conditionLoadVersion&&portal.state.player===p&&historyTarget())run(()=>portal.petCondition());});
    }
    renderCurrent(state);
    if(state.phase==='ready'&&!wasReady){wasReady=true;queueMicrotask(()=>run(()=>portal.players()));}else if(state.phase!=='ready')wasReady=false;
  });
  async function scheduleExpiry(){const version=++expiryVersion;clearTimeout(expiryTimer);try{const {data}=await client.auth.getSession();if(version!==expiryVersion||disposed)return;const expires=data?.session?.expires_at;if(expires)expiryTimer=setTimeout(()=>{portal.invalidate('login','Your session expired. Sign in again.');authStorage.clear();},Math.max(0,expires*1000-Date.now()));}catch{}}
  let authReady=false;
  const authSubscription=client.auth.onAuthStateChange((event,session)=>{
    // Supabase holds an auth lock while invoking this callback. Async auth calls must run after it returns.
    if(disposed)return;
    const identity=sessionIdentity(session),sameSession=identity&&identity===activeIdentity;
    activeIdentity=identity;
    // Finish validating a clicked callback before checking or displaying any stored session.
    if(!authReady)return;
    const initialLoggedOut=event==='INITIAL_SESSION'&&!session&&portal.state.phase==='login';
    if(event==='SIGNED_OUT'||(!sameSession&&!initialLoggedOut))portal.invalidate(event==='SIGNED_OUT'?'login':'loading');
    if(event==='SIGNED_OUT'){expiryVersion++;authStorage.clear();clearTimeout(expiryTimer);}else setTimeout(()=>{if(!disposed){run(()=>portal.refresh());scheduleExpiry();}},0);
  });
  let callbackError='';
  if(callback.hasCallback){
    try{
      if(callback.session){const {error}=await client.auth.setSession(callback.session);if(error)throw error;}
      else if(callback.code&&authStorage.getItem(AUTH_STORAGE_KEY+'-code-verifier')){const {error}=await client.auth.exchangeCodeForSession(callback.code);if(error)throw error;}
      else throw new Error('Unsupported sign-in link');
    }catch{callbackError='The sign-in link could not be used. Request a new link and open the newest email. Used, expired or older sign-in links cannot be reused.';}
  }
  // Drop callback token references once Auth has validated/imported them. They never enter UI state.
  callback.session=null;callback.code=null;
  if(callbackError)portal.invalidate('login',callbackError);
  authReady=true;
  if(!callbackError){await portal.refresh();await scheduleExpiry();}
  const onVisibility=()=>{if(document.visibilityState==='visible')run(()=>portal.refresh());};
  const onBeforeUnload=event=>{if(grant.blocksNavigation||rest.blocksNavigation){event.preventDefault();event.returnValue='';}};
  const onPageHide=()=>portal.invalidate('loading');
  const onPageShow=event=>{if(event.persisted)run(()=>portal.refresh());};
  document.addEventListener('visibilitychange',onVisibility);
  browser.addEventListener('beforeunload',onBeforeUnload);
  browser.addEventListener('pagehide',onPageHide);
  browser.addEventListener('pageshow',onPageShow);
  return {portal,client,dispose(){disposed=true;conditionLoadVersion++;conditionPlayer=null;rest.dispose();activityLoadVersion++;activityPlayer=null;historyLoadVersion++;historyReloadPeriod=null;resetPage('itemHistory');grant.dispose();expiryVersion++;clearTimeout(expiryTimer);clearTimeout(cardExpiryTimer);petRenderer?.dispose();authSubscription?.data?.subscription?.unsubscribe();document.removeEventListener('visibilitychange',onVisibility);browser.removeEventListener('beforeunload',onBeforeUnload);browser.removeEventListener('pagehide',onPageHide);browser.removeEventListener('pageshow',onPageShow);}};
}
if(typeof window!=='undefined')startPortal();
