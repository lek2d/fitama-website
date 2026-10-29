import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPortal} from '../src/fitamaster/view.mjs';

const playerId = '12345678-1234-4234-8234-123456789abc';
const otherId = '87654321-4321-4321-8321-cba987654321';
const from = '2026-10-22T09:00:00Z';
const to = '2026-10-29T09:00:00Z';
const nextCursor = {version: 1, playerId, generation: 4, days: 7, anchorAt: to,
  beforeAt: '2026-10-28T09:00:00Z', beforeId: 'care:4:one'};
const player = {profile: {id: playerId, username: 'Known player', friendCode: 'ABC123'}, generation: 4,
  equipment: [{itemId: 'rep-ripper', instanceId: 'weapon-copy', slot: 'weapon', equipped: true,
    grantedAt: '2026-10-01T09:00:00Z'}]};
const history = patch => ({playerId, generation: 4, days: 7, from, to, observedAt: to, resetAt: null,
  coverage: {basis: 'retained_server_records', undatedMagicUses: false, resetWithinWindow: false},
  summary: [{kind: 'consumed', itemId: 'treat', status: null, quantity: 40, eventCount: 40}],
  events: [{eventId: 'care:4:one', kind: 'consumed', itemId: 'treat', quantity: 1, generation: 4,
    recordedAt: '2026-10-28T09:00:00Z', status: null, sentAt: null, receivedAt: null, peer: null}],
  nextCursor, ...patch});

// Match the portal's DOM boundary: remote values can only enter as text.
class Element {
  constructor(tagName = '#text', text = '') {
    this.tagName = tagName; this.text = text; this.children = []; this.attributes = {}; this.events = {};
  }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.text = ''; }
  addEventListener(name, handler) { this.events[name] = handler; }
}
const document = {createElement: tag => new Element(tag), createTextNode: text => new Element('#text', text)};
const nodes = root => [root, ...root.children.flatMap(nodes)];
const tags = (root, tag) => nodes(root).filter(node => node.tagName === tag);
const byClass = (root, name) => nodes(root).filter(node => node.className?.split(' ').includes(name));
const button = (root, label) => tags(root, 'button').find(node => node.textContent === label);
const click = node => node.events.click({currentTarget: node});
const itemHistorySection = root => {
  const section = byClass(root, 'item-history-section')[0];
  assert.ok(section, 'Selected player details include the item history section');
  return section;
};
function fixture(patch = {}, ui = {}) {
  const root = new Element('root');
  const calls = [];
  const actions = {itemHistory: Object.fromEntries(['period', 'refresh', 'page'].map(name =>
    [name, (...args) => calls.push([name, ...args])]))};
  const state = {phase: 'ready', view: 'players', selectedPlayer: playerId, player,
    itemHistory: history(), itemHistoryDays: 7, itemHistoryError: '', busy: false, ...patch};
  const render = (nextState = state, nextUi = ui) => renderPortal(document, root, nextState, actions, nextUi);
  render();
  return {root, calls, state, render};
}

test('selected player details include current equipment and recorded history alongside inventory and grants', () => {
  const {root, calls} = fixture();
  const equipped = byClass(root, 'equipped-section')[0];
  assert.ok(equipped, 'Selected player details include the current equipment section');
  assert.match(equipped.textContent, /Rep Ripper/);
  assert.deepEqual(tags(equipped, 'h3').map(node => node.textContent), ['Weapon', 'Headgear', 'Accessory']);
  assert.equal(tags(equipped, 'img')[0].attributes.src, '../assets/fitamaster-items/rep-ripper.webp');
  assert.doesNotMatch(equipped.textContent, /granted|equipped at|2026-10-01/i);
  assert.equal(byClass(root, 'inventory-section').length, 1);
  assert.equal(byClass(root, 'grant-panel').length, 1);
  const section = itemHistorySection(root);
  assert.match(section.textContent, /Consumed: 40/);
  assert.equal(byClass(section, 'item-history-event').length, 1);
  assert.ok(tags(section, 'time').some(node => node.attributes.datetime === from));
  assert.ok(tags(section, 'time').some(node => node.attributes.datetime === to));
  assert.deepEqual(calls, [], 'Rendering does not request history or dispatch controls');
});

test('history controls dispatch period, refresh and opaque pagination actions from player details', () => {
  const {root, calls} = fixture({}, {pages: {itemHistory: [null]}});
  const section = itemHistorySection(root);
  const selector = tags(section, 'select')[0];
  assert.equal(selector.value, '7');
  selector.value = '30';
  selector.events.change({currentTarget: selector});
  click(button(section, 'Refresh'));
  const previous = button(section, 'Previous');
  const next = button(section, 'Next');
  assert.equal(previous.disabled, false);
  assert.equal(next.disabled, false);
  click(previous);
  click(next);
  assert.deepEqual(calls, [['period', 30], ['refresh'], ['page', 'previous'], ['page', 'next', nextCursor]]);
  assert.equal(calls[3][2], nextCursor, 'The renderer forwards the opaque cursor without rebuilding it');
});

test('default seven-day history works without optional UI state and previous stays disabled', () => {
  const {root, calls} = fixture({itemHistoryDays: undefined});
  const section = itemHistorySection(root);
  assert.equal(tags(section, 'select')[0].value, '7');
  assert.match(section.textContent, /Consumed: 40/);
  const previous = button(section, 'Previous');
  assert.equal(previous.disabled, true);
  click(previous);
  assert.deepEqual(calls, []);
});

test('history data remains bound to the selected details generation and period', () => {
  for (const patch of [
    {itemHistory: history({playerId: otherId})},
    {itemHistory: history({generation: 3})},
    {itemHistoryDays: 30},
  ]) {
    const {root} = fixture(patch);
    const section = itemHistorySection(root);
    assert.match(section.textContent, /unavailable/i);
    assert.equal(byClass(section, 'item-history-event').length, 0);
    assert.equal(byClass(section, 'item-history-summary').length, 0);
    assert.equal(tags(section, 'time').length, 0);
  }
});

test('busy and failed history states do not expose old totals as current or empty history', () => {
  const loading = fixture({busy: true});
  const loadingSection = itemHistorySection(loading.root);
  assert.match(loadingSection.textContent, /Loading item history/);
  assert.equal(byClass(loadingSection, 'item-history-summary').length, 0);
  assert.equal(tags(loadingSection, 'time').length, 0);
  assert.equal(tags(loadingSection, 'select')[0].disabled, true);
  assert.equal(button(loadingSection, 'Refresh').disabled, true);
  click(button(loadingSection, 'Refresh'));
  assert.deepEqual(loading.calls, []);
  const failed = fixture({itemHistoryError: 'History backend unavailable <retry>'});
  const failedSection = itemHistorySection(failed.root);
  assert.match(failedSection.textContent, /History backend unavailable <retry>/);
  assert.equal(byClass(failedSection, 'item-history-summary').length, 0);
  assert.doesNotMatch(failedSection.textContent, /No recorded item events/);
});

test('leaving player details removes equipment and history sections', () => {
  const {root, state, render} = fixture();
  assert.equal(byClass(root, 'equipped-section').length, 1);
  render({...state, selectedPlayer: null, player: null, players: null});
  assert.equal(byClass(root, 'equipped-section').length, 0);
  assert.equal(byClass(root, 'item-history-section').length, 0);
  assert.equal(root.textContent.includes('Rep Ripper'), false);
});

test('auth-loss rendering removes private item data even if stale state is still supplied', () => {
  const {root, state, render, calls} = fixture();
  assert.match(root.textContent, /Consumed: 40/);
  for (const phase of ['login', 'challenge', 'denied', 'verification-error', 'signing-out']) {
    render({...state, phase});
    assert.equal(byClass(root, 'equipped-section').length, 0, phase);
    assert.equal(byClass(root, 'item-history-section').length, 0, phase);
    for (const privateText of [playerId, 'Known player', 'Rep Ripper', 'Consumed: 40'])
      assert.equal(root.textContent.includes(privateText), false, phase + ': ' + privateText);
    assert.equal(nodes(root).some(node => node.attributes.id === 'item-history-days'), false, phase);
  }
  assert.deepEqual(calls, []);
});
