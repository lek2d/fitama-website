import {sameRest} from './condition.mjs';
const reasonLabels={egg:'Eggs do not have dungeon rest to end.',care_unavailable:'Care is unavailable or stale. Ask the player to open and sync Fitama.',not_resting:'There is no current dungeon cooldown to end.',active_dungeon:'This player has an active or unresolved dungeon.',source_changed:'The rest source changed. Refresh condition and review again.'};
const time=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'})+' (local time)':'Not available';
/** Presentation only. The controller owns intent, status recovery and all mutation guards. */
export function renderPetCondition(document,{player,data,busy=false,error='',rest={},now=Date.now()},actions={}){
 function h(tag,props={},...children){const node=document.createElement(tag);for(const [key,value]of Object.entries(props)){if(key==='class')node.className=value;else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);else if(key==='disabled')node.disabled=!!value;else node.setAttribute(key,String(value));}for(const child of children.flat())if(child!==null&&child!==undefined)node.append(typeof child==='string'?document.createTextNode(child):child);return node;}
 const note=text=>h('p',{class:'source condition-note'},text);
 const facts=rows=>h('dl',{class:'facts'},...rows.map(([label,value])=>h('div',{class:'fact'},h('dt',{},label),h('dd',{},value===null||value===undefined?'Not available':String(value)))));
 const button=(label,action,disabled=false)=>h('button',{type:'button',disabled:busy||rest.busy||disabled,class:'secondary',onclick:()=>{if(!busy&&!rest.busy&&!disabled)action?.();}},label);
 const section=h('section',{class:'section condition-section'},h('div',{class:'section-heading condition-heading'},h('h2',{},'Pet condition'),button('Refresh condition',actions.refresh,!!rest.uncertain)));
 if(error)section.append(h('p',{class:'message error',role:'alert'},error));
 if(!data)section.append(note(busy?'Loading current server condition…':'Current server condition is unavailable. Refresh condition to try again.'));
 else{
  const health=data.health,source=data.dungeonRest,daily=data.dailyEntries;
  section.append(facts([
   ['Hearts',health.available?health.hearts+' of 3':'Unknown'],['Health status',health.available?(health.hearts===0?'Hibernating — zero hearts':'Hearts available'):'Unknown'],['Next heart',time(health.nextHeartAt)],
   ['Dungeon cooldown',{resting:'Resting',not_resting:'Not resting',unknown:'Unknown'}[source.status]],['Rest until',time(source.restUntil)],
   ['Active dungeon',data.activeDungeon?'Active or unresolved dungeon':'No active dungeon'],['Recorded daily entries',daily.used+' of '+daily.limit],['Entries reset',time(daily.resetsAt)],
  ]),note('Hearts, dungeon cooldown and recorded daily entries are separate. Ending rest does not guarantee dungeon entry. Recorded counts may not include every admission requirement.'),
  h('details',{class:'condition-record'},h('summary',{},'Server record details'),facts([
   ['Rest source battle',source.sourceBattleId],['Rest source outcome',source.sourceStatus],['Rest began',time(source.restedAt)],['Rest timezone',source.timeZone],['Active battle',data.activeDungeon?.battleId||'None'],
   ['Entry day began',time(daily.dayStartedAt)],['Entry timezone',daily.timeZone],['Care revision',data.careRevision],['Server observed',time(data.observedAt)],
  ])));
 }
 const panel=h('details',{class:'rest-panel',...(rest.open?{open:''}:{}),ontoggle:event=>actions.toggle?.(!!event.currentTarget.open)},h('summary',{},'End dungeon rest'));
 const receipt=rest.result,review=rest.review;
 if(receipt){
  panel.append(h('div',{class:'rest-result',role:'status'},h('h3',{tabindex:-1},'Dungeon rest ended'),facts([
   ['Before — previous rest until',time(receipt.previousRestUntil)],['After — cooldown from this battle','Ended'],['Ended at',time(receipt.endedAt)],
   ['Player UUID',receipt.playerId],['Source battle',receipt.sourceBattleId],['Reason',receipt.reason],['Rest timezone',receipt.timeZone],['Care revision',receipt.careRevision],['Receipt',receipt.requestId],
  ]),note('Saved in admin history. Ask the player to reopen or refresh Fitama online and wait for a successful sync. If rest still appears, refresh again or report the issue. This action applies to the server-recorded dungeon cooldown.'),note('This cleared only the recorded dungeon cooldown. Hearts, TP, items, daily entries and dungeon results were not changed.')));
 }else if(review||rest.uncertain){
  panel.append(h('h3',{tabindex:-1},rest.uncertain?'Check rest clearance':'Review end dungeon rest'),facts([
   ['Player',review?.username],['Friend code',review?.friendCode],['Player UUID',review?.playerId],['Reset generation',review?.generation],['Source battle',review?.sourceBattleId],['Rest began',time(review?.restedAt)],['Before — rest until',time(review?.restUntil)],['Rest timezone',review?.timeZone],['Hearts',review?.hearts],['Reason',review?.reason],
  ]),note('After confirmation, this battle’s dungeon cooldown will end. Hearts, TP, items, daily entry counts, rewards and progress stay the same. This does not guarantee dungeon entry.'));
  if(rest.uncertain){panel.append(note(rest.statusChecked?'No completed clearance was found. You may retry this same request.':'The result is unknown. Check clearance status before retrying.'),h('div',{class:'actions rest-actions'},button('Check clearance status',actions.checkStatus),rest.statusChecked?button('Retry same clearance',actions.confirm):null));}
  else{
   const valid=player?.profile?.id===review?.playerId&&player?.generation===review?.generation&&data?.endRest.allowed&&sameRest(data,review)&&Date.parse(review.restUntil)>now;
   panel.append(h('div',{class:'actions rest-actions'},button('Edit reason',actions.edit),button('Confirm end rest',actions.confirm,!valid)));
   if(!valid)panel.append(note('The player or dungeon rest changed or expired. Refresh condition and review again.'));
  }
 }else if(data?.endRest.allowed&&Date.parse(data.dungeonRest.restUntil)>now){
  const reason=h('textarea',{id:'rest-reason',name:'reason',rows:2,required:'',maxlength:480,disabled:busy,'aria-describedby':'rest-reason-note',autocomplete:'off'},rest.draft?.reason||'');
  reason.addEventListener('input',event=>actions.change?.('reason',event.currentTarget.value));
  const form=h('form',{class:'rest-form',onsubmit:event=>{event.preventDefault();if(!busy&&!rest.busy)actions.review?.({reason:reason.value??rest.draft?.reason??''});}},h('label',{for:'rest-reason'},'Reason'),reason,h('p',{id:'rest-reason-note',class:'source condition-note'},'1–240 characters on one line. Saved in admin history.'),h('button',{type:'submit',disabled:busy||rest.busy},'Review end rest'));
  panel.append(note('Clear only the current server dungeon cooldown for this player. Review the player, battle and reason before confirming.'),form);
 }else panel.append(note(reasonLabels[data?.endRest.blockedReason]||(data?'Dungeon rest changed or expired. Refresh condition.':'A verified condition is required before ending rest.')));
 section.append(panel);return section;
}
