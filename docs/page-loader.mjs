const sharedArtwork=['assets/fitama-logo-glossy.png','assets/store-leaf-corners-v6.png'];
const heroArtwork=[
  'assets/hero-parallax-v1/clouds.png','assets/hero-parallax-v1/mountains.png',
  'assets/hero-parallax-v1/lake-falls.png','assets/hero-parallax-v2/foreground-extended.png',
  'assets/journey-edge-plants-v6.webp','assets/hero-garden-v4/garden-clumps.png',
  'assets/storyboard/egg-clovie.png','assets/storyboard/egg-blukie.png','assets/storyboard/egg-ignie.png',
  'assets/hero-parallax-v2/grass-u-contour.png','assets/water-curtain-flow-v1.webp','assets/chimney-smoke.webp',
];

export function initialArtwork(staticView){
  return [...new Set([...sharedArtwork,...(staticView?['assets/movement-panels-clean.png']:heroArtwork)])];
}

export async function waitForPageAssets(tasks,{timeoutMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let timer;
  const deadline=new Promise(resolve=>{timer=setTimer(()=>resolve({state:'fallback',reason:'timeout'}),timeoutMs);});
  const prepared=Promise.all(tasks).then(()=>({state:'ready'}),()=>({state:'fallback',reason:'asset'}));
  try{return await Promise.race([prepared,deadline]);}
  finally{clearTimer(timer);}
}

export function decodeArtwork(src,createImage=()=>new Image()){
  return new Promise((resolve,reject)=>{
    const image=createImage();let settled=false;
    const fail=()=>{if(settled)return;settled=true;image.onload=image.onerror=null;reject(new Error(`Artwork could not load: ${src}`));};
    const loaded=()=>{
      if(settled)return;
      if(!image.naturalWidth){fail();return;}
      settled=true;image.onload=image.onerror=null;
      Promise.resolve().then(()=>image.decode?.()).then(resolve,reject);
    };
    image.onload=loaded;image.onerror=fail;image.src=src;
    if(image.complete)queueMicrotask(image.naturalWidth?loaded:fail);
  });
}

// Later/lazy images keep their reserved space without exposing a broken-image icon.
export function trackPageImages(doc){
  for(const image of doc.images){
    const settle=()=>{
      image.classList.remove('image-pending');
      image.classList.toggle('image-unavailable',!image.naturalWidth);
    };
    if(image.complete)settle();
    else{
      image.classList.add('image-pending');
      image.addEventListener('load',settle,{once:true});
      image.addEventListener('error',settle,{once:true});
    }
  }
}

// A resize can reveal animated scenery while a static opening is still loading.
export async function prepareCurrentArtwork(getStaticView,prepareView,afterPaint){
  for(;;){
    const view=getStaticView();
    await prepareView(view);
    await afterPaint();
    if(getStaticView()===view)return;
  }
}

export async function prepareJourneyPage({layoutReady,staticView,getStaticView=()=>staticView,doc=document}){
  trackPageImages(doc);
  const artwork=new Map();
  const prepareView=view=>Promise.all(initialArtwork(view).map(src=>{
    if(!artwork.has(src))artwork.set(src,decodeArtwork(src));
    return artwork.get(src);
  }));
  // A font failure may use the existing system fallback; it is not missing artwork.
  const font=Promise.resolve(doc.fonts?.load('600 1em Fredoka')).catch(()=>{});
  const painted=prepareCurrentArtwork(getStaticView,
    view=>Promise.all([prepareView(view),font,layoutReady]),
    ()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  // Background failures are handled now even if visibility defers the deadline.
  void painted.catch(()=>{});
  // A background tab can prepare resources without spending its visible load budget.
  if(doc.hidden)await new Promise(resolve=>{
    const visible=()=>{if(!doc.hidden){doc.removeEventListener('visibilitychange',visible);resolve();}};
    doc.addEventListener('visibilitychange',visible);
  });
  const result=await waitForPageAssets([painted]);
  doc.dispatchEvent(new Event(result.state==='ready'?'fitama:page-ready':'fitama:page-fallback'));
  return result;
}
