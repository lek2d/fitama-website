const {chromium}=require('/Users/fsapanlay/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const origin=process.env.TARGET_URL||'http://127.0.0.1:8106';
const out=process.env.CAPTURE_OUT;
assert.ok(out,'Set CAPTURE_OUT to an existing evidence directory with raw/');
(async()=>{
 const browser=await chromium.launch({headless:false,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const records=true?JSON.parse(await fs.readFile(path.join(out,'capture-records.json'),'utf8')).records:[]; const blocked=[];
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
   const data=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,sampleAppearance:JSON.parse(localStorage.getItem('fitama.blukie-rive-preview.v1')||'null'),capturedAt:new Date().toISOString(),text:document.body.innerText,root:document.querySelector('#root').getBoundingClientRect().toJSON(),images:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight}).map(i=>({src:i.currentSrc,w:i.naturalWidth,h:i.naturalHeight,complete:i.complete})),canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,rect:c.getBoundingClientRect().toJSON()}))}));
   assert.deepEqual(data.viewport,[390,844]);assert.equal(data.dpr,4);assert.ok(data.images.every(i=>i.complete&&i.w));
   const file=path.join(out,'raw',name+'.png');
   await page.screenshot({path:file,type:'png',animations:'disabled',fullPage:false});
   const previous=records.findIndex(r=>r.name===name);if(previous>=0)records.splice(previous,1);records.push({name,file,...data}); await fs.writeFile(path.join(out,'capture-records.json'),JSON.stringify({records,blocked:[...new Set(blocked)]},null,2));
   console.log('CAPTURED',name,data.text.replace(/\n/g,' | ').slice(-200));
  }
  async function canvasesReady(){await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].filter(c=>c.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).every(c=>{
   if(c.width===0||c.height===0)return false;
   const ctx=c.getContext('2d'); if(!ctx)return false;
   const a=ctx.getImageData(0,0,c.width,c.height).data;
   for(let i=3;i<a.length;i+=4*53)if(a[i])return true;
   return false;
  }),null,{timeout:45000});}
  await page.goto(origin+'/lossless-screen.html?scene=pets&variant=blue');
  for(const name of ['Eye style 3','Mouth 1','Ears 1','Horns 1','Blush 1','Forehead 1'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByText(/Blukie: idle · Rive ready/).waitFor({timeout:45000});
  await page.goto(origin+'/lossless-screen.html?website-quests=1&variant=blue');
  await page.getByRole('button',{name:/Visit Fitama.s Socials, 0 of 5 visited/}).waitFor();
  await capture('quests-claimed');
  await page.getByText('Solo Debut',{exact:true}).scrollIntoViewIfNeeded();
  await capture('quest-first-steps');
  await page.getByRole('tab',{name:'Weekly',exact:true}).click();
  await page.getByText('Helping Hand',{exact:true}).waitFor();
  await capture('quests-weekly');
  await page.goto(origin+'/lossless-screen.html?scene=battle&dungeon=dungeon-1&variant=blue&split=1&tp=250');
  await page.getByRole('button',{name:/TP Attack/}).waitFor();
  await canvasesReady(); await capture('battle-before');
  await page.goto(origin+'/lossless-screen.html?scene=win&dungeon=dungeon-1&variant=blue&split=1');
  await page.getByText('You Win!',{exact:true}).waitFor();
  await page.locator('[data-testid="confetti-piece"]').first().waitFor({state:'detached',timeout:20000});
  await canvasesReady(); await capture('battle-result');
 }catch(error){console.error(error);await browser.contexts()[0]?.pages()[0]?.screenshot({path:path.join(out,'debug.png'),type:'png'});await fs.writeFile(path.join(out,'debug-ui.txt'),await browser.contexts()[0].pages()[0].locator('body').ariaSnapshot());process.exitCode=1;}finally{await browser.close();}
})();
