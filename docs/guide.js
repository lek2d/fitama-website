import {matchesGuide, guideSearchResults} from './guide-search.mjs?v=results-view-v2&release=20261026';
const form=document.querySelector('.guide-search');
const input=document.querySelector('#guide-query');
const clearButton=form.querySelector('button[type=reset]');
const results=document.querySelector('#guide-results');
const articles=[...document.querySelectorAll('.guide-article')];
const filters=[...document.querySelectorAll('[data-category-filter]')];
const status=document.querySelector('.result-status');
const browse=document.querySelector('.guide-body');
const sidebar=document.querySelector('.guide-sidebar');
const categoryNav=document.querySelector('.guide-categories');
const featured=document.querySelector('.guide-visual-nav');
const searchHeading=document.querySelector('.guide-search-heading');
const searchTitle=document.querySelector('#guide-search-title');
const matchList=document.querySelector('.guide-match-list');
const arrow=document.querySelector('.guide-shortcuts .link-arrow');
const topics=articles.map(article=>({
  id:article.id, title:article.querySelector('h2').textContent.trim(),
  category:article.dataset.category, text:article.textContent,
  excerpt:[...article.querySelectorAll('p')].find(p=>!p.classList.contains('category'))?.textContent||'',
}));
let category='all';
function keepCategoryVisible(preferFocus=false){
  if(!categoryNav||sidebar.hidden||categoryNav.scrollWidth<=categoryNav.clientWidth)return;
  const selected=(preferFocus&&filters.includes(document.activeElement)?document.activeElement:null)
    ||filters.find(button=>button.dataset.categoryFilter===category);
  if(!selected)return;
  const row=categoryNav.getBoundingClientRect(), item=selected.getBoundingClientRect();
  // Adjust only this row; filtering and clearing search must not scroll the page.
  if(item.left<row.left+8)categoryNav.scrollLeft+=item.left-row.left-8;
  else if(item.right>row.right-8)categoryNav.scrollLeft+=item.right-row.right+8;
}
addEventListener('resize',()=>keepCategoryVisible(true),{passive:true});
function render(){
  const query=input.value.trim();
  const searching=Boolean(query);
  if(searching)category='all';
  clearButton.hidden=input.value.length===0;
  const matches=searching?guideSearchResults(topics,query):[];
  let count=searching?matches.length:0;
  for(const article of articles){
    const match=matchesGuide(article.textContent,article.dataset.category,input.value,category);
    article.hidden=searching||!match;
    if(!searching&&match)count++;
  }
  sidebar.hidden=searching;
  featured.hidden=searching;
  browse.classList.toggle('is-searching',searching);
  searchHeading.hidden=!searching;
  searchTitle.textContent=searching?`${count} ${count===1?'Result':'Results'} for “${query}”`:'';
  results.setAttribute('aria-label',searching?'Guide search results':'Guide articles');
  matchList.hidden=!searching||count===0;
  matchList.replaceChildren(...matches.map(topic=>{
    const row=document.createElement('li');
    const label=document.createElement('p'); label.className='guide-match-category'; label.textContent=topic.category;
    const heading=document.createElement('h3');
    const link=document.createElement('a'); link.href='#'+topic.id; link.className='arrow-link guide-match-link';
    const title=document.createElement('span'); title.className='arrow-link-label'; title.textContent=topic.title;
    link.append(title,arrow.cloneNode(true)); heading.append(link);
    const excerpt=document.createElement('p'); excerpt.className='guide-match-excerpt'; excerpt.textContent=topic.excerpt;
    row.append(label,heading,excerpt); return row;
  }));
  filters.forEach(button=>button.setAttribute('aria-pressed',button.dataset.categoryFilter===category));
  keepCategoryVisible();
  status.textContent=`${count} ${count===1?'topic':'topics'}${input.value.trim()?' found':' to explore'}`;
  status.hidden=searching||category==='all';
  document.querySelector('.no-results').hidden=count!==0;
}
input.addEventListener('input',render);
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!input.value.trim())return;
  results.focus({preventScroll:true});
  results.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
form.addEventListener('reset',()=>{category='all';input.value='';render();input.focus();});
filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.categoryFilter;render();}));
function hashTarget(hash){
  try{return document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return null;}
}
function revealHash(smooth=false){
  const target=hashTarget(location.hash);
  const article=target?.closest('.guide-article');
  if(!article||!articles.includes(article))return;
  category='all';input.value='';render();
  target.scrollIntoView({block:'start',behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
  target.focus({preventScroll:true});
}
addEventListener('hashchange',()=>revealHash(true));
// Re-selecting the current topic must reveal it even after a filter hid it.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link && link.hash===location.hash && hashTarget(link.hash)?.closest('.guide-article')){
    event.preventDefault();
    revealHash(true);
  }
});
render();
if(location.hash)requestAnimationFrame(()=>revealHash());
