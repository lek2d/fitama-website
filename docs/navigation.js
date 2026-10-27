const header = document.querySelector('.site-header');
const menuToggle = header?.querySelector('.nav-toggle');
const menu = header?.querySelector('.header-menu');
let closeHeaderMenu = () => {};

if (menuToggle && menu) {
  const narrow = matchMedia('(max-width: 699px)');
  function setMenuOpen(open, restoreFocus = false) {
    if (restoreFocus && menu.contains(document.activeElement)) menuToggle.focus({preventScroll:true});
    menuToggle.setAttribute('aria-expanded', String(open));
    menu.hidden = narrow.matches && !open;
  }
  closeHeaderMenu = () => setMenuOpen(false);
  header.classList.add('nav-enhanced');
  menuToggle.hidden = !narrow.matches;
  setMenuOpen(false);
  menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    setMenuOpen(false, true);
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false, narrow.matches);
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) setMenuOpen(false, narrow.matches);
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenuOpen(false);
  });
  narrow.addEventListener('change', () => {
    // Keep focused links reachable when desktop navigation collapses.
    const toggleHadFocus = document.activeElement === menuToggle;
    menuToggle.hidden = !narrow.matches;
    setMenuOpen(false, narrow.matches);
    if (!narrow.matches && toggleHadFocus) menu.querySelector('a')?.focus({preventScroll:true});
  });
}

// Keep keyboard focus in the visible story when the header leaves the tab order.
export function setHeaderVisible(visible) {
  if (!header) return;
  if (!visible && header.contains(document.activeElement)) {
    document.querySelector('.scroll-story')?.focus({preventScroll:true});
  }
  if (!visible) closeHeaderMenu();
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
