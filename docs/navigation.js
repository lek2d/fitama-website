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

// The ending can be pinned behind the story. Focus it first to expose its normal flow.
header?.querySelector('.nav-download')?.addEventListener('click', event => {
  const destination = event.currentTarget.getAttribute('href');
  if (destination !== '#download') return;
  const download = document.querySelector(destination);
  if (!download) return;
  event.preventDefault();
  download.focus({preventScroll:true});
  download.scrollIntoView({behavior:'instant',block:'start'});
  history.replaceState(null,'',destination);
});
