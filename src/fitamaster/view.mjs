import {petCardModel} from './pet-card.mjs';
import {renderInventory,ITEM_CATALOG} from './inventory.mjs';
import {renderItemGrant} from './grant-view.mjs';
export const textValue=value=>value===null||value===undefined?'Not available':typeof value==='boolean'?(value?'Yes':'No'):typeof value==='object'?'Not available':String(value);
export function timeValue(value){if(!value)return 'Not available';const date=new Date(value);return Number.isNaN(date.valueOf())?'Not available':date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'})+' (local time)';}
export function xpBooksValue(value){if(!Array.isArray(value)||value.length!==3||value.some(count=>!Number.isInteger(count)||count<0))return 'Not available';return ['Small Brain Energy','Getting Wiser','Certified Big Brain'].map((name,index)=>name+': '+value[index]).join('; ');}
// All remote strings become text nodes. Never interpret a profile, report, or error as markup.
export function renderPortal(document,root,state,actions,ui={}) {
  let petArtwork=null;
  function h(tag,props={},...children){const node=document.createElement(tag);for(const [key,value]of Object.entries(props)){if(key==='class')node.className=value;else if(key==='text')node.textContent=value;else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);else if(key==='disabled')node.disabled=!!value;else node.setAttribute(key,String(value));}for(const child of children.flat()){if(child===null||child===undefined)continue;node.append(typeof child==='string'?document.createTextNode(child):child);}return node;}
  const button=(text,onclick,props={})=>h('button',{type:'button',onclick,disabled:state.busy,...props},text);
  const note=(text,kind='muted')=>h('p',{class:kind},text);
  const heading=(text,level=2)=>h('h'+level,{},text);
  const field=(label,name,type='text',props={})=>{const input=h('input',{id:name,name,type,...props});return [h('label',{for:name},label),input];};
  const row=(label,value,isTime=false)=>h('div',{class:'fact'},h('dt',{},label),h('dd',{},isTime?timeValue(value):textValue(value)));
  const facts=items=>h('dl',{class:'facts'},...items.map(([label,value,isTime])=>row(label,value,isTime)));
  const section=(title,...content)=>h('section',{class:'section'},heading(title),...content);
  const submit=(text)=>h('button',{type:'submit',disabled:state.busy},state.busy?'Working…':text);
  function form(handler,...content){return h('form',{onsubmit:event=>{event.preventDefault();if(!state.busy)handler(new FormData(event.currentTarget));}},...content);}
  function importForm(...content){const node=form(data=>actions.importReport(Object.fromEntries(data)),...content);node.addEventListener('input',event=>actions.updateDraft(event.target.name,event.target.value));return node;}
  function emailLinkForm(){const node=form(data=>actions.emailLink(String(data.get('link-email'))),...field('Email','link-email','email',{autocomplete:'email',required:true,value:ui.emailLinkEmail||''}),submit('Send sign-in link'));node.addEventListener('input',event=>{if(event.target.name==='link-email')actions.updateEmailLinkEmail(event.target.value);});return node;}
  const pager=(kind,data)=>h('div',{class:'pager'},button('Previous',()=>actions.page(kind,'previous'),{disabled:state.busy||!ui.pages?.[kind]?.length}),button('Next',()=>actions.page(kind,'next',data?.nextCursor),{disabled:state.busy||!data?.nextCursor}));
  const observed=data=>note('Server observed: '+timeValue(data?.observedAt),'timestamp');
  function playerList(){
    const search=form(data=>actions.search(String(data.get('query')||'')),h('div',{class:'search-field'},...field('Username, friend code prefix, or exact player UUID','query','search',{value:state.query||'',maxlength:80,autocomplete:'off'})),submit('Search'));
    const data=state.players;
    const content=[h('div',{class:'section-heading'},heading('Players',1)),search];
    if(!data)content.push(note(state.busy?'Loading players…':'Search for a player to begin.'));
    else {if(!data.players?.length)content.push(note('No players match this search.'));
      else {const table=h('table',{},h('caption',{class:'sr-only'},'Players returned by the server'),h('thead',{},h('tr',{},...['Player','Pet','Reported level','Reported daily TP','Profile updated'].map(t=>h('th',{scope:'col'},t)))),h('tbody',{},...data.players.map(p=>h('tr',{},h('td',{},button(textValue(p.username),()=>actions.player(p.id),{class:'text-button'}),h('span',{class:'subline'},textValue(p.friendCode))),h('td',{},textValue(p.petName),h('span',{class:'subline'},[p.petVariant,p.petStage].filter(v=>v!==null&&v!==undefined).join(' · ')||'Not available')),h('td',{class:'number'},textValue(p.level)),h('td',{class:'number'},textValue(p.todayTp),h('span',{class:'subline'},'Expires: '+timeValue(p.tpExpiresAt))),h('td',{},timeValue(p.updatedAt))))));content.push(h('div',{class:'table-scroll',tabindex:0,'aria-label':'Player table; scroll horizontally if needed'},table));}
      content.push(pager('players',data),observed(data));}
    return h('section',{class:'section'},...content);
  }
  function reportsList(){const data=state.reports;const content=[heading(state.selectedPlayer?'Player diagnostics':'Diagnostics',state.view==='reports'?1:2),note('Player-shared minimal sync text only. Imports are unverified and expire after 30 days. Reports are not retrieved from a player’s phone.')];
    if(!data)content.push(note(state.busy?'Loading diagnostics…':'No diagnostics loaded.'));
    else {if(!data.reports?.length)content.push(note('No active diagnostics reports.'));else content.push(h('ul',{class:'report-list'},...data.reports.map(report=>h('li',{},button(textValue(report.title),()=>actions.report(report.id),{class:'text-button'}),h('span',{class:'subline'},`${textValue(report.username)} · ${textValue(report.status)}`),h('span',{class:'subline'},'Received '+timeValue(report.receivedAt))))));content.push(pager('reports',data),observed(data));}
    return h('section',{class:'section'},...content);
  }
  function reportView(){const report=state.report;if(!report)return null;
    return section('Report details',note('Admin imported · Unverified','source'),heading(textValue(report.title),3),facts([['Player UUID',report.playerId],['Status',report.status],['Captured at (player supplied)',report.capturedAt,true],['Build (player supplied)',report.build],['Received at (server)',report.receivedAt,true],['Expires at',report.expiresAt,true]]),h('pre',{class:'report-body',tabindex:0},textValue(report.body)),h('div',{class:'actions'},button(report.status==='reviewed'?'Mark as new':'Mark reviewed',()=>actions.review(report.id,report.status==='reviewed'?'new':'reviewed'))));
  }
  function importView(){const draft=ui.importDraft||{};return h('details',{class:'section import-panel',...(ui.importOpen?{open:''}:{}),ontoggle:event=>actions.setImportOpen(event.currentTarget.open)},h('summary',{},'Import player-shared diagnostics'),note('Ask the player to share the existing “Fitama sync diagnostics since the app started” text. Recovery JSON and Health data are not accepted.'),importForm(...field('Target player UUID','playerId','text',{value:draft.playerId||state.selectedPlayer||'',required:true,autocomplete:'off',spellcheck:'false',maxlength:36}),...field('Case title','title','text',{value:draft.title||'',required:true,maxlength:120,autocomplete:'off'}),note('Use letters, numbers, spaces and . _ ( ) # - for the case title. Start with a letter or number. Do not include credentials.'),h('label',{for:'body'},'Minimal sync diagnostics text (maximum 32 KiB)'),h('textarea',{id:'body',name:'body',rows:8,required:true,maxlength:32768,spellcheck:'false'},draft.body||''),h('div',{class:'form-columns'},h('div',{},...field('Captured at, if supplied (your local time)','capturedAt','datetime-local',{value:draft.capturedAt||''})),h('div',{},...field('Build, if supplied','build','text',{value:draft.build||'',maxlength:64,autocomplete:'off'}))),submit('Import diagnostics')));}
  function petCardView(player){
    const card=petCardModel(player);
    if(!card)return section('Fitama Card',note('A saved pet card is not available for this player.'));
    const frame=h('div',{class:'saved-pet-art','aria-hidden':'true'});
    petArtwork={frame,card:player.petCard};
    const scene=h('div',{class:'saved-pet-scene',role:'img','aria-label':`${card.name}, ${card.species}. ${card.status}.`},h('img',{class:'saved-pet-platform',src:'/assets/storyboard/platform-pet.png',alt:'',width:300,height:268}),frame);
    return section('Fitama Card',h('div',{class:'saved-pet-card'},scene,h('div',{class:'saved-pet-info'},h('span',{class:'pet-species'},card.species[0].toUpperCase()+card.species.slice(1)),heading(card.name,3),h('p',{class:'pet-owner'},card.owner),h('dl',{class:'pet-card-stats'},row('Level',card.level),row('Weekly rank',card.rank),row('TP',card.tp)),h('dl',{class:'pet-card-status'},row('Status',card.status),row('Country',card.country)))),note('Last synced server card. Offline changes on the player’s phone may not appear yet.','source'),facts([['TP snapshot expires',player.petCard.tpExpiresAt,true],['Profile updated',player.petCard.profileUpdatedAt,true],['Appearance saved',player.petCard.appearanceUpdatedAt,true]]));
  }
  function playerView(){const p=state.player;if(!p)return h('section',{class:'section'},heading('Player details',1),note('Loading server-confirmed details…'));
    const profile=p.profile||{};
    return h('div',{},h('section',{class:'section'},button('Back to players',actions.backPlayers,{class:'secondary'}),heading(textValue(profile.username),1),note('Server profile and cloud state. Missing values remain unavailable.','source'),facts([['Player UUID',profile.id],['Friend code',profile.friendCode],['Display name',profile.displayName],['Country',profile.countryCode],['Profile created',profile.createdAt,true],['Profile updated',profile.updatedAt,true]]),observed(p)),
      petCardView(p),renderItemGrant(document,{player:p,...ui.itemGrant,busy:state.busy||ui.itemGrant?.busy},actions.itemGrant||{}),renderInventory(document,p),
      section('Profile TP report',note('The raw daily TP report can differ from the Fitama Card total. It is not a spendable balance.','source'),facts([['Last reported level',profile.level],['Reported daily TP',profile.todayTp],['TP started',profile.tpStartedAt,true],['TP expires',profile.tpExpiresAt,true]])),
      section('Ordinary XP ledger',facts([['Reset generation',p.generation],['Baseline XP',p.xp?.baseline],['Granted XP',p.xp?.granted],['Ordinary XP total',p.xp?.total],['Migration status',p.xp?.migrationStatus],['Revision',p.xp?.revision]])),
      section('Care record',note('Stored care values; the card’s resting pose uses the effective server status.','source'),facts([['Stored hearts',p.care?.hearts],['Heart units',p.care?.heartUnits],['Bond XP',p.care?.bondXp],['Care updated',p.care?.updatedAt,true],['Care revision',p.care?.revision]])),reportsList(),reportView(),importView());
  }
  function historyView(){const data=state.history;return h('section',{class:'section'},heading('Admin history',1),note('Successful portal access, reads, item grants, imports and reviews. Failed sign-ins and denied access are recorded separately in Auth logs.'),!data?note('Loading history…'):!data.events?.length?note('No admin events recorded.'):h('ol',{class:'history-list'},...data.events.map(event=>h('li',{},h('strong',{},textValue(event.action)),h('time',{},timeValue(event.createdAt)),facts([['Event ID',event.id],['Actor',event.actorId],['Player',event.playerId],['Report',event.reportId],['Request',event.requestId],...(event.itemGrant?[['Item',ITEM_CATALOG.find(item=>item.itemId===event.itemGrant.itemId)?.name||event.itemGrant.itemId],['Quantity',event.itemGrant.quantity],['Reason',event.itemGrant.reason],['Reset generation',event.itemGrant.generation],['Granted',event.itemGrant.grantedAt,true]]:[])])))),data?pager('history',data):null,data?observed(data):null);}
  const header=h('header',{class:'site-header'},h('a',{href:'/',class:'brand','aria-label':'Fitama home'},h('img',{src:'../assets/fitama-logo-glossy.png',alt:'Fitama',width:118,height:48})),h('span',{class:'portal-name'},'Fitamaster'),state.phase==='ready'?button('Sign out',actions.signOut,{class:'secondary'}):null);
  const main=h('main',{id:'main',tabindex:-1});
  if(state.error)main.append(h('p',{class:'message error',role:'alert'},state.error));if(state.notice)main.append(h('p',{class:'message notice',role:'status'},state.notice));
  if(state.phase==='ready'){
    main.append(h('nav',{class:'portal-nav','aria-label':'Owner portal'},...['players','reports','history'].map(view=>button({players:'Players',reports:'Diagnostics',history:'History'}[view],()=>actions.navigate(view),{'aria-current':state.view===view?'page':'false',class:'nav-button'}))),h('div',{'aria-live':'polite',class:'sr-only'},state.busy?'Loading…':''));
    main.append(state.view==='history'?historyView():state.view==='reports'?h('div',{},reportsList(),reportView(),importView()):state.selectedPlayer?playerView():playerList());
  } else {
    const auth=h('section',{class:'auth-panel'});
    if(state.phase==='config')auth.append(heading('Portal setup required',1),note('This portal is not ready for sign-in. Owner setup must be completed first.'));
    else if(state.phase==='signing-out')auth.append(heading('Signing out…',1),note('Closing your session.'));
    else if(state.phase==='loading')auth.append(heading('Checking access…',1),note('Verifying your session and owner access.'));
    else if(state.phase==='denied')auth.append(heading('Access unavailable',1),note('This portal is restricted to the configured owner account.'),button('Sign out',actions.signOut));
    else if(state.phase==='verification-error')auth.append(heading('Access check interrupted',1),note('Player views have been cleared. Retry the access check when your connection is available. If requests were limited, wait a minute first.'),button('Retry access check',actions.retryVerification),button('Sign out',actions.signOut,{class:'secondary'}));
    else if(state.phase==='enroll'||state.phase==='challenge'){
      auth.append(heading(state.phase==='enroll'?'Set up two-factor sign-in':'Verify your sign-in',1));
      if(state.phase==='enroll'&&!state.enrollment)auth.append(note('Owner access is verified. Add Fitamaster to an authenticator app to protect this session.'),button('Set up authenticator',actions.enroll));
      else {
        if(state.enrollment){const totp=state.enrollment.totp;auth.append(note('Scan this QR code with your authenticator app. Then enter its six-digit code.'));if(totp?.qr_code?.startsWith('data:image/svg+xml'))auth.append(h('img',{class:'totp-qr',src:totp.qr_code,alt:'QR code for authenticator enrollment',width:216,height:216}));if(totp?.secret)auth.append(h('details',{},h('summary',{},'Enter a setup key instead'),h('p',{class:'setup-key'},totp.secret)));}
        else auth.append(note('Enter the current six-digit code from your authenticator app.'));
        auth.append(form(data=>actions.verify(String(data.get('code')||'')),...field('Authenticator code','code','text',{inputmode:'numeric',pattern:'[0-9]{6}',maxlength:6,minlength:6,autocomplete:'one-time-code',required:true}),submit('Verify')));
      }
      auth.append(button('Sign out',actions.signOut,{class:'secondary'}));
    } else {
      auth.append(heading('Owner sign-in',1),note('Sign in to look up players and review shared sync diagnostics. An authenticator code is required after sign-in.'),form(data=>actions.login(String(data.get('email')),String(data.get('password'))),...field('Email','email','email',{autocomplete:'username',required:true}),...field('Password','password','password',{autocomplete:'current-password',required:true}),submit('Sign in')),h('details',{class:'email-fallback',...(ui.emailLinkOpen?{open:''}:{}),ontoggle:event=>actions.setEmailLinkOpen(event.currentTarget.open)},h('summary',{},'Use an email sign-in link'),note('Open the newest sign-in link from your email. It can open in a new tab or another browser. You will still need your authenticator code.'),emailLinkForm()));
    }
    main.append(auth);
  }
  const footer=h('footer',{},h('p',{},'Owner support portal · Server access checks apply to every request.'),h('p',{},'Session and views are cleared when you sign out. Player data is not saved on this device.'));
  root.replaceChildren(h('a',{href:'#main',class:'skip-link'},'Skip to content'),header,main,footer);
  return {petArtwork};
}
