import {createClient} from '@supabase/supabase-js';
import {createPortal,createSessionStorage,validateConfig,AUTH_STORAGE_KEY,clearAuthForPhase,parseAuthCallback,sessionIdentity} from './core.mjs';
import {renderPortal} from './view.mjs';
import portalConfig from '../../docs/fitamaster/config.mjs';

export async function startPortal({window:browser=globalThis.window,document=browser.document,location=browser.location,history=browser.history,storage=browser.sessionStorage,client:injectedClient}={}){
  const root=document.getElementById('portal');let config;
  const callback=parseAuthCallback(location);
  // Remove callback material before configuration checks or any network activity. Never accept implicit tokens.
  if(callback.hasCallback)history.replaceState(null,'',callback.cleanUrl);
  const authStorage=createSessionStorage(storage);
  if(!injectedClient){try{config=validateConfig(portalConfig);}catch{authStorage.clear();renderPortal(document,root,{phase:'config'},{},{});return;}}
  const client=injectedClient||createClient(config.url,config.key,{auth:{storage:authStorage,storageKey:AUTH_STORAGE_KEY,flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(url,options={})=>fetch(url,{...options,cache:'no-store',referrerPolicy:'no-referrer'})}});
  const portal=createPortal(client);const ui={pages:{players:[],reports:[],history:[]},cursors:{players:null,reports:null,history:null},importDraft:null,importOpen:false};let wasReady=false,expiryTimer,expiryVersion=0,activeIdentity=null,disposed=false;
  let importIntent=null;const reviewIntents=new Map();
  const run=async action=>{try{return await action();}catch(error){portal.setError(error.message||'The request could not be completed. Try again.');return null;}};
  const load=(kind,after=null)=>kind==='players'?portal.players({after}):kind==='reports'?portal.reports({after,playerId:portal.state.selectedPlayer}):portal.history({after});
  const resetPage=kind=>{ui.pages[kind]=[];ui.cursors[kind]=null;};
  const actions={
    login:(email,password)=>run(()=>portal.login(email,password)),emailLink:email=>run(()=>portal.emailLink(email,location.origin+location.pathname)),enroll:()=>run(()=>portal.enroll()),verify:code=>run(()=>portal.verify(code)),
    retryVerification:()=>run(()=>portal.refresh()),
    updateDraft:(name,value)=>{if(['playerId','title','body','capturedAt','build'].includes(name)){ui.importDraft={playerId:portal.state.selectedPlayer||'',...ui.importDraft,[name]:value};ui.importOpen=true;}},
    setImportOpen:value=>{ui.importOpen=!!value;},
    signOut:async()=>{expiryVersion++;clearTimeout(expiryTimer);try{await portal.signOut();}finally{authStorage.clear();}},
    navigate:view=>{portal.setView(view);resetPage(view==='history'?'history':view==='reports'?'reports':'players');run(()=>load(view==='history'?'history':view==='reports'?'reports':'players'));},
    search:query=>{resetPage('players');run(()=>portal.players({query}));},
    player:async id=>{resetPage('reports');ui.importDraft=null;ui.importOpen=false;importIntent=null;await run(()=>portal.player(id));if(portal.state.selectedPlayer===id)run(()=>portal.reports({playerId:id}));},
    backPlayers:()=>{portal.setView('players');run(()=>load('players',ui.cursors.players));},
    report:id=>run(()=>portal.report(id)),
    page:(kind,direction,next)=>{let cursor;if(direction==='next'){if(!next)return;ui.pages[kind].push(ui.cursors[kind]);cursor=next;}else{if(!ui.pages[kind].length)return;cursor=ui.pages[kind].pop();}ui.cursors[kind]=cursor;run(()=>load(kind,cursor));},
    importReport:async draft=>{ui.importDraft=draft;const canonical=JSON.stringify(draft);if(importIntent?.canonical!==canonical)importIntent={canonical,id:crypto.randomUUID()};
      const report=await run(()=>portal.importReport({...draft,requestId:importIntent.id}));if(report?.id){ui.importDraft=null;importIntent=null;resetPage('reports');await run(()=>portal.reports({playerId:portal.state.selectedPlayer}));await run(()=>portal.report(report.id));}},
    review:async(id,status)=>{const key=id+':'+status;if(!reviewIntents.has(key))reviewIntents.set(key,crypto.randomUUID());const result=await run(()=>portal.reviewReport(id,status,reviewIntents.get(key)));if(result){reviewIntents.delete(key);await run(()=>portal.report(id));await run(()=>load('reports',ui.cursors.reports));}}
  };
  portal.subscribe(state=>{
    clearAuthForPhase(authStorage,state.phase);
    if(state.phase!=='ready'){ui.importDraft=null;ui.importOpen=false;importIntent=null;reviewIntents.clear();ui.pages={players:[],reports:[],history:[]};ui.cursors={players:null,reports:null,history:null};}
    renderPortal(document,root,state,actions,ui);
    if(state.phase==='ready'&&!wasReady){wasReady=true;queueMicrotask(()=>run(()=>portal.players()));}else if(state.phase!=='ready')wasReady=false;
  });
  async function scheduleExpiry(){const version=++expiryVersion;clearTimeout(expiryTimer);try{const {data}=await client.auth.getSession();if(version!==expiryVersion||disposed)return;const expires=data?.session?.expires_at;if(expires)expiryTimer=setTimeout(()=>{portal.invalidate('login','Your session expired. Sign in again.');authStorage.clear();},Math.max(0,expires*1000-Date.now()));}catch{}}
  const authSubscription=client.auth.onAuthStateChange((event,session)=>{
    // Supabase holds an auth lock while invoking this callback. Async auth calls must run after it returns.
    if(disposed)return;
    const identity=sessionIdentity(session),sameSession=identity&&identity===activeIdentity;
    activeIdentity=identity;
    const initialLoggedOut=event==='INITIAL_SESSION'&&!session&&portal.state.phase==='login';
    if(event==='SIGNED_OUT'||(!sameSession&&!initialLoggedOut))portal.invalidate(event==='SIGNED_OUT'?'login':'loading');
    if(event==='SIGNED_OUT'){expiryVersion++;authStorage.clear();clearTimeout(expiryTimer);}else setTimeout(()=>{if(!disposed){run(()=>portal.refresh());scheduleExpiry();}},0);
  });
  let callbackError='';
  if(callback.hasCallback){
    if(callback.code){try{const {error}=await client.auth.exchangeCodeForSession(callback.code);if(error)throw error;}catch{callbackError='The sign-in link could not be used. Request a new link, then copy it from your email and paste it into this original portal tab.';}}
    else callbackError='The sign-in link could not be used. Request a new link, then copy it from your email and paste it into this original portal tab.';
  }
  await portal.refresh();await scheduleExpiry();
  if(callbackError)portal.invalidate('login',callbackError);
  const onVisibility=()=>{if(document.visibilityState==='visible')run(()=>portal.refresh());};
  const onPageHide=()=>portal.invalidate('loading');
  const onPageShow=event=>{if(event.persisted)run(()=>portal.refresh());};
  document.addEventListener('visibilitychange',onVisibility);
  browser.addEventListener('pagehide',onPageHide);
  browser.addEventListener('pageshow',onPageShow);
  return {portal,client,dispose(){disposed=true;expiryVersion++;clearTimeout(expiryTimer);authSubscription?.data?.subscription?.unsubscribe();document.removeEventListener('visibilitychange',onVisibility);browser.removeEventListener('pagehide',onPageHide);browser.removeEventListener('pageshow',onPageShow);}};
}
if(typeof window!=='undefined')startPortal();
