import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../src/fitamaster/equipped-view.mjs').catch(() => ({}));
class Element {
  constructor(tagName = '#text', text = '') { this.tagName = tagName; this.text = text; this.children = []; this.attributes = {}; }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
}
const document = {createElement: tag => new Element(tag), createTextNode: text => new Element('#text', text)};
const nodes = root => [root, ...root.children.flatMap(nodes)];
const tags = (root, tag) => nodes(root).filter(node => node.tagName === tag);
const slots = root => tags(root, 'li');
const copy = (itemId, instanceId, slot, equipped = true) => ({itemId, instanceId, slot, equipped, grantedAt: '2026-10-01T00:00:00Z'});
function render(player) {
  assert.equal(typeof api.renderEquippedEquipment, 'function');
  return api.renderEquippedEquipment(document, player);
}

test('three current slots use only confirmed equipped copies and approved item artwork without write controls', () => {
  const player = {equipment: [copy('rep-ripper', 'weapon-copy', 'weapon'), copy('hardheaded-hero', 'head-copy', 'headgear'),
    copy('restie-bestie', 'accessory-copy', 'accessory'), copy('vitaslash', 'owned-only', 'weapon', false)]};
  const before = JSON.stringify(player);
  const root = render(player);
  assert.equal(slots(root).length, 3);
  assert.deepEqual(tags(root, 'h3').map(node => node.textContent), ['Weapon', 'Headgear', 'Accessory']);
  for (const [index, name, id] of [[0, 'Rep Ripper', 'rep-ripper'], [1, 'Hardheaded Hero', 'hardheaded-hero'], [2, 'Restie Bestie', 'restie-bestie']]) {
    assert.ok(slots(root)[index].textContent.includes(name));
    assert.equal(tags(slots(root)[index], 'img')[0].attributes.src, '../assets/fitamaster-items/' + id + '.webp');
  }
  assert.equal(root.textContent.includes('VitaSlash'), false);
  assert.equal(nodes(root).some(node => ['button', 'input', 'select', 'textarea', 'form'].includes(node.tagName)), false);
  assert.match(root.textContent, /last saved server state/i);
  assert.match(root.textContent, /offline/i);
  assert.equal(JSON.stringify(player), before);
});

test('an authoritative empty or entirely unequipped projection has three explicit empty slots', () => {
  for (const equipment of [[], [copy('rep-ripper', 'owned-copy', 'weapon', false)]]) {
    const root = render({equipment});
    assert.equal(slots(root).filter(node => node.textContent.includes('No item equipped')).length, 3);
    assert.equal(tags(root, 'img').length, 0);
    assert.equal(root.textContent.includes('Unavailable'), false);
  }
});

test('missing, malformed and incomplete equipment projections never become a known empty loadout', () => {
  for (const equipment of [undefined, null, {}, [null], [[]], ['invalid'], [{}],
    [{...copy('rep-ripper', 'copy', 'weapon'), equipped: null}],
    [{...copy('rep-ripper', 'copy', 'weapon'), instanceId: ''}],
    [{...copy('rep-ripper', 'copy', 'weapon'), slot: 'unknown-slot'}],
    [copy('treat', 'not-equipment', 'weapon')]]) {
    const root = render({equipment});
    assert.equal(slots(root).filter(node => node.textContent.includes('Unavailable')).length, 3, JSON.stringify(equipment));
    assert.equal(root.textContent.includes('No item equipped'), false);
    assert.equal(tags(root, 'img').length, 0);
  }
});

test('repeated copies collapse by instance ID and acquisition date differences do not create equipped timestamps', () => {
  const first = copy('rep-ripper', 'same-copy', 'weapon');
  const root = render({equipment: [first, {...first}, {...first, grantedAt: '2026-10-28T00:00:00Z'}]});
  assert.equal(tags(root, 'img').length, 1);
  assert.ok(slots(root)[0].textContent.includes('Rep Ripper'));
  assert.equal(slots(root).filter(node => node.textContent.includes('No item equipped')).length, 2);
  assert.equal(root.textContent.includes(first.grantedAt), false);
  assert.equal(root.textContent.includes('2026-10-28'), false);
  assert.equal(/equipped at|received at|granted/i.test(root.textContent), false);
});

test('conflicting facts or item IDs for one physical instance make the saved loadout unavailable', () => {
  const first = copy('rep-ripper', 'same-copy', 'weapon');
  for (const conflicting of [{...first, equipped: false}, {...first, slot: 'accessory'}, {...first, itemId: 'vitaslash'}]) {
    const root = render({equipment: [first, conflicting]});
    assert.equal(slots(root).filter(node => node.textContent.includes('Unavailable')).length, 3);
    assert.equal(tags(root, 'img').length, 0);
  }
});

test('two distinct equipped copies in one slot remain unknown instead of choosing one by acquisition date', () => {
  for (const secondId of ['rep-ripper', 'vitaslash']) {
    const root = render({equipment: [copy('rep-ripper', 'copy-a', 'weapon'), copy(secondId, 'copy-b', 'weapon')]});
    assert.ok(slots(root)[0].textContent.includes('Unavailable'));
    assert.equal(tags(slots(root)[0], 'img').length, 0);
    assert.equal(slots(root).filter(node => node.textContent.includes('No item equipped')).length, 2);
  }
});

test('an unknown equipment ID is literal text with no invented artwork and remote markup is never interpreted', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const root = render({equipment: [copy(payload, 'unknown-copy', 'weapon')]});
  assert.ok(slots(root)[0].textContent.includes(payload));
  assert.equal(tags(root, 'img').length, 0);
  assert.equal(tags(root, 'script').length, 0);
});
