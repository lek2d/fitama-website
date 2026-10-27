import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function navigation({reduced=false,staticMode=false,path='/journey.html'}={}) {
  const calls=[];
  const link=href=>({href,handlers:new Map(),getAttribute(name){return name==='href'?this.href:null;},addEventListener(name,handler){this.handlers.set(name,handler);}});
  const brand=link('journey.html'),cta=link(path==='/journey.html'?'#download':'journey.html#download');
  const section=name=>({focus(options){calls.push(['focus',name,options]);},scrollIntoView(options){calls.push(['scroll',name,options]);}});
  const download=section('download'),story=section('story');
  const header={querySelector:selector=>({'.nav-brand':brand,'.nav-download':cta})[selector]||null};
  const document={querySelector:selector=>({'.site-header':header,'#download':download,'.scroll-story':story})[selector],documentElement:{classList:{contains:()=>staticMode}}};
  const location=new URL('https://fitama.app'+path+'?revision=keep#download');
  const source=readFileSync(new URL('../docs/navigation.js',import.meta.url),'utf8').replace(/^export /gm,'');
  vm.runInNewContext(source,{document,location,URL,matchMedia:()=>({matches:reduced}),scrollTo:options=>calls.push(['top',options]),history:{replaceState:(state,title,url)=>calls.push(['url',url])}});
  return {calls,click(name,options={}){const event={button:0,defaultPrevented:false,currentTarget:name==='home'?brand:cta,preventDefault(){this.defaultPrevented=true;},...options};event.currentTarget.handlers.get('click')?.(event);return event;}};
}

test('Get Fitama reveals the ending before requesting smooth travel, preserving its anchor',()=>{
  const n=navigation();assert.equal(n.click('download').defaultPrevented,true);
  assert.deepEqual(JSON.parse(JSON.stringify(n.calls)),[['focus','download',{preventScroll:true}],['scroll','download',{behavior:'smooth',block:'start'}],['url','#download']]);
});

test('same-page logo requests smooth top travel rather than reloading and keeps the current query',()=>{
  const n=navigation();assert.equal(n.click('home').defaultPrevented,true);
  assert.deepEqual(JSON.parse(JSON.stringify(n.calls)),[['focus','story',{preventScroll:true}],['top',{top:0,behavior:'smooth'}],['url','/journey.html?revision=keep']]);
});

test('reduced-motion and static views keep direct navigation without spatial animation',()=>{
  for(const options of [{reduced:true},{staticMode:true}]){
    const n=navigation(options);n.click('download');n.click('home');
    assert.equal(n.calls.find(call=>call[0]==='scroll')[2].behavior,'instant');
    assert.equal(n.calls.find(call=>call[0]==='top')?.[1]?.behavior,'instant');
  }
});

test('modified clicks and links from other pages retain native navigation',()=>{
  for(const name of ['download','home']){
    for(const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
      const n=navigation();n.click(name,options);assert.equal(n.calls.length,0);
    }
    const n=navigation({path:'/guide.html'});assert.equal(n.click(name).defaultPrevented,false);assert.equal(n.calls.length,0);
  }
});
