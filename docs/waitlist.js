import {submitWaitlist, loadWaitlistConfig} from './waitlist-request.mjs?v=review-v2&release=20261026';

const dialog = document.querySelector('#android-waitlist');
const form = dialog.querySelector('form');
const email = dialog.querySelector('#waitlist-email');
const error = dialog.querySelector('#waitlist-error');
const submit = dialog.querySelector('[type="submit"]');
const submitLabel = submit.querySelector('span');
const intro = dialog.querySelector('.waitlist-intro');
const success = dialog.querySelector('.waitlist-success');
let opener;
let pending = null;
let previousOverflow = '';

function setBusy(busy) {
  form.setAttribute('aria-busy', String(busy));
  submit.setAttribute('aria-disabled', String(busy));
  email.readOnly = busy;
  submitLabel.textContent = busy ? 'Adding you to the list…' : 'Notify me at launch';
}

function openWaitlist(trigger) {
  if (dialog.open) return;
  opener = trigger;
  intro.hidden = false;
  form.hidden = false;
  success.hidden = true;
  error.textContent = '';
  email.removeAttribute('aria-invalid');
  dialog.setAttribute('aria-labelledby', 'waitlist-title');
  dialog.setAttribute('aria-describedby', 'waitlist-description');
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.classList.add('waitlist-open');
  dialog.showModal();
  // Focus the title first so the sheet is announced without forcing a mobile keyboard.
  dialog.querySelector('#waitlist-title').focus({preventScroll: true});
}

document.querySelectorAll('[data-open-waitlist]').forEach(button => {
  button.addEventListener('click', () => openWaitlist(button));
});
dialog.querySelectorAll('[data-close-waitlist]').forEach(button => {
  button.addEventListener('click', () => dialog.close());
});
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  pending?.abort();
  pending = null;
  setBusy(false);
  document.body.style.overflow = previousOverflow;
  document.body.classList.remove('waitlist-open');
  const returnTarget = opener || document.querySelector('.site-header:not([inert]) .nav-brand') || document.querySelector('.hero-copy [data-open-waitlist]');
  returnTarget?.focus({preventScroll: Boolean(opener)});
});
email.addEventListener('input', () => {
  email.removeAttribute('aria-invalid');
  error.textContent = '';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  email.value = email.value.trim();
  if (!email.validity.valid || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value)) {
    email.setAttribute('aria-invalid', 'true');
    error.textContent = 'Please enter a valid email address, like you@example.com.';
    email.focus();
    return;
  }
  const controller = new AbortController();
  pending = controller;
  setBusy(true);
  error.textContent = '';
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const settings = await loadWaitlistConfig({signal: controller.signal});
    if (pending !== controller) return;
    await submitWaitlist(settings?.endpoint, email.value, {
      signal: controller.signal, website: form.elements.website.value,
    });
    if (pending !== controller || !dialog.open) return;
    intro.hidden = true;
    form.hidden = true;
    success.hidden = false;
    dialog.setAttribute('aria-labelledby', 'waitlist-success-title');
    dialog.setAttribute('aria-describedby', 'waitlist-success-description');
    dialog.querySelector('#waitlist-success-title').focus({preventScroll: true});
    form.reset();
  } catch {
    if (pending !== controller || !dialog.open) return;
    error.textContent = 'We couldn’t confirm your signup. Please try again in a moment.';
  } finally {
    clearTimeout(timeout);
    if (pending === controller) {pending = null; setBusy(false);}
  }
});

// Guide links can open the same accessible sheet without duplicating the form.
if (location.hash === '#android-waitlist') openWaitlist(null);
addEventListener('hashchange', () => {
  if (location.hash === '#android-waitlist') openWaitlist(null);
});
