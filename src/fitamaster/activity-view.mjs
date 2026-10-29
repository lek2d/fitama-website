import {parsePlayerActivity,activityLabels,reviewLabels} from './activity.mjs';
const dateTime=new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});
const creditReasons={no_credit_record:'No credit record',before_creation:'Before account creation',reset_excluded:'Excluded by reset',future:'Not yet observed',invalid_credit:'Invalid credit excluded'};
export function renderPlayerActivity(document,{player,data,period='weekly',offset=0,busy=false,error='',needsReload=false}={},actions={}){
 function h(tag,props={},...children){const node=document.createElement(tag);for(const [key,value]of Object.entries(props)){if(key==='class')node.className=value;else if(key==='disabled')node.disabled=!!value;else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);else node.setAttribute(key,String(value));}for(const child of children.flat())if(child!==null&&child!==undefined)node.append(typeof child==='string'?document.createTextNode(child):child);return node;}
 const target=player?.profile?.id&&Number.isSafeInteger(player?.generation)&&player.generation>=0,disabled=busy||needsReload||!target;
 const note=text=>h('p',{class:'activity-note muted'},text);
 const time=value=>value?h('time',{datetime:value},dateTime.format(new Date(value))):'No observation in this period';
 const fact=(label,value)=>h('div',{class:'fact'},h('dt',{},label),h('dd',{},value));
 const button=(text,id,action,unavailable=false)=>h('button',{type:'button',id,class:'secondary',disabled:disabled||unavailable,onclick:()=>{if(!disabled&&!unavailable)action?.();}},text);
 const select=h('select',{id:'activity-period',disabled,onchange:event=>{if(!disabled&&['weekly','monthly'].includes(event.currentTarget.value))actions.period?.(event.currentTarget.value);}},
  ...[['weekly','Week'],['monthly','Month']].map(([value,label])=>h('option',{value,...(period===value?{selected:''}:{})},label)));
 const section=h('section',{class:'section activity-section','aria-labelledby':'activity-heading','aria-busy':busy?'true':'false'},
  h('div',{class:'section-heading activity-heading'},h('h2',{id:'activity-heading'},'Activity and TP'),button('Refresh activity','activity-refresh',()=>actions.refresh?.())),
  h('div',{class:'activity-controls'},h('div',{class:'activity-period-field'},h('label',{for:'activity-period'},'Calendar period'),select),
   h('div',{class:'activity-period-navigation','aria-label':'Activity period navigation'},button('Previous period','activity-previous',()=>actions.offset?.(offset+1),offset>=5),button('Next period','activity-next',()=>actions.offset?.(offset-1),offset<=0))),
  note((offset===0?'Current calendar ':offset+' calendar ')+(period==='monthly'?'month':'week')+(offset>0?(offset===1?' earlier':'s earlier'):'')+'. Refresh updates this activity panel only; item history has its own period.'));
 let result=null;
 if(!busy&&!error&&!needsReload&&target){try{result=parsePlayerActivity(data,{playerId:player.profile.id,generation:player.generation,period,offset});}catch{}}
 if(!result){
  section.append(h('dl',{class:'facts activity-status'},fact('Activity','Unknown'),fact('Review','Not assessed')));
  if(busy)section.append(h('p',{class:'activity-note muted',role:'status'},'Loading activity and TP…'));
  else if(error)section.append(h('p',{class:'message error',role:'alert'},String(error)));
  else section.append(note(needsReload?'Reload player details before viewing activity.':target?'Activity and TP are unavailable for this player or period. Refresh activity to try again.':'Load a player’s current details to view activity.'));
  return section;
 }
 const summary=result.summary,unknown=result.activity.code==='unknown';
 section.append(h('dl',{class:'facts activity-range'},fact('From (inclusive)',time(result.period.startsAt)),fact('Until (exclusive)',time(result.period.endsAt)),fact('Server observed',time(result.observedAt))),
  note('Asia/Manila · Game days start at 04:00. '+(result.period.inProgress?'This period is in progress; later days have not yet been observed.':'This calendar period has ended.')),
  h('dl',{class:'facts activity-status'},fact('Activity',activityLabels[result.activity.code]),fact('Review',h('span',{class:'activity-review '+(unknown?'':result.review.state)},unknown?'Not assessed':reviewLabels[result.review.state]))),
  note(unknown?'The available activity sources could not be assessed.':result.activity.code==='fully_active'?'At least one recorded own quest claim and one own dungeon attack in this period (activity-v1).':result.activity.code==='app_active'?'At least one recorded visit day, own quest claim or own dungeon attack in this period (activity-v1).':'No matching retained activity observations. Offline use, older clients, pre-Home eggs and incomplete history may be missing (activity-v1).'));
 if(!unknown&&result.review.state==='no_flags')section.append(note('No configured flags in the available records (review-v1). Engagement and review are assessed separately.'));
 if(!unknown)for(const signal of result.review.signals){
  if(signal.code==='activity_evidence_limited')section.append(h('p',{class:'activity-signal evidence_limited'},h('strong',{},'Activity evidence limited. '),'Ranking TP was credited, but no retained visit, own quest claim or own dungeon attack was observed in this period. Offline reporting, older clients and collection gaps are possible. Days: '+signal.days.join(', ')+'. Recorded credit: '+signal.value+'. Rule: review-v1.'));
  else section.append(h('p',{class:'activity-signal needs_review'},h('strong',{},'TP data needs review. '),'A retained ranking credit is outside its stored numeric contract and is excluded from totals. Day: '+signal.days.join(', ')+'. Observed value: '+signal.value+'. Rule: review-v1.'));
 }
 section.append(h('h3',{},'Recorded period totals'),note('Ranking TP credited is accepted ranking-day credit, separate from the Home balance, spendable TP and rank score. Totals cover included retained records only and may be partial.'),
  h('dl',{class:'facts activity-metrics'},...[
   ['Ranking TP credited',String(summary.rankingTp)],['Recorded TP days',String(summary.recordedTpDays)],['Highest included daily credit',summary.highestDailyTp===null?'Unknown / excluded':String(summary.highestDailyTp)],
   ['Recorded visit days',String(summary.visitDays)],['Recorded own quest claims',String(summary.questClaims)],['Own dungeon attacks',String(summary.dungeonAttacks)],
   ['Last recorded visit in this period',time(summary.lastRecordedVisitAt)],['Last recorded own action in this period',time(summary.lastRecordedActionAt)],['Progress generation','Generation '+result.generation]
  ].map(([label,value])=>fact(label,value))),
  note('Retained records only. Visits are foreground observations on distinct game days, not sign-ins, sessions or online presence. Quest counts cover recorded claims and exclude legacy Mumu receipt-only claims. No retained credit record means zero recorded credit; it does not establish what the player did.'));
 if(result.resetAt)section.append(h('p',{class:'activity-note muted'},'Progress reset recorded: ',time(result.resetAt),'. Ranking credit on the reset game day and earlier is excluded. Own quest claims and dungeon attacks use the current generation and reset bound. Visit observations remain separate across resets. '+result.coverage.resetExcludedDays+' days excluded in this period.'));
 else section.append(note('Own quest claims and dungeon attacks use the current progress generation. Visit observations have separate coverage.'));
 if(result.coverage.createdDuringPeriod)section.append(note('This account was created during the selected period. Earlier days are unknown and excluded.'));
 const table=h('table',{class:'activity-daily-table'},h('caption',{},'Daily recorded activity and ranking credit · Asia/Manila'),
  h('thead',{},h('tr',{},...['Game day','Ranking TP credited','Recorded visit day','Own quest claims','Own dungeon attacks'].map(label=>h('th',{scope:'col'},label)))),
  h('tbody',{},...result.days.map(row=>h('tr',{},h('th',{scope:'row'},h('time',{datetime:row.day},row.day)),
   h('td',{class:'number'},row.rankingTp===null?creditReasons[row.creditStatus]:String(row.rankingTp),row.creditStatus==='no_credit_record'?h('span',{class:'subline'},creditReasons[row.creditStatus]):null),
   ...['visitDays','questClaims','dungeonAttacks'].map(key=>h('td',{class:'number'},['future','before_creation'].includes(row.creditStatus)?'Not observed':String(row[key])))))));
 section.append(h('div',{class:'table-scroll activity-table-scroll',tabindex:0,role:'region','aria-label':'Daily activity table; scroll horizontally if needed'},table));
 return section;
}
