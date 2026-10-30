const {chromium}=require('/Users/fsapanlay/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const origin=process.env.TARGET_URL || 'http://127.0.0.1:8116';
const out='/Users/fsapanlay/Documents/Codex/2026-10-20/che/outputs/Fitama-Home-Fix-2026-10-30';
(async()=>{
 const browser=await chromium.launch({headless:false,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const blocked=[];
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:4,locale:'en-PH',timezoneId:'Asia/Manila'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))return route.continue();
   blocked.push(u.origin);return route.abort();
  });
  const page=await context.newPage();
  await page.goto(origin+'/lossless-screen.html?scene=pets&variant=blue');
  for(const name of ['Eye style 3','Mouth 1','Ears 1','Horns 1','Blush 1','Forehead 1'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByText(/Blukie: idle · Rive ready/).waitFor({timeout:45000});
  await page.getByRole('button',{name:'View this sample on Home',exact:true}).click();
  await page.getByRole('button',{name:'Claim Heart Potion',exact:true}).click({force:true});
  const stage=page.getByTestId('home-pet-stage');
  await stage.waitFor({state:'visible'});
  // A painted Rive canvas is insufficient: its persistent saved pose still
  // dissolves for 120ms after the live renderer finishes its own reveal.
  await page.waitForFunction(()=>{
   const stage=document.querySelector('[data-testid="home-pet-stage"]');
   if(!stage)return false;
   const alpha=el=>{let n=el,v=1;while(n&&n!==stage.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return 0;v*=Number(s.opacity);n=n.parentElement;}return v;};
   const live=[...stage.querySelectorAll('canvas[data-pet-artboard]')];
   const stills=[...stage.querySelectorAll('[data-testid="pet-image-layers"]')];
   return live.length===1&&live[0].dataset.petReady==='true'&&alpha(live[0])===1&&stills.length>0&&stills.every(el=>alpha(el)===0);
  },null,{timeout:45000});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const proof=await stage.evaluate(stage=>{
   const alpha=el=>{let n=el,v=1;while(n&&n!==stage.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return 0;v*=Number(s.opacity);n=n.parentElement;}return v;};
   return {petCanvases:[...stage.querySelectorAll('canvas[data-pet-artboard]')].map(el=>({ready:el.dataset.petReady,effectiveOpacity:alpha(el)})),fallbacks:[...stage.querySelectorAll('[data-testid="pet-image-layers"]')].map(el=>({effectiveOpacity:alpha(el)}))};
  });
  assert.equal(proof.petCanvases.length,1);
  assert.equal(proof.petCanvases[0].effectiveOpacity,1);
  assert.ok(proof.fallbacks.length&&proof.fallbacks.every(x=>x.effectiveOpacity===0));
  await page.screenshot({path:out+'/home.png',type:'png',animations:'disabled'});
  await fs.writeFile(out+'/capture-proof.json',JSON.stringify({sourceCommit:'9b785bc6ff4868a5a43be15a358ce98d85973e52',capturedAt:new Date().toISOString(),viewport:[390,844],deviceScaleFactor:4,...proof,blocked:[...new Set(blocked)]},null,2)+'\n');
  console.log(JSON.stringify(proof));
 }catch(error){console.error(error);await browser.contexts()[0]?.pages()[0]?.screenshot({path:out+'/failure.png'});process.exitCode=1;}finally{await browser.close();}
})();
