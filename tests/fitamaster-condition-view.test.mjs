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
