const {chromium}=require('/Users/fsapanlay/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const origin=process.env.TARGET_URL||'http://127.0.0.1:8106';
const out=process.env.CAPTURE_OUT;
assert.ok(out,'Set CAPTURE_OUT to an existing evidence directory with raw/');
(async()=>{
 const browser=await chromium.launch({headless:false,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const records=process.env.REMAINING_ONLY?JSON.parse(await fs.readFile(path.join(out,'capture-records.json'),'utf8')).records:[]; const blocked=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:4,locale:'en-PH',timezoneId:'Asia/Manila'});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol))return route.continue();
   blocked.push(url.origin);return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',err=>console.error('PAGEERROR',err.message));
  async function ready(){
   await page.locator('#root').waitFor();
   await page.evaluate(async()=>{await document.fonts.ready; await Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  }
  async function capture(name){
   await ready();
   // Pixel initialization precedes the pet's live-to-still handoff. A snapshot
   // must wait for exactly one fully visible pose, not just a painted canvas.
   await page.waitForFunction(()=>[...document.querySelectorAll('canvas[data-pet-artboard]')]
    .filter(c=>c.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))
    .every(c=>{
     const live=c.parentElement, still=live.nextElementSibling;
     return c.dataset.petReady==='true' && Number(getComputedStyle(live).opacity)===1
      && still && Number(getComputedStyle(still).opacity)===0;
    }),null,{timeout:45000});
   const data=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,sampleAppearance:JSON.parse(localStorage.getItem('fitama.blukie-rive-preview.v1')||'null'),capturedAt:new Date().toISOString(),text:document.body.innerText,root:document.querySelector('#root').getBoundingClientRect().toJSON(),images:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight}).map(i=>({src:i.currentSrc,w:i.naturalWidth,h:i.naturalHeight,complete:i.complete})),canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,rect:c.getBoundingClientRect().toJSON()}))}));
   assert.deepEqual(data.viewport,[390,844]);assert.equal(data.dpr,4);assert.ok(data.images.every(i=>i.complete&&i.w));
   const file=path.join(out,'raw',name+'.png');
   await page.screenshot({path:file,type:'png',animations:'disabled',fullPage:false});
   const previous=records.findIndex(r=>r.name===name);if(previous>=0)records.splice(previous,1);records.push({name,file,...data}); await fs.writeFile(path.join(out,'capture-records.json'),JSON.stringify({records,blocked:[...new Set(blocked)]},null,2));
   console.log('CAPTURED',name,data.text.replace(/\n/g,' | ').slice(-200));
  }
  if(!process.env.REMAINING_ONLY){await page.goto(origin+'/lossless-shop.html');
  await page.getByRole('heading',{name:'Tama Shop',exact:true}).waitFor();
  await capture('shop-funded-v1');}
  async function open(query){await page.goto(origin+'/lossless-screen.html'+query);await ready();}
  async function canvasesReady(){await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].filter(c=>c.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).every(c=>{
   if(c.width===0||c.height===0)return false;
   const ctx=c.getContext('2d'); if(!ctx)return false;
   const a=ctx.getImageData(0,0,c.width,c.height).data;
   for(let i=3;i<a.length;i+=4*53)if(a[i])return true;
   return false;
  }),null,{timeout:45000});}
  if(!process.env.REMAINING_ONLY){await open('?scene=hatch&variant=blue');
  await page.getByRole('button',{name:'Get your Fitama',exact:true}).waitFor();
  await canvasesReady();
  await capture('egg-home');}
  if(!process.env.FINAL_ONLY){await open('?scene=pets&variant=blue');
  for(const name of ['Eye style 3','Mouth 1','Ears 1','Horns 1','Blush 1','Forehead 1'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByText(/Blukie: idle · Rive ready/).waitFor({timeout:45000});
  await page.getByRole('button',{name:'View this sample on Home',exact:true}).click();
  await page.getByRole('button',{name:'Claim Heart Potion',exact:true}).click({force:true});
  await canvasesReady();await capture('home');
  await page.getByRole('button',{name:'Quest',exact:true}).click();
  // Capture the current quest catalog without altering its rewards.
  console.log('QUEST_UI',await page.locator('body').ariaSnapshot());
  await capture('quests-claimed');
  await page.getByRole('button',{name:'Map',exact:true}).last().click();
  await page.getByRole('img',{name:'Fitama world map',exact:true}).waitFor();
  await canvasesReady();await capture('map');
  await open('?profile=1&variant=blue');
  console.log('HEALTH_UI',await page.locator('body').ariaSnapshot());
  await page.getByRole('tab',{name:'Activities',exact:true}).click();
  console.log('ACTIVITIES_UI',await page.locator('body').ariaSnapshot());
  await page.getByRole('button',{name:/Cycling/}).click();
  await capture('health-activities');
  }
  if(!process.env.EQUIPMENT_ONLY){await open('?scene=battle&dungeon=dungeon-1&variant=blue&split=1');
  await page.getByRole('button',{name:'TP Attack',exact:true}).waitFor();
  await canvasesReady();await capture('battle-before');
  await open('?scene=win&dungeon=dungeon-1&variant=blue&split=1');
  await page.getByText('You Win!',{exact:true}).waitFor();
  await page.locator('[data-testid="confetti-piece"]').first().waitFor({state:'detached',timeout:20000});
  await capture('battle-result');
  }
  await open('?xpBooks=1&variant=blue');
  for(const name of [/^Rep Ripper,/,/^Explorer’s Goggle Cap,/,/^Growth Ring,/]){
   await page.getByRole('button',{name}).click();
   await page.getByRole('dialog').getByRole('button',{name:/^Equip /}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await page.evaluate(()=>{for(const e of document.querySelectorAll('*'))if(e.scrollTop)e.scrollTop=0;});
  await canvasesReady();
  await capture('equipment');
 }catch(error){console.error(error);await browser.contexts()[0]?.pages()[0]?.screenshot({path:path.join(out,'debug.png'),type:'png'});await fs.writeFile(path.join(out,'debug-ui.txt'),await browser.contexts()[0].pages()[0].locator('body').ariaSnapshot());process.exitCode=1;}finally{await browser.close();}
})();
