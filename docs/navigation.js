const header = document.querySelector('.site-header');

// Keep keyboard focus in the visible story when the header leaves the tab order.
export function setHeaderVisible(visible) {
  if (!header) return;
  if (!visible && header.contains(document.activeElement)) {
    document.querySelector('.scroll-story')?.focus({preventScroll:true});
  }
  header.dataset.visible = String(visible);
  header.inert = !visible;
}

function plainClick(event) {
  return !event.defaultPrevented && event.button===0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

function scrollBehavior() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-off') ? 'instant' : 'smooth';
}

// Focus first releases the pinned ending before the browser measures its scroll target.
header?.querySelector('.nav-download')?.addEventListener('click', event => {
  if (!plainClick(event)) return;
  const destination = event.currentTarget.getAttribute('href');
  if (destination !== '#download') return;
  const download = document.querySelector(destination);
  if (!download) return;
  event.preventDefault();
  download.focus({preventScroll:true});
  download.scrollIntoView({behavior:scrollBehavior(),block:'start'});
  history.replaceState(null,'',destination);
});

// On Journey, the logo returns through the current scene instead of reloading it.
// Other pages retain their real home link, including modified/new-tab activation.
header?.querySelector('.nav-brand')?.addEventListener('click', event => {
  if (!plainClick(event)) return;
  const destination = new URL(event.currentTarget.getAttribute('href'),location.href);
  if (destination.origin!==location.origin || destination.pathname!==location.pathname) return;
  event.preventDefault();
  document.querySelector('.scroll-story')?.focus({preventScroll:true});
  scrollTo({top:0,behavior:scrollBehavior()});
  history.replaceState(null,'',location.pathname+location.search);
});
