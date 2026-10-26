import {contactEndpoint, sendContact} from './contact-service.mjs?v=google-cold-start-v2&release=20261026';

const form = document.querySelector('#contact-form');
const status = document.querySelector('#contact-status');
const button = form.querySelector('button[type=submit]');
const fields = form.querySelector('fieldset');
let endpoint = '';
let pending = false;
let request = null;
const configController = new AbortController();
const configTimeout = setTimeout(() => configController.abort(), 8000);
const configuration = fetch('contact-config.json', {cache: 'no-store', credentials: 'omit', signal: configController.signal})
  .then(response => response.ok ? response.json() : {})
  .then(config => { endpoint = contactEndpoint(config.endpoint); })
  .catch(() => {})
  .finally(() => clearTimeout(configTimeout))
  .then(() => {
    if (!endpoint) status.textContent = 'Message sending isn’t available yet. Please check back shortly.';
  });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  const data = new FormData(form);
  const payload = {
    email: String(data.get('email')).trim(), topic: String(data.get('topic')),
    message: String(data.get('message')).trim(), website: String(data.get('website') || ''),
  };
  if (!payload.message) {
    form.elements.message.setCustomValidity('Please add a message.');
    form.elements.message.reportValidity();
    return;
  }
  pending = true;
  button.disabled = true;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = 'Sending…';
  status.textContent = '';
  status.dataset.state = '';
  try {
    await configuration;
    if (!endpoint) throw new Error('unavailable');
    // Retry the same message with the same ID after a lost response.
    const signature = JSON.stringify(payload);
    if (request?.signature !== signature) request = {signature, id: crypto.randomUUID()};
    await sendContact(endpoint, {...payload, requestId: request.id});
    form.reset();
    request = null;
    status.dataset.state = 'success';
    status.textContent = 'Message sent. We’ll reply to your email—Ignie has been asked to keep this one away from the flames.';
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = error.message === 'unavailable'
      ? 'Message sending isn’t available yet. Please check back shortly. Your message is still here.'
      : error.message === 'rate_limited'
        ? 'We’ve received a few messages recently. Please try again later. Your message is still here.'
        : 'We couldn’t confirm your message was sent. Please try again. Your message is still here.';
  } finally {
    pending = false;
    fields.disabled = false;
    button.disabled = false;
    button.textContent = 'Send message';
    form.removeAttribute('aria-busy');
  }
});
form.elements.message.addEventListener('input', () => form.elements.message.setCustomValidity(''));
