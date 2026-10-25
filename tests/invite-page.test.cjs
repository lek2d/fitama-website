// Owner request (2026-10-25): "Get FiTama" carries the invite through the install by
// copying the invite link; after sign-in FiTama offers "Use your friend's invite?".
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'docs', '404.html'), 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

function page(pathname, clipboard) {
  const ids = ['invite', 'missing', 'code', 'copy', 'copied', 'install', 'open'];
  const elements = Object.fromEntries(ids.map(id => [id, { hidden: true, textContent: '', href: '#', listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; } }]));
  const written = [];
  const location = { pathname, href: 'https://fitama.app' + pathname };
  const navigator = clipboard ? { clipboard: { writeText: value => { written.push(value); return Promise.resolve(); } } } : {};
  const document = { title: '', getElementById: id => elements[id], createRange: () => ({ selectNodeContents() {} }) };
  vm.runInNewContext(script, { document, location, navigator, window: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
    setTimeout, clearTimeout, Promise });
  return { elements, written, location };
}

test('Get FiTama copies the invite link, then opens the install page', async () => {
  const p = page('/r/abcd2345', true);
  let prevented = false;
  p.elements.install.listeners.click({ preventDefault() { prevented = true; } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(p.written, ['https://fitama.app/r/ABCD2345']);
  assert.equal(prevented, true, 'navigation waits for the copy');
  assert.match(p.location.href, /^https:\/\/testflight\.apple\.com\/join\//);
});

test('without the Clipboard API the button is a plain link to the install page', () => {
  const p = page('/r/abcd2345', false);
  let prevented = false;
  p.elements.install.listeners.click?.({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.match(p.elements.install.href, /^https:\/\/testflight\.apple\.com\/join\//);
});

test('the steps name the prompt players will see', () => {
  assert.match(html, /Use your friend’s invite\?/);
  assert.match(html, /copies your invite/i);
});
