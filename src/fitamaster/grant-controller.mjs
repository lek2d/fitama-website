import {validateItemGrant} from './core.mjs';
import {GRANTABLE_ITEMS} from './grant-catalog.mjs';

const blank=()=>({open:false,draft:{itemId:'',quantity:1,reason:''},review:null,result:null,uncertain:false,statusChecked:false,busy:false});
/** Only confirmed intent reaches the write RPC. An unknown result retains its nonce until reconciled. */
export function createItemGrantController(portal,{id=()=>crypto.randomUUID(),onChange=()=>{},onConfirmed=async()=>{}}={}){
  let state=blank(),epoch=0,targetId=null,generation=null;
  const reset=()=>{epoch++;state=blank();};
  const validTarget=()=>portal.state.phase==='ready'&&portal.state.selectedPlayer===targetId&&portal.state.player?.profile?.id===targetId&&portal.state.player.generation===generation;
  const active=stamp=>stamp===epoch&&validTarget();
  const locked=()=>state.busy||portal.state.busy;
  const draw=(focus=false)=>onChange({focus});
  async function complete(result,stamp){
    if(!active(stamp))return;
    state={...state,result,review:null,uncertain:false,statusChecked:false,busy:false};draw(true);
    // Keep the durable receipt visible even if refreshing the inventory fails.
    await onConfirmed(result);
  }
  const actions={
    toggle(open){state={...state,open:!!open};},
    change(name,value){
      if(locked()||state.review||state.result||state.uncertain||!['itemId','quantity','reason'].includes(name))return;
      const draft={...state.draft,[name]:value};
      if(name==='itemId'&&GRANTABLE_ITEMS.find(item=>item.itemId===value)?.maxQuantity===1)draft.quantity=1;
      state={...state,draft};if(name==='itemId')draw();
    },
    review(draft){
      if(locked()||state.review||state.result||state.uncertain||!validTarget())return;
      try{
        const parsed=validateItemGrant({...draft,playerId:targetId,generation,requestId:id()});
        const profile=portal.state.player.profile;
        state={...state,open:true,draft:{itemId:parsed.itemId,quantity:parsed.quantity,reason:parsed.reason},review:Object.freeze({...parsed,username:profile.username,friendCode:profile.friendCode}),statusChecked:false};draw(true);
      }catch(error){portal.setError(error.message);}
    },
    edit(){
      if(locked()||state.uncertain)return;
      state=state.result?{...blank(),open:true}:{...state,review:null,statusChecked:false};draw(true);
    },
    async confirm(){
      if(locked()||!state.review||state.result||!validTarget()||(state.uncertain&&!state.statusChecked))return;
      const stamp=epoch,intent=state.review;state={...state,busy:true,statusChecked:false};draw();
      try{
        const result=await portal.grantItem(intent);
        if(!active(stamp))return;
        if(result)await complete(result,stamp);
        else state={...state,uncertain:portal.state.grantOutcome!=='rejected'};
      }catch(error){if(active(stamp)){state={...state,uncertain:true};portal.setError(error.message);}}
      finally{if(active(stamp)){state={...state,busy:false};draw();}}
    },
    async checkStatus(){
      if(locked()||!state.uncertain||!state.review||!validTarget())return;
      const stamp=epoch;state={...state,busy:true,statusChecked:false};draw();
      try{
        const result=await portal.grantStatus(state.review);
        if(!active(stamp))return;
        if(result?.receipt)await complete(result.receipt,stamp);
        else if(result)state={...state,statusChecked:true};
      }catch(error){if(active(stamp))portal.setError(error.message);}
      finally{if(active(stamp)){state={...state,busy:false};draw();}}
    },
  };
  return{get state(){return state;},get blocksNavigation(){return state.busy||state.uncertain;},actions,
    sync(next){
      const selected=next.phase==='ready'?next.selectedPlayer:null;
      const nextGeneration=next.player?.profile?.id===selected?next.player.generation:null;
      if(selected!==targetId||(generation!==null&&nextGeneration!==null&&generation!==nextGeneration)||next.phase!=='ready')reset();
      targetId=selected;if(selected===null)generation=null;else if(nextGeneration!==null)generation=nextGeneration;
    },
    dispose(){reset();targetId=null;generation=null;},
  };
}
