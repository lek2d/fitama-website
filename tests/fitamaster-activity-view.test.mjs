import test from 'node:test';
import assert from 'node:assert/strict';
import {activityDto,playerId,otherId} from './fixtures/fitamaster-activity.mjs';
import {Element,document,nodes,tags,button,click} from './fixtures/fitamaster-dom.mjs';
import {renderPortal} from '../src/fitamaster/view.mjs';
const api=await import('../src/fitamaster/activity-view.mjs').catch(()=>({}));
const player={profile:{id:playerId},generation:2};
function fixture(patch={}){
 assert.equal(typeof api.renderPlayerActivity,'function');const calls=[];
 const actions=Object.fromEntries(['period','offset','refresh'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 return {root:api.renderPlayerActivity(document,{player,data:activityDto(),period:'weekly',offset:0,busy:false,...patch},actions),calls};
}
test('activity panel names calendar bounds, ranking credit, independent review and limited coverage',()=>{
 const {root}=fixture();
 for(const text of ['Activity and TP','Fully active','No configured flags','Ranking TP credited','Asia/Manila','04:00','inclusive','exclusive','in progress','recorded','legacy Mumu','Last recorded visit in this period','Generation 2'])assert.ok(root.textContent.includes(text),text);
 assert.ok(tags(root,'time').some(node=>node.attributes.datetime==='2026-10-25T20:00:00Z'));
 assert.equal(tags(root,'table').length,1);assert.equal(tags(root,'tbody')[0].children.length,7);assert.equal(tags(root,'caption').length,1);
 assert.ok(tags(root,'th').every(node=>node.attributes.scope));
 assert.match(root.textContent,/Not yet observed/);assert.doesNotMatch(root.textContent,/clean|legitimate|cheat|steps|workout|formula|\b1675\b/i);
});
test('native calendar and bounded period controls act only on validated choices, with scoped Refresh',()=>{
 const {root,calls}=fixture();assert.deepEqual(calls,[]);
 const select=tags(root,'select')[0];assert.deepEqual(tags(select,'option').map(node=>node.attributes.value),['weekly','monthly']);
 for(const value of ['rolling','30',''])select.events.change({currentTarget:{value}});
 select.events.change({currentTarget:{value:'monthly'}});click(button(root,'Previous period'));click(button(root,'Next period'));click(button(root,'Refresh activity'));
 assert.deepEqual(calls,[['period','monthly'],['offset',1],['refresh']]);assert.equal(button(root,'Next period').disabled,true);
 assert.equal(button(fixture({offset:5,data:null}).root,'Previous period').disabled,true);
});
test('loading, errors and mismatched projections never present old totals or inactivity',()=>{
 for(const state of [{busy:true},{error:'Retry this read.'},{data:null},{data:activityDto({playerId:otherId})},{data:activityDto({generation:3})},{period:'monthly'}]){
  const {root}=fixture(state);assert.equal(tags(root,'table').length,0);assert.doesNotMatch(root.textContent,/Ranking TP credited300|Fully active|No recorded activity/);
  assert.match(root.textContent,/Unknown/);assert.match(root.textContent,/Not assessed/);
 }
 const {root,calls}=fixture({busy:true});assert.ok(tags(root,'button').every(node=>node.disabled));click(button(root,'Refresh activity'));assert.deepEqual(calls,[]);
 const failed=fixture({error:'<img src=x onerror=1>'});assert.ok(failed.root.textContent.includes('<img src=x onerror=1>'));assert.equal(tags(failed.root,'img').length,0);click(button(failed.root,'Refresh activity'));assert.deepEqual(failed.calls,[['refresh']]);
});
test('reset and invalid-credit rows show exclusion reasons while visits remain separate',()=>{
 const data=activityDto({resetAt:'2026-10-27T09:00:00Z'});data.days[0]={...data.days[0],rankingTp:null,creditStatus:'reset_excluded',questClaims:0};data.days[1]={...data.days[1],rankingTp:null,creditStatus:'reset_excluded',dungeonAttacks:0};
 data.days[2]={...data.days[2],rankingTp:null,creditStatus:'invalid_credit'};data.summary={...data.summary,rankingTp:0,recordedTpDays:0,highestDailyTp:0,questClaims:0,dungeonAttacks:0,lastRecordedActionAt:null};
 data.coverage.resetExcludedDays=2;data.activity.code='app_active';data.review={state:'needs_review',ruleVersion:'review-v1',signals:[{code:'tp_data_needs_review',days:['2026-10-28'],value:-4}]};
 const {root}=fixture({data});assert.match(root.textContent,/TP data needs review/);assert.match(root.textContent,/Excluded by reset/);assert.match(root.textContent,/Invalid credit excluded/);assert.match(root.textContent,/-4/);assert.match(root.textContent,/review-v1/);assert.match(root.textContent,/Visit observations remain/);
});
test('player list adds current-week activity/review without losing old fields, and missing summaries stay unknown',()=>{
 const root=new Element('root'),dto=activityDto();
 const list={observedAt:dto.observedAt,activityPeriod:{startsAt:dto.period.startsAt,endsAt:dto.period.endsAt,timeZone:'Asia/Manila'},players:[{id:playerId,username:'Alpha',level:8,todayTp:42,updatedAt:'2026-10-28T09:00:00Z',activitySummary:{code:'fully_active',reviewState:'no_flags',rankingTp:300,visitDays:2,questClaims:1,dungeonAttacks:1}},{id:otherId,username:'Beta'}]};
 renderPortal(document,root,{phase:'ready',view:'players',players:list,busy:false},{},{});
 const headings=tags(root,'th').map(node=>node.textContent);assert.deepEqual(headings,['Player','Pet','Reported level','Reported daily TP','Activity','Review','Profile updated']);
 assert.match(root.textContent,/Fully active/);assert.match(root.textContent,/No configured flags/);assert.match(root.textContent,/Unknown/);assert.match(root.textContent,/Not assessed/);assert.match(root.textContent,/Current calendar week/);assert.match(root.textContent,/42/);
 assert.match(root.textContent,/From \(inclusive\)/);assert.match(root.textContent,/Until \(exclusive\)/);
 for(const bound of ['startsAt','endsAt'])assert.ok(tags(root,'time').some(node=>node.attributes.datetime===list.activityPeriod[bound]));
 for(const activityPeriod of [null,{...list.activityPeriod,startsAt:'2026-10-25T00:00:00Z'}]){
  renderPortal(document,root,{phase:'ready',view:'players',players:{...list,activityPeriod},busy:false},{},{});
  assert.match(root.textContent,/Period unavailable/);assert.doesNotMatch(root.textContent,/Fully active|No configured flags/);assert.match(root.textContent,/Unknown/);assert.match(root.textContent,/Not assessed/);
 }
});
