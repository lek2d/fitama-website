import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function navigation(narrowScreen = true) {
  const document = {activeElement:null,documentElement:{classList:{contains:()=>false}}};
  function element(name,parent=null,tag='div') {
    const handlers=new Map(),attributes=new Map();
    let hidden=false;
    const node={name,parent,tag,dataset:{},classList:{add(){}},
      get hidden(){return hidden;},
      set hidden(value){hidden=value;if(value&&node.contains(document.activeElement))document.activeElement=body;},
      contains(other){for(;other;other=other.parent)if(other===node)return true;return false;},
      closest(selector){for(let other=node;other;other=other.parent)if(other.tag===selector)return other;return null;},
      setAttribute(key,value){attributes.set(key,value);},getAttribute(key){return attributes.get(key)??null;},
      addEventListener(type,handler){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(handler);},
      focus(){for(let other=node;other;other=other.parent)if(other.hidden||other.inert)return;document.activeElement=node;},
      fire(type,values={}){const event={target:node,currentTarget:node,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...values};for(const handler of handlers.get(type)||[])handler(event);return event;}
    };
    return node;
  }
  const body=element('body'),header=element('header',body),toggle=element('toggle',header,'button');
  const menu=element('menu',header),guide=element('guide',menu,'a'),social=element('social',menu,'a');
  const socialIcon=element('social-icon',social,'svg'),outside=element('outside',body,'a'),story=element('story',body);
  document.activeElement=body;
  header.querySelector=selector=>({'.nav-toggle':toggle,'.header-menu':menu})[selector]??null;
  menu.querySelector=selector=>selector==='a'?guide:null;
  document.querySelector=selector=>({'.site-header':header,'.scroll-story':story})[selector]??null;
  const documentEvents=element('document');
  document.addEventListener=documentEvents.addEventListener;
  const narrow={matches:narrowScreen,addEventListener(type,handler){this.change=handler;}};
  const context={document,matchMedia:()=>narrow};
  const source=readFileSync(new URL('../docs/navigation.js',import.meta.url),'utf8').replace(/^export /gm,'');
  vm.runInNewContext(source+'\nglobalThis.changeVisibility=setHeaderVisible;',context);
  return {document,header,toggle,menu,guide,social,socialIcon,outside,story,
    open(){toggle.focus();toggle.fire('click');},
    clickLink(node){node.closest('a').focus();return menu.fire('click',{target:node});},
    resize(matches){narrow.matches=matches;narrow.change();},
    clickOutside(){outside.focus();return documentEvents.fire('click',{target:outside});},
    setVisible:context.changeVisibility
  };
}

test('mobile disclosure starts closed and toggles its accessible expanded state',()=>{
  const n=navigation();
  assert.equal(n.toggle.hidden,false);
  assert.equal(n.toggle.getAttribute('aria-expanded'),'false');
  assert.equal(n.menu.hidden,true);
  n.open();
  assert.equal(n.toggle.getAttribute('aria-expanded'),'true');
  assert.equal(n.menu.hidden,false);
  n.toggle.fire('click');
  assert.equal(n.toggle.getAttribute('aria-expanded'),'false');
  assert.equal(n.menu.hidden,true);
});

test('Escape closes an open disclosure and returns link focus to its visible toggle',()=>{
  const n=navigation();n.open();n.guide.focus();
  assert.equal(n.header.fire('keydown',{key:'Escape'}).defaultPrevented,true);
  assert.equal(n.menu.hidden,true);
  assert.equal(n.document.activeElement,n.toggle);
  assert.equal(n.header.fire('keydown',{key:'Escape'}).defaultPrevented,false);
});

test('desktop links remain visible and resizing to mobile preserves reachable focus',()=>{
  const n=navigation(false);
  assert.equal(n.toggle.hidden,true);
  assert.equal(n.menu.hidden,false);
  n.social.focus();n.resize(true);
  assert.equal(n.toggle.hidden,false);
  assert.equal(n.menu.hidden,true);
  assert.equal(n.document.activeElement,n.toggle);
  n.resize(false);
  assert.equal(n.toggle.hidden,true);
  assert.equal(n.menu.hidden,false);
  assert.equal(n.document.activeElement,n.guide);
});

test('Guide and external social link activation close the menu without cancelling navigation',()=>{
  for(const name of ['guide','social','socialIcon']){
    const n=navigation();n.open();
    assert.equal(n.clickLink(n[name]).defaultPrevented,false);
    assert.equal(n.menu.hidden,true);
    assert.equal(n.toggle.getAttribute('aria-expanded'),'false');
    assert.equal(n.document.activeElement,n.toggle);
  }
});

test('outside activation and focus leaving close the disclosure without stealing external focus',()=>{
  const n=navigation();n.open();
  assert.equal(n.clickOutside().defaultPrevented,false);
  assert.equal(n.menu.hidden,true);
  assert.equal(n.document.activeElement,n.outside);
  n.open();n.outside.focus();n.header.fire('focusout',{relatedTarget:n.outside});
  assert.equal(n.menu.hidden,true);
  assert.equal(n.document.activeElement,n.outside);
});

test('Journey header hiding resets its disclosure and moves focus to the visible story',()=>{
  const n=navigation();n.open();n.social.focus();n.setVisible(false);
  assert.equal(n.header.inert,true);
  assert.equal(n.header.dataset.visible,'false');
  assert.equal(n.menu.hidden,true);
  assert.equal(n.toggle.getAttribute('aria-expanded'),'false');
  assert.equal(n.document.activeElement,n.story);
  n.setVisible(true);
  assert.equal(n.header.inert,false);
  assert.equal(n.menu.hidden,true);
  n.open();n.setVisible(true);
  assert.equal(n.menu.hidden,false,'scroll updates must not close an already visible menu');
});
