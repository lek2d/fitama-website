import test from 'node:test';
import assert from 'node:assert/strict';
import * as view from '../src/fitamaster/condition-view.mjs';
import {renderPortal} from '../src/fitamaster/view.mjs';
import {document,Element,nodes,button,click} from './fixtures/fitamaster-dom.mjs';
import {condition,intent,receipt,playerId} from './fixtures/fitamaster-condition.mjs';
const player={profile:{id:playerId,username:'<script>unsafe</script>',friendCode:'TEST'},generation:2};
const render=(props={},actions={})=>view.renderPetCondition(document,{player,data:condition(),now:Date.parse('2026-10-29T09:00:00Z'),...props},actions);
test('condition displays hearts, daily count and cooldown separately without implying admission',()=>{
 const root=render();assert.match(root.textContent,/0 of 3.*Hibernating/s);assert.match(root.textContent,/2 of 2/);assert.match(root.textContent,/Resting/);assert.match(root.textContent,/does not guarantee dungeon entry/i);assert.match(root.textContent,/No active dungeon/);assert.match(root.textContent,/Asia\/Manila/);
});
test('review is literal and separate from confirmation; no action when opening details',()=>{
 let confirmations=0;const root=render({rest:{open:true,review:{...intent(),username:player.profile.username,friendCode:'TEST',timeZone:'Asia/Manila',hearts:0}}},{confirm:()=>confirmations++});assert.equal(confirmations,0);assert.match(root.textContent,/<script>unsafe<\/script>/);click(button(root,'Confirm end rest'));assert.equal(confirmations,1);
});
test('uncertain state exposes status check before enabling exact retry',()=>{
 let checks=0;let root=render({rest:{review:intent(),uncertain:true,statusChecked:false}},{checkStatus:()=>checks++});assert.equal(button(root,'Retry same clearance'),undefined);click(button(root,'Check clearance status'));assert.equal(checks,1);
 root=render({rest:{review:intent(),uncertain:true,statusChecked:true}},{confirm(){}});assert.ok(button(root,'Retry same clearance'));
});
test('blocked and unknown conditions cannot expose a clearance form; durable result remains after data refresh fails',()=>{
 const c=condition();c.endRest={allowed:false,blockedReason:'active_dungeon'};c.activeDungeon={battleId:playerId,status:'active'};let root=render({data:c});assert.equal(nodes(root).some(n=>n.tagName==='form'),false);assert.match(root.textContent,/active or unresolved dungeon/i);
 root=render({data:null,error:'Display failed',rest:{result:receipt()}});assert.match(root.textContent,/Dungeon rest ended/);assert.match(root.textContent,/Before/);assert.match(root.textContent,/After/);assert.match(root.textContent,/reopen or refresh Fitama/i);assert.match(root.textContent,/Support case #12/);
});
test('portal places Pet condition directly after the saved card and shows validated rest history before and after',()=>{
 const root=new Element('root');renderPortal(document,root,{phase:'ready',view:'players',selectedPlayer:playerId,player,condition:condition()}, {},{endRest:{}});
 assert.match(root.textContent,/Fitama Card.*Pet condition.*Activity/s);
 renderPortal(document,root,{phase:'ready',view:'history',history:{events:[{id:playerId,action:'end_dungeon_rest',restEnd:receipt()}]}},{},{});assert.match(root.textContent,/Previous rest until/);assert.match(root.textContent,/Ended at/);assert.match(root.textContent,/Support case #12/);
});
test('receipt offers explicit review only for a verified different eligible unexpired cooldown',()=>{
 let edits=0;const prior=receipt();let root=render({rest:{result:prior}}, {edit:()=>edits++});assert.equal(button(root,'Review current rest'),undefined);
 const next={...condition(),observedAt:'2026-10-29T09:02:00Z',dungeonRest:{...condition().dungeonRest,sourceBattleId:'44444444-4444-4444-8444-444444444444'}};
 root=render({data:next,rest:{result:prior}}, {edit:()=>edits++});assert.match(root.textContent,/Dungeon rest ended/);assert.equal(edits,0);click(button(root,'Review current rest'));assert.equal(edits,1);
 const equivalent={...condition(),dungeonRest:{...condition().dungeonRest,restedAt:'2026-10-29T16:00:00.000000+08:00',restUntil:'2026-10-29T20:00:00.000000+08:00'}};
 for(const props of [{data:{...next,observedAt:'2026-10-29T09:00:00Z'}},{data:equivalent},{data:null},{data:{...next,endRest:{allowed:false,blockedReason:'active_dungeon'}}},{data:next,now:Date.parse('2026-10-29T12:00:00Z')},{data:{...next,generation:3}},{data:next,player:null}]){
  root=render({...props,rest:{result:prior}}, {edit:()=>edits++});assert.equal(button(root,'Review current rest'),undefined);assert.match(root.textContent,/Dungeon rest ended/);
 }
});
test('global history labels prior-owner rest details as restricted and keeps other rows visible',()=>{
 const root=new Element('root');renderPortal(document,root,{phase:'ready',view:'history',history:{events:[
  {id:7,action:'end_dungeon_rest',playerId,actorId:'44444444-4444-4444-8444-444444444444',restEnd:null,restEndRestricted:true},
  {id:8,action:'end_dungeon_rest',playerId,restEnd:receipt(),restEndRestricted:false},
  {id:9,action:'item_grant',playerId,itemGrant:{itemId:'treat',quantity:2,reason:'Earlier grant'}},
 ]}},{},{});
 const rows=nodes(root).filter(node=>node.tagName==='li');assert.equal(rows.length,3);assert.match(rows[0].textContent,/Clearance details are restricted to the issuing owner\./);assert.doesNotMatch(rows[0].textContent,/Support case #12|Previous rest until/);assert.match(rows[1].textContent,/Support case #12/);assert.match(rows[2].textContent,/Earlier grant/);
});
