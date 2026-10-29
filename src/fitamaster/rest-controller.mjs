import {validateEndRest,sameRest} from './condition.mjs';
const blank=()=>({open:false,draft:{reason:''},review:null,result:null,uncertain:false,statusChecked:false,busy:false});
/** The nonce and source tuple survive every redraw until their outcome is known. */
export function createRestController(portal,{id=()=>crypto.randomUUID(),now=()=>Date.now(),onChange=()=>{},onConfirmed=async()=>{},isBlocked=()=>false}={}){
 let state=blank(),epoch=0,targetId=null,generation=null;
 const reset=()=>{epoch++;state=blank();};
 const validTarget=()=>portal.state.phase==='ready'&&portal.state.selectedPlayer===targetId&&portal.state.player?.profile?.id===targetId&&portal.state.player.generation===generation;
 const active=stamp=>stamp===epoch&&validTarget();
 const locked=()=>state.busy||portal.state.busy||isBlocked();
 const draw=(focus=false)=>onChange({focus});
 const currentRest=()=>validTarget()&&portal.state.condition?.endRest.allowed&&portal.state.condition.playerId===targetId&&portal.state.condition.generation===generation&&Date.parse(portal.state.condition.dungeonRest.restUntil)>now();
 async function complete(receipt,stamp){
  if(!active(stamp))return;
  state={...state,result:receipt,review:null,uncertain:false,statusChecked:false,busy:false};draw(true);
  try{await onConfirmed(receipt);}catch{if(active(stamp))portal.setError('Rest ended. The saved receipt is confirmed; refresh player details to update the display.');}
 }
 const actions={
  toggle(open){state={...state,open:!!open};},
  change(name,value){if(locked()||state.review||state.result||state.uncertain||name!=='reason')return;state={...state,draft:{reason:value}};},
  review(draft){
   if(locked()||state.review||state.result||state.uncertain||!currentRest())return;
   try{
    const rest=portal.state.condition.dungeonRest,profile=portal.state.player.profile;
    const parsed=validateEndRest({playerId:targetId,generation,requestId:id(),sourceBattleId:rest.sourceBattleId,restedAt:rest.restedAt,restUntil:rest.restUntil,reason:draft.reason});
    state={...state,open:true,draft:{reason:parsed.reason},review:Object.freeze({...parsed,username:profile.username,friendCode:profile.friendCode,timeZone:rest.timeZone,hearts:portal.state.condition.health.hearts}),statusChecked:false};draw(true);
   }catch(error){portal.setError(error.message);}
  },
  edit(){if(locked()||state.uncertain)return;state=state.result?{...blank(),open:true}:{...state,review:null,statusChecked:false};draw(true);},
  async confirm(){
   if(locked()||!state.review||state.result||!validTarget()||state.uncertain&&!state.statusChecked)return;
   // Exact retries remain valid even if the projection has since changed: the server returns the immutable receipt.
   if(!state.uncertain&&(!currentRest()||!sameRest(portal.state.condition,state.review))){state={...state,review:null};portal.setError('Dungeon rest changed or expired. Refresh condition and review again.');return;}
   const stamp=epoch,intent=state.review;state={...state,busy:true,statusChecked:false};draw();
   try{const result=await portal.endDungeonRest(intent);if(!active(stamp))return;if(result)await complete(result.receipt,stamp);else state={...state,uncertain:portal.state.restOutcome!=='rejected'};}
   catch(error){if(active(stamp)){state={...state,uncertain:true};portal.setError(error.message);}}
   finally{if(active(stamp)){state={...state,busy:false};draw();}}
  },
  async checkStatus(){
   if(locked()||!state.uncertain||!state.review||!validTarget())return;
   const stamp=epoch;state={...state,busy:true,statusChecked:false};draw();
   try{const result=await portal.restEndStatus(state.review);if(!active(stamp))return;if(result?.receipt)await complete(result.receipt,stamp);else if(result)state={...state,statusChecked:true};}
   catch(error){if(active(stamp))portal.setError(error.message);}
   finally{if(active(stamp)){state={...state,busy:false};draw();}}
  },
 };
 return {get state(){return state;},get blocksNavigation(){return state.busy||state.uncertain;},actions,
  sync(next){
   const selected=next.phase==='ready'?next.selectedPlayer:null,nextGeneration=next.player?.profile?.id===selected?next.player.generation:null;
   if(selected!==targetId||generation!==null&&nextGeneration!==null&&generation!==nextGeneration||next.phase!=='ready')reset();
   targetId=selected;if(selected===null)generation=null;else if(nextGeneration!==null)generation=nextGeneration;
   if(state.review&&!state.busy&&!state.uncertain&&next.condition&&!sameRest(next.condition,state.review))state={...state,review:null};
  },dispose(){reset();targetId=null;generation=null;},
 };
}
