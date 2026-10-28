import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortal, validateReport, publicError, createSessionStorage, validateConfig,clearAuthForPhase,parseAuthCallback} from '../src/fitamaster/core.mjs';
import {renderPortal,xpBooksValue} from '../src/fitamaster/view.mjs';
import {startPortal} from '../src/fitamaster/app.mjs';

const uuid='11111111-1111-4111-8111-111111111111';
function fixture({allowed=true,aal='aal2',expiry=Date.now()/1000+3600}={}) {
  const calls=[]; let session={user:{id:uuid},expires_at:expiry}; let authCallback;
  const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user},error:null}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}}),listFactors:async()=>({data:{totp:[]}})}},rpc:async(name,args)=>{calls.push([name,args]); return name==='fitamaster_access_status'?{data:{allowed,mfaRequired:aal!=='aal2'}}:{data:{players:[],nextCursor:null,observedAt:'2026-10-28T00:00:00Z'}};}};
  const portal=createPortal(client,{id:()=>uuid}); return {portal,client,calls,logout(){session=null;portal.invalidate('login');}};
}
test('all data calls require current owner, aal2 and a non-expired session',async()=>{
  for (const options of [{allowed:false},{aal:'aal1'},{expiry:1}]) {
    const f=fixture(options); await f.portal.refresh(); await f.portal.players();
    assert.equal(f.calls.some(([name])=>name==='fitamaster_players'),false);
    assert.notEqual(f.portal.state.phase,'ready');
  }
});
test('authorized player requests use exact RPC contract with generated request ID',async()=>{
  const f=fixture();await f.portal.refresh();await f.portal.players({query:'clo',after:uuid});
  assert.deepEqual(f.calls.at(-1),['fitamaster_players',{p_request_id:uuid,p_query:'clo',p_after:uuid,p_limit:25}]);
});
test('auth loss clears all personal content and ignores a pending RPC result',async()=>{
  const f=fixture(); await f.portal.refresh(); let resolve;
  f.client.rpc=async(name)=> name==='fitamaster_access_status'?{data:{allowed:true,mfaRequired:false}}:new Promise(r=>resolve=r);
  const pending=f.portal.players(); await new Promise(r=>setTimeout(r,0));
  f.logout(); resolve({data:{players:[{id:uuid,username:'private'}]}});await pending;
  assert.equal(f.portal.state.phase,'login');assert.equal(f.portal.state.players,null);assert.equal(f.portal.state.player,null);assert.equal(f.portal.state.report,null);assert.equal(f.portal.state.history,null);
});
test('changing player invalidates older detail responses',async()=>{
  const f=fixture();await f.portal.refresh();const resolvers=[];
  f.client.rpc=async(name)=>name==='fitamaster_access_status'?{data:{allowed:true,mfaRequired:false}}:new Promise(r=>resolvers.push(r));
  const first=f.portal.player(uuid);await new Promise(r=>setTimeout(r,0));
  const second=f.portal.player('22222222-2222-4222-8222-222222222222');await new Promise(r=>setTimeout(r,0));
  resolvers[1]({data:{profile:{username:'current'}}});await second;resolvers[0]({data:{profile:{username:'stale'}}});await first;
  assert.equal(f.portal.state.player.profile.username,'current');
});
test('server authorization failure erases loaded data and session view',async()=>{
  const f=fixture();await f.portal.refresh();await f.portal.players();
  f.client.rpc=async()=>({error:{code:'42501',message:'not allowed'}});await f.portal.history();
  assert.equal(f.portal.state.phase,'denied');assert.equal(f.portal.state.players,null);
});
test('diagnostics accept only bounded minimal sync text and reject credential-like content',()=>{
  const valid='Fitama sync diagnostics since the app started\nNo requests recorded since the app started.';
  assert.equal(validateReport(valid),valid);assert.equal(validateReport('Fitama sync diagnostics since the app started\nsync_save: 2 calls, 1 failed (timeout), slowest 300 ms').includes('sync_save'),true);
  for(const body of ['{}','Fitama sync diagnostics since the app started\naccess_token: secret',valid+'x'.repeat(32768),valid+'\n<html>']) assert.throws(()=>validateReport(body));
});
test('errors never echo server messages, credentials, or HTML',()=>{
  assert.equal(publicError({message:'<img src=x onerror=alert(1)> secret-token'}),'The request could not be completed. Try again.');
  assert.match(publicError({code:'P0001',message:'fitamaster_rate_limited'}),/Too many/);
});
test('auth storage only persists in the supplied session storage and clears its namespace',()=>{
  const map=new Map([['other','keep']]);const storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const auth=createSessionStorage(storage);auth.setItem('fitamaster-auth','token');auth.setItem('fitamaster-auth-code-verifier','verifier');auth.clear();assert.deepEqual([...map],[['other','keep']]);
});
test('configuration fails closed for missing or privileged keys and foreign origins',()=>{
  const url='https://ormclcexntojipbyrlnh.supabase.co';assert.throws(()=>validateConfig({url,key:''}));assert.throws(()=>validateConfig({url,key:'sb_secret_bad'}));assert.throws(()=>validateConfig({url:'https://other.example',key:'sb_publishable_ok'}));
  assert.equal(validateConfig({url,key:'sb_publishable_example'}).url,url);
});
test('changing player cancels pending reports and report bodies for the previous player',async()=>{
  for(const kind of ['reports','report']){
    const f=fixture();await f.portal.refresh();let resolve;
    f.client.rpc=async(name)=>name==='fitamaster_access_status'?{data:{allowed:true,mfaRequired:false}}:name==='fitamaster_player'?{data:{profile:{id:uuid}}}:new Promise(r=>resolve=r);
    const pending=kind==='reports'?f.portal.reports({playerId:uuid}):f.portal.report(uuid);await new Promise(r=>setTimeout(r,0));
    await f.portal.player(uuid);resolve({data:{body:'previous player private text',reports:[{title:'old'}]}});await pending;
    assert.equal(f.portal.state[kind],null);assert.equal(f.portal.state.busy,false);
  }
});
test('returning to list or starting a search cannot restore a pending detail',async()=>{
  const f=fixture();await f.portal.refresh();let resolve;
  f.client.rpc=async(name)=>name==='fitamaster_access_status'?{data:{allowed:true,mfaRequired:false}}:name==='fitamaster_player'?new Promise(r=>resolve=r):{data:{players:[]}};
  const pending=f.portal.player(uuid);await new Promise(r=>setTimeout(r,0));await f.portal.players({query:'new'});resolve({data:{profile:{username:'stale'}}});await pending;
  assert.equal(f.portal.state.player,null);assert.equal(f.portal.state.selectedPlayer,null);assert.equal(f.portal.state.busy,false);
});
test('owner gating occurs before TOTP enrollment; no non-owner factor can be created',async()=>{
  for(const allowed of [false,true]){const f=fixture({allowed,aal:'aal1'});let enrollmentCount=0;
    f.client.auth.mfa.enroll=async options=>{enrollmentCount++;assert.equal(options.factorType,'totp');return {data:{id:uuid,totp:{qr_code:'data:image/svg+xml,x',secret:'private'}}};};
    await f.portal.refresh();await f.portal.enroll();assert.equal(enrollmentCount,allowed?1:0);assert.equal(f.portal.state.enrollment?.id,allowed?uuid:undefined);
  }
});
test('password and email link use Supabase auth with registration disabled',async()=>{
  const f=fixture();let passwordInput,linkInput;
  f.client.auth.signInWithPassword=async input=>{passwordInput=input;return {data:{user:{id:uuid}}};};
  f.client.auth.signInWithOtp=async input=>{linkInput=input;return {data:{}};};
  await f.portal.login('owner@example.test','private-password');await f.portal.emailLink('owner@example.test','https://fitama.app/fitamaster/');
  assert.deepEqual(passwordInput,{email:'owner@example.test',password:'private-password'});
  assert.deepEqual(linkInput,{email:'owner@example.test',options:{shouldCreateUser:false,emailRedirectTo:'https://fitama.app/fitamaster/'}});
  assert.equal(JSON.stringify(f.portal.state).includes('private-password'),false);
});

class Element {
  constructor(tag='text',value=''){this.tagName=tag;this.children=[];this.attributes={};this.value=value;this.events={};}
  set innerHTML(value){throw new Error('HTML insertion is forbidden');}
  set textContent(value){this.children=[];this.value=String(value);}
  get textContent(){return this.value+this.children.map(n=>n.textContent).join('');}
  setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key];}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;this.value='';}
  addEventListener(key,value){this.events[key]=value;}
}
const fakeDocument={createElement:tag=>new Element(tag),createTextNode:value=>new Element('text',value)};
const allNodes=node=>[node,...node.children.flatMap(allNodes)];
test('profiles, diagnostic bodies, errors and null payloads render as literal text',()=>{
  const root=new Element('root');const payload='<img src=x onerror=alert(1)>';
  renderPortal(fakeDocument,root,{phase:'ready',view:'reports',error:payload,reports:{reports:[{title:payload}],nextCursor:null},report:{title:payload,body:payload,status:'new',playerId:uuid}},{});
  assert.ok(root.textContent.includes(payload));assert.ok(root.textContent.includes('Not available'));
  assert.equal(allNodes(root).filter(n=>n.tagName==='img').length,1); // Existing brand image only.
  renderPortal(fakeDocument,root,{phase:'ready',view:'players',selectedPlayer:uuid,player:{profile:{id:uuid,username:payload,level:null},generation:null,xp:null,care:null,equipment:null,coins:null},reports:{reports:[]}},{});
  assert.ok(root.textContent.includes(payload));assert.ok(root.textContent.includes('Last reported levelNot available'));
  renderPortal(fakeDocument,root,{phase:'login'},{});assert.equal(root.textContent.includes(payload),false);assert.equal(root.textContent.includes(uuid),false);
});
test('missing config renders no sign-in or data controls',()=>{
  const root=new Element('root');renderPortal(fakeDocument,root,{phase:'config'},{});
  assert.equal(allNodes(root).some(n=>n.tagName==='input'),false);assert.ok(root.textContent.includes('Portal setup required'));
});
test('XP books render exactly the known three item counts without inventing absent values',()=>{
  assert.equal(xpBooksValue([0,2,5]),'Small Brain Energy: 0; Getting Wiser: 2; Certified Big Brain: 5');
  for(const value of [null,{},[1,2],[1,null,3],[-1,2,3]])assert.equal(xpBooksValue(value),'Not available');
});
test('current verified factor is challenged and aal1 never reaches player RPC',async()=>{
  const f=fixture({aal:'aal1'});let code;
  f.client.auth.mfa.listFactors=async()=>({data:{totp:[{id:uuid,status:'verified'}]}});
  f.client.auth.mfa.challengeAndVerify=async input=>{code=input;return {data:{}};};
  await f.portal.refresh();assert.equal(f.portal.state.phase,'challenge');await f.portal.verify('123456');
  assert.deepEqual(code,{factorId:uuid,code:'123456'});await f.portal.players();assert.equal(f.calls.some(([name])=>name==='fitamaster_players'),false);
});
test('an MFA downgrade clears previously loaded personal state',async()=>{
  const f=fixture();await f.portal.refresh();await f.portal.players();
  f.client.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1'}});await f.portal.refresh();
  assert.equal(f.portal.state.phase,'enroll');assert.equal(f.portal.state.players,null);assert.equal(f.portal.state.busy,false);
});
test('invalid or denied sessions are removed while logged-out PKCE fallback retains its verifier',async()=>{
  const map=new Map([['fitamaster-auth','old-session'],['fitamaster-auth-code-verifier','pending-link']]);
  const auth=createSessionStorage({get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
  const f=fixture();f.portal.subscribe(state=>clearAuthForPhase(auth,state.phase));await f.portal.refresh();f.portal.invalidate('login');
  assert.equal(map.has('fitamaster-auth'),false);assert.equal(map.get('fitamaster-auth-code-verifier'),'pending-link');
  f.portal.invalidate('denied');assert.equal(map.size,0);
});
test('signout erases views immediately and lets the SDK revoke its session before login cleanup',async()=>{
  const f=fixture();await f.portal.refresh();await f.portal.players();let resolve;
  f.client.auth.signOut=options=>{assert.equal(options.scope,'local');return new Promise(r=>resolve=r);};
  const pending=f.portal.signOut();assert.equal(f.portal.state.players,null);assert.equal(f.portal.state.phase,'signing-out');
  resolve({});await pending;assert.equal(f.portal.state.phase,'login');
});
test('client search and report metadata enforce the deployed backend limits before RPC',async()=>{
  const f=fixture();await f.portal.refresh();
  assert.throws(()=>f.portal.players({query:'a'.repeat(81)}),/80/);
  const body='Fitama sync diagnostics since the app started\nNo requests recorded since the app started.';
  for(const [change,message]of [[{title:'Broken 😢'},/case title/],[{title:'password reset'},/credentials/],[{build:'a'.repeat(65)},/64/],[{build:'Version 💚'},/build/],[{build:'secret'},/credentials/],[{capturedAt:'2999-01-01T00:00:00Z'},/past/]]){
    await assert.rejects(()=>f.portal.importReport({playerId:uuid,title:'Sync case #1',body,...change}),message);
  }
  assert.equal(f.calls.some(([name])=>name==='fitamaster_import_report'||name==='fitamaster_players'),false);
});
test('email fragment sessions and legacy PKCE codes are bounded while invalid callback material is scrubbed',()=>{
  const base='https://fitama.app/fitamaster/';
  assert.equal(parseAuthCallback(new URL(base+'?code=valid-code')).code,'valid-code');
  const fragment='#access_token=synthetic.access.token&refresh_token=synthetic-refresh&token_type=bearer&type=magiclink&expires_in=3600&expires_at=2000000000';
  assert.deepEqual(parseAuthCallback(new URL(base+fragment)).session,{access_token:'synthetic.access.token',refresh_token:'synthetic-refresh'});
  for(const suffix of ['#access_token=private&refresh_token=private','?access_token=private','?error=denied&error_description=private','#error=denied','?code=valid#access_token=private','?code=one&code=two','#code=hash-code']){
    const result=parseAuthCallback(new URL(base+suffix));assert.equal(result.hasCallback,true);assert.equal(result.code,null);assert.equal(result.failed,true);assert.equal(result.cleanUrl,base);
  }
  for(const suffix of [fragment+'&access_token=another',fragment+'&provider_token=private',fragment.replace('magiclink','recovery'),fragment.replace('magiclink','invite'),fragment.replace('bearer','other'),fragment.replace('access_token','ACCESS_TOKEN'),fragment.replace('synthetic-refresh','a'.repeat(4097)),'?code=old'+fragment,'?error=denied'+fragment,fragment+'&unknown=extra',fragment.replace('3600','NaN')]){
    const result=parseAuthCallback(new URL(base+suffix));assert.equal(result.failed,true);assert.equal(result.session,null);assert.equal(result.cleanUrl,base);
  }
  assert.equal(parseAuthCallback(new URL(base+'#main')).hasCallback,false);
});
test('pending signout view contains no enabled sign-in controls',()=>{
  const root=new Element('root');renderPortal(fakeDocument,root,{phase:'signing-out'},{});
  assert.ok(root.textContent.includes('Signing out…'));assert.equal(allNodes(root).some(n=>n.tagName==='input'||n.tagName==='button'),false);
});
test('rate and network verification errors fail closed without revoking the stored login',async()=>{
  for(const error of [{code:'P0001',message:'fitamaster_rate_limited'},{message:'network unavailable'}]){
    const f=fixture();await f.portal.refresh();await f.portal.players();
    const map=new Map([['fitamaster-auth','current-session']]);const auth={removeItem:key=>map.delete(key),clear:()=>map.clear()};
    f.portal.subscribe(state=>clearAuthForPhase(auth,state.phase));f.client.rpc=async()=>{if(error.message==='network unavailable')throw new TypeError('network unavailable');return {error};};await f.portal.refresh();
    assert.equal(f.portal.state.phase,'verification-error');assert.equal(f.portal.state.players,null);assert.equal(map.get('fitamaster-auth'),'current-session');
    const root=new Element('root');renderPortal(fakeDocument,root,f.portal.state,{retryVerification:()=>f.portal.refresh()});
    const retry=allNodes(root).find(node=>node.tagName==='button'&&node.textContent==='Retry access check');assert.ok(retry);
    f.client.rpc=async()=>({data:{allowed:true,mfaRequired:false}});await retry.events.click();assert.equal(f.portal.state.phase,'ready');
  }
});

function controllerFixture(){
  const root=new Element('root'),events=new Map(),windowEvents=new Map(),storageMap=new Map();
  const sessionFor=id=>({user:{id:uuid},expires_at:Math.floor(Date.now()/1000)+3600,access_token:'e30.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.sig'});
  let session=sessionFor(uuid),authCallback;
  const storage={get length(){return storageMap.size;},key:i=>[...storageMap.keys()][i],getItem:key=>storageMap.get(key)??null,setItem:(key,value)=>storageMap.set(key,value),removeItem:key=>storageMap.delete(key)};
  const document={...fakeDocument,getElementById:()=>root,visibilityState:'visible',addEventListener:(name,handler)=>events.set(name,handler),removeEventListener:name=>events.delete(name)};
  const browser={document,location:new URL('https://fitama.app/fitamaster/'),history:{replaceState(){}},sessionStorage:storage,addEventListener:(name,handler)=>windowEvents.set(name,handler),removeEventListener:name=>windowEvents.delete(name)};
  const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange:handler=>{authCallback=handler;return {data:{subscription:{unsubscribe(){}}}};},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},rpc:async name=>({data:name==='fitamaster_access_status'?{allowed:true,mfaRequired:false}:name==='fitamaster_reports'?{reports:[],nextCursor:null}:{players:[],nextCursor:null}})};
  return {root,browser,client,events,clearSession(){session=null;},emitAuth(event,newId){if(newId)session=sessionFor(newId);authCallback(event,session);}};
}
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setTimeout(resolve,0));};
test('real controller preserves an unsubmitted in-memory draft across same-session refresh only',async()=>{
  const f=controllerFixture();const running=await startPortal({window:f.browser,client:f.client});
  try{
    f.emitAuth('INITIAL_SESSION');await flush();
    allNodes(f.root).find(node=>node.tagName==='button'&&node.textContent==='Diagnostics').events.click();await flush();
    const importForm=allNodes(f.root).find(node=>node.tagName==='form');
    importForm.events.input({target:{name:'title',value:'Unsaved case'}});importForm.events.input({target:{name:'body',value:'Unsaved player text'}});
    f.events.get('visibilitychange')();await flush();f.emitAuth('SIGNED_IN');await flush();
    await running.portal.reports(); // A real view redraw must restore the input draft, not just leave old nodes untouched.
    assert.equal(allNodes(f.root).find(node=>node.attributes.id==='title').attributes.value,'Unsaved case');
    assert.equal(allNodes(f.root).find(node=>node.tagName==='textarea').textContent,'Unsaved player text');
    f.emitAuth('SIGNED_IN','22222222-2222-4222-8222-222222222222');await flush();
    allNodes(f.root).find(node=>node.tagName==='button'&&node.textContent==='Diagnostics').events.click();await flush();
    assert.equal(allNodes(f.root).find(node=>node.attributes.id==='title').attributes.value,'');assert.equal(allNodes(f.root).find(node=>node.tagName==='textarea').textContent,'');
  }finally{running.dispose();}
});
test('real controller offers retry after rate limiting and retains auth until positive denial',async()=>{
  const f=controllerFixture();const running=await startPortal({window:f.browser,client:f.client});
  try{
    await flush();f.browser.sessionStorage.setItem('fitamaster-auth','current-session');const originalRpc=f.client.rpc;
    f.client.rpc=async()=>({error:{code:'P0001',message:'fitamaster_rate_limited'}});await running.portal.refresh();
    assert.equal(running.portal.state.phase,'verification-error');assert.equal(f.browser.sessionStorage.getItem('fitamaster-auth'),'current-session');assert.equal(allNodes(f.root).some(node=>node.attributes.id==='email'),false);
    f.client.rpc=originalRpc;await allNodes(f.root).find(node=>node.tagName==='button'&&node.textContent==='Retry access check').events.click();await flush();assert.equal(running.portal.state.phase,'ready');
    f.client.rpc=async()=>({error:{code:'403'}});await running.portal.refresh();assert.equal(running.portal.state.phase,'denied');assert.equal(f.browser.sessionStorage.getItem('fitamaster-auth'),null);
  }finally{running.dispose();}
});
test('callback recovery guidance survives startup and later logged-out access checks',async()=>{
  const f=controllerFixture();f.clearSession();f.browser.location=new URL('https://fitama.app/fitamaster/?code=expired');let scrubbed;
  f.browser.history.replaceState=(state,title,url)=>{scrubbed=url;};f.client.auth.exchangeCodeForSession=async()=>({error:{code:'bad_code'}});
  const running=await startPortal({window:f.browser,client:f.client});
  try{f.emitAuth('INITIAL_SESSION');await flush();f.events.get('visibilitychange')();await flush();assert.equal(scrubbed,'https://fitama.app/fitamaster/');assert.match(f.root.textContent,/Request a new link/);assert.equal(running.portal.state.phase,'login');}
  finally{running.dispose();}
});

test('a clicked email link in a fresh tab imports a verified session but requires owner TOTP before player reads',async()=>{
  for(const allowed of [true,false]){
    const f=controllerFixture();f.clearSession();let scrubbed=false,imports=0;const calls=[];
    const session={user:{id:uuid},expires_at:Math.floor(Date.now()/1000)+3600,access_token:'synthetic.access.token'};
    f.browser.location=new URL('https://fitama.app/fitamaster/#access_token=synthetic.access.token&refresh_token=synthetic-refresh&token_type=bearer&type=magiclink&expires_in=3600');
    f.browser.history.replaceState=()=>{scrubbed=true;};
    f.client.auth.setSession=async tokens=>{assert.equal(scrubbed,true);assert.equal(f.browser.sessionStorage.length,0);assert.deepEqual(tokens,{access_token:session.access_token,refresh_token:'synthetic-refresh'});imports++;f.client.auth.getSession=async()=>({data:{session}});f.browser.sessionStorage.setItem('fitamaster-auth','synthetic-session');return {data:{session},error:null};};
    f.client.auth.getUser=async()=>({data:{user:session.user}});
    f.client.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1'}});
    f.client.auth.mfa.listFactors=async()=>({data:{totp:[{id:uuid,status:'verified'}]}});
    f.client.rpc=async name=>{calls.push(name);return {data:{allowed,mfaRequired:true}};};
    const running=await startPortal({window:f.browser,client:f.client});
    try{await flush();assert.equal(imports,1);assert.equal(running.portal.state.phase,allowed?'challenge':'denied');assert.ok(calls.includes('fitamaster_access_status'));assert.equal(calls.some(name=>name!=='fitamaster_access_status'),false);assert.equal(f.root.textContent.includes('synthetic-refresh'),false);if(!allowed)assert.equal(f.browser.sessionStorage.getItem('fitamaster-auth'),null);}
    finally{running.dispose();}
  }
});
test('malformed or rejected email callbacks never expose callback data or preexisting player views',async()=>{
  for(const malformed of [true,false]){
    const f=controllerFixture();let imported=0;const calls=[];
    f.browser.location=new URL('https://fitama.app/fitamaster/#access_token=synthetic.access.token&refresh_token=synthetic-refresh&token_type=bearer&type='+(malformed?'recovery':'magiclink'));
    f.client.auth.setSession=async()=>{imported++;return {error:{code:'invalid_token',message:'synthetic-refresh'}};};
    f.client.rpc=async name=>{calls.push(name);return {data:{allowed:true,mfaRequired:false,players:[]}};};
    const running=await startPortal({window:f.browser,client:f.client});
    try{assert.equal(imported,malformed?0:1);assert.equal(running.portal.state.phase,'login');assert.equal(calls.length,0);assert.equal(f.root.textContent.includes('synthetic-refresh'),false);assert.match(f.root.textContent,/Request a new link/);}
    finally{running.dispose();}
  }
});
