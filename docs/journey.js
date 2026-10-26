import {setHeaderVisible} from './navigation.js?v=cutie-sync-fd0747a-local-v1&release=20261026';
import {phase} from './journey-timeline.mjs?v=section-snap-v2';
import {walkthrough, introDistance} from './walkthrough.mjs?v=section-snap-v2';
import {installSmoothScroll} from './smooth-scroll.mjs?v=section-snap-v2';
import {storyStops} from './section-snap.mjs?v=section-snap-v2';
import {installPetPreviews} from './pet-preview.mjs?v=click-lock-happy-v1&release=20261026';
import {prepareJourneyPage} from './page-loader.mjs?v=preloader-v1&release=20261026&brand=glossy-v1';

const $ = selector => document.querySelector(selector);
const story = $('.scroll-story');
const stage = $('.stage');
const worldBackground = $('.world-background');
const heroGrass = $('.hero-grass');
const nestFront = $('.nest-front');
const clearingPlants = [...document.querySelectorAll('.clearing-plants')];
const activityBubbles = $('.activity-bubbles');
const healthConnection = $('.health-connection');
const sideQuestPeek = $('.side-quest-peek');
const battleFlanks = $('.battle-flanks');
const progressItems = $('.progress-items');
const nodes = Object.fromEntries(['sky','cloud-banks','mountains','lake-falls','valley','cream','hero-copy','nest-group','traveller','phone','egg-screen','grown-screen','follow-copy','landing-copy','tp-copy'].map(name=>[name,$('.'+name)]));
const chapterPanels=[...document.querySelectorAll('[data-chapter]')];
const screenLayers=Object.fromEntries(['movement','home','health','map','battle','result','equipment','shop'].map(name=>[name,$('.screen-'+name)]));
const choices = [...document.querySelectorAll('.egg-choice')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stillVersion = new URLSearchParams(location.search).get('motion') === 'off';
const shortScreen=matchMedia('(max-height:519px), (max-width:699px) and (max-height:620px)');
const staticMode=()=>reduced.matches||stillVersion||shortScreen.matches||document.documentElement.classList.contains('page-art-fallback');
let acknowledgeLayout;
const initialLayout=new Promise(resolve=>{acknowledgeLayout=resolve;});
let scheduled = false;
let petPreviews = null;
let previewing = true;
let renderedProgress = null;
let lastFrameTime = 0;

function opacity(name,value) { nodes[name].style.opacity=value; }
function update(time) {
  scheduled=false;
  document.body.classList.toggle('ending-visible', $('.journey-content').getBoundingClientRect().bottom <= 42);
  if(staticMode()){setHeaderVisible(true);petPreviews?.sync();acknowledgeLayout();return;}
  const h=stage.clientHeight,w=stage.clientWidth;
  const distance=introDistance(w,h);
  const progress=Math.max(0,(scrollY-story.offsetTop)/distance);
  const dt=lastFrameTime ? Math.min(64,time-lastFrameTime) : 16;
  lastFrameTime=time;
  renderedProgress=renderedProgress===null ? progress : renderedProgress+(progress-renderedProgress)*(1-Math.exp(-dt/45));
  const moving=Math.abs(progress-renderedProgress)>.00002;
  if(!moving) renderedProgress=progress;
  const view=walkthrough(renderedProgress*distance,w,h);
  const s=view.scene;
  setHeaderVisible(s.p >= .24);
  stage.dataset.chapter=String(view.active);
  document.body.classList.toggle('in-gameplay',s.p>=.93);
  $('.walkthrough-screens').style.opacity=phase(s.p,.90,.96);
  // A single screenshot at a time prevents unreadable double UI at scroll rests.
  const visibleScreen = view.active === 0 ? 'movement' : view.active === 1 ? 'health'
    : view.active === 2 ? (view.result > .5 ? 'result' : view.battle > .5 ? 'battle' : 'map')
    : view.progressScreen;
  const weights = Object.fromEntries(Object.keys(screenLayers).map(name => [name, name === visibleScreen ? 1 : 0]));
  stage.dataset.screen = visibleScreen;
  const bubbleOpacity=phase(s.p,.94,.98)*weights.movement;
  activityBubbles.style.opacity=bubbleOpacity;
  activityBubbles.hidden=bubbleOpacity===0;
  healthConnection.hidden=view.active!==1||s.tpOpacity<.9;
  healthConnection.style.opacity=view.textOpacity[1];
  sideQuestPeek.hidden=visibleScreen!=='map'||s.tpOpacity<.9;
  sideQuestPeek.style.opacity=view.textOpacity[2];
  battleFlanks.hidden=visibleScreen!=='battle'||s.tpOpacity<.9;
  battleFlanks.style.opacity=view.textOpacity[2];
  progressItems.hidden=!['equipment','shop'].includes(visibleScreen)||s.tpOpacity<.9;
  progressItems.style.opacity=view.textOpacity[3];
  Object.assign(progressItems.style,{transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  Object.assign(battleFlanks.style,{transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  Object.assign(sideQuestPeek.style,{transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  for(const [name,value] of Object.entries(weights)) screenLayers[name].style.opacity=value;
  chapterPanels.forEach((panel,i)=>{panel.style.opacity=view.textOpacity[i];panel.style.transform=`translateY(${(1-view.textOpacity[i])*8}px)`;panel.inert=i!==view.active||s.tpOpacity<.5||view.textOpacity[i]<.1;panel.setAttribute('aria-hidden',panel.inert);});
  nodes['tp-copy'].inert=s.tpOpacity<.5;
  nodes.phone.setAttribute('aria-label',s.p<.93?'Blukie’s egg lands in the Fitama app':`Sample Fitama screen: ${Object.entries(weights).sort((a,b)=>b[1]-a[1])[0][0]}`);
  worldBackground.style.height=`${h-s.worldClipBottom}px`;
  stage.style.setProperty('--world-height',`${h}px`);
  stage.style.setProperty('--world-width',`${w}px`);
  stage.style.setProperty('--world-edge',`${h-s.worldClipBottom}px`);
  stage.style.setProperty('--grass-height',`${s.grassHeight}px`);
  stage.style.setProperty('--grass-top-offset',`${s.grassTopOffset}px`);
  stage.style.setProperty('--grass-edge',`${s.grassEdge}px`);
  heroGrass.style.transform=`translate3d(${s.grassX}px,${s.grassLiftY}px,0)`;
  stage.style.setProperty('--foliage-size',`${s.foliageSize}px`);
  stage.style.setProperty('--foliage-top',`${s.foliageTop}px`);
  stage.style.setProperty('--foliage-outset',`${s.foliageOutset}px`);
  stage.style.setProperty('--foliage-right-drop',`${s.foliageRightDrop}px`);
  stage.style.setProperty('--nest-width',`${s.nestW}px`);
  stage.style.setProperty('--nest-top',`${s.nestTop}px`);
  stage.style.setProperty('--nest-base',`${s.nestBase}px`);
  stage.style.setProperty('--hero-egg',`${s.startW}px`);
  stage.style.setProperty('--companion-egg-height',`${s.companionH}px`);
  stage.style.setProperty('--clovie-egg-width',`${s.clovieW}px`);
  stage.style.setProperty('--ignie-egg-width',`${s.ignieW}px`);
  stage.style.setProperty('--clovie-egg-x',`${s.clovieX}px`);
  stage.style.setProperty('--ignie-egg-x',`${s.ignieX}px`);
  stage.style.setProperty('--egg-grounding',s.grounding);
  stage.style.setProperty('--follow-copy-x',`${s.followCopyX}px`);
  stage.style.setProperty('--landing-copy-x',`${s.landingCopyX}px`);
  stage.style.setProperty('--pair-copy-y',`${s.pairCopyY}px`);
  stage.style.setProperty('--pair-copy-width',`${s.pairCopyW}px`);
  stage.dataset.progress=s.p.toFixed(4);
  const canPreview=s.p<.02;
  stage.classList.toggle('can-preview',canPreview);
  if(previewing!==canPreview) {
    choices.forEach(button=>{button.inert=!canPreview;});
    previewing=canPreview;
  }
  petPreviews?.sync();
  for(const [name,value] of [['sky',s.skyOpacity],['mountains',s.landscapeOpacity],['valley',s.landscapeOpacity],['hero-copy',s.heroOpacity],['traveller',s.eggOpacity],['egg-screen',s.screenOpacity],['grown-screen',s.reveal],['follow-copy',s.followOpacity],['landing-copy',s.landingOpacity],['tp-copy',s.tpOpacity],['cream',s.creamOpacity]]) opacity(name,value);
  nodes['hero-copy'].inert=s.heroOpacity<.5;
  for(const name of ['follow-copy','landing-copy','tp-copy']) nodes[name].setAttribute('aria-hidden',Number(nodes[name].style.opacity)<.5);
  nodes.mountains.style.transform=`translateY(${s.mountainsY}px)`;
  nodes['cloud-banks'].style.transform=`translateY(${s.cloudBanksY}px)`;
  nodes['lake-falls'].style.transform=`translateY(${s.lakeFallsY}px)`;
  nodes.valley.style.transform=`translateY(${s.valleyY}px)`;
  $('.clearing-ground').style.transform=`translateY(${s.valleyY}px)`;
  nodes['hero-copy'].style.transform=`translateY(${s.heroY}px)`;
  nodes['nest-group'].style.setProperty('--nest-y',`${s.nestY}px`);
  opacity('nest-group',s.nestOpacity);
  nestFront.style.transform=`translateY(${s.nestY}px)`;
  nestFront.style.opacity=s.nestOpacity*s.grounding;
  clearingPlants.forEach(plant => {plant.style.transform=`translateY(${s.leafY}px)`;});
  Object.assign(nodes.phone.style,{left:'0',top:'0',transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  Object.assign(activityBubbles.style,{transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  Object.assign(healthConnection.style,{transform:`translate3d(${s.phoneX}px,${s.phoneY}px,0)`,width:`${s.phoneW}px`,height:`${s.phoneH}px`});
  // Keep the egg's layout box fixed. Translation and scale carry the motion.
  const eggBase=164;
  Object.assign(nodes.traveller.style,{left:'0',top:'0',width:`${eggBase}px`,height:`${eggBase*391/353}px`,transform:`translate3d(${s.eggX-eggBase/2}px,${s.eggY-eggBase*391/353/2}px,0) scale(${s.eggW/eggBase})`});
  nodes.traveller.style.setProperty('--pet-label-scale',eggBase/s.eggW);
  acknowledgeLayout();
  if(moving) schedule(); else lastFrameTime=0;
}
function schedule() {if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule);
new ResizeObserver(schedule).observe(stage);
function syncVisibility(){document.body.classList.toggle('clouds-paused',document.hidden);petPreviews?.sync();}
document.addEventListener('visibilitychange',syncVisibility);
function motionPreference(){renderedProgress=null;document.documentElement.classList.toggle('motion-off',staticMode());document.body.classList.toggle('reduced-motion',staticMode());schedule();}
reduced.addEventListener('change',motionPreference);
shortScreen.addEventListener('change',motionPreference);
petPreviews=installPetPreviews({stage,buttons:choices,getState:()=>({available:stage.classList.contains('can-preview')&&!staticMode(),paused:false,reduced:staticMode()})});
motionPreference();
installSmoothScroll({
  enabled:()=>document.documentElement.dataset.pageLoading!=='pending'&&!staticMode(),
  touchSurface:story,
  getStops:()=>{
    const stops=storyStops(stage.clientWidth,stage.clientHeight,story.offsetTop);
    if(!stops.length)return stops;
    // Exit the pinned story with the FAQ heading clear of the fixed header.
    const faqTop=$('.faq-section').getBoundingClientRect().top+scrollY-112;
    const maximum=document.documentElement.scrollHeight-innerHeight;
    return [...stops,Math.min(maximum,Math.max(stops.at(-1)+1,faqTop))];
  },
});
setHeaderVisible(staticMode());
$('.site-header').addEventListener('focusout',schedule);



// Only pin an ending that fits: zoom, short screens and long content keep normal flow.
const ending = $('.journey-ending');
function sizeEndingReveal(){
  const height = ending.getBoundingClientRect().height;
  const viewport = document.documentElement.clientHeight;
  const fits = height <= viewport + 1;
  ending.classList.toggle('reveal-ready', !staticMode() && fits);
  const tail = stage.clientWidth < 700 ? Math.min(viewport * .14, height * .2) : 0;
  ending.style.setProperty('--ending-bottom', `${-tail}px`);
}
new ResizeObserver(sizeEndingReveal).observe(ending);
addEventListener('resize', sizeEndingReveal, {passive:true});
reduced.addEventListener('change', sizeEndingReveal);
shortScreen.addEventListener('change', sizeEndingReveal);
sizeEndingReveal();
// Focus switches the ending to normal flow; expose the control after that layout change.
ending.addEventListener('focusin', event => requestAnimationFrame(() => {
  if(document.activeElement !== event.target)return;
  const bounds = event.target.getBoundingClientRect();
  if(bounds.top < 48 || bounds.bottom > innerHeight){
    event.target.scrollIntoView({block:'center',behavior:'instant'});
  }
}));

document.addEventListener('fitama:loading-finished',()=>{motionPreference();sizeEndingReveal();});
void prepareJourneyPage({layoutReady:initialLayout,getStaticView:staticMode});
