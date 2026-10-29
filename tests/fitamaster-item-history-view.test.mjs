import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../src/fitamaster/item-history-view.mjs').catch(() => ({}));
const playerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const from = '2026-10-22T09:00:00Z', to = '2026-10-29T09:00:00Z';
const player = {profile: {id: playerId}, generation: 2};
const event = patch => ({eventId: 'care:2:one', kind: 'consumed', itemId: 'treat', quantity: 1, generation: 2,
  recordedAt: '2026-10-28T09:00:00Z', status: null, sentAt: null, receivedAt: null, peer: null, ...patch});
const data = patch => ({playerId, generation: 2, days: 7, from, to, observedAt: to, resetAt: null,
  coverage: {basis: 'retained_server_records', undatedMagicUses: false, resetWithinWindow: false},
  summary: [{kind: 'consumed', itemId: 'treat', status: null, quantity: 40, eventCount: 40}],
  events: [event({})], nextCursor: null, ...patch});
class Element {
  constructor(tagName = '#text', text = '') { this.tagName = tagName; this.text = text; this.children = []; this.attributes = {}; this.events = {}; }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  addEventListener(name, handler) { this.events[name] = handler; }
}
const document = {createElement: tag => new Element(tag), createTextNode: text => new Element('#text', text)};
const nodes = root => [root, ...root.children.flatMap(nodes)];
const tags = (root, tag) => nodes(root).filter(node => node.tagName === tag);
const byClass = (root, name) => nodes(root).filter(node => node.className?.split(' ').includes(name));
const button = (root, label) => tags(root, 'button').find(node => node.textContent === label);
const click = node => node.events.click({currentTarget: node});
function fixture(state = {}) {
  assert.equal(typeof api.renderPlayerItemHistory, 'function');
  const calls = [];
  const actions = Object.fromEntries(['period', 'refresh', 'page'].map(name => [name, (...args) => calls.push([name, ...args])]));
  return {root: api.renderPlayerItemHistory(document, {player, data: data({}), days: 7, busy: false,
    error: null, canPrevious: false, ...state}, actions), calls};
}

test('history names the rolling server window and retained-record coverage rather than a calendar week', () => {
  const {root} = fixture();
  assert.ok(root.textContent.includes('Last 7 days'));
  const times = tags(root, 'time').map(node => node.attributes.datetime);
  assert.ok(times.includes(from));
  assert.ok(times.includes(to));
  assert.match(root.textContent, /inclusive/i);
  assert.match(root.textContent, /exclusive/i);
  assert.match(root.textContent, /retained server records/i);
  assert.match(root.textContent, /reset|delet/i);
  assert.doesNotMatch(root.textContent, /calendar week/i);
});

test('period totals use the full-window summary with approved item icons, independently from the current page', () => {
  const {root} = fixture();
  const summary = byClass(root, 'item-history-summary')[0];
  assert.match(summary.textContent, /Treat/);
  assert.match(summary.textContent, /Consumed: 40/);
  assert.match(summary.textContent, /Records: 40/);
  assert.equal(tags(summary, 'img')[0].attributes.src, '../assets/fitamaster-items/treat.webp');
  assert.equal(byClass(root, 'item-history-event').length, 1);
  assert.match(root.textContent, /all retained records/i);
});

test('summary groups keep sent, claimed, pending incoming and invalidated incoming counts separate', () => {
  const summary = [
    {kind: 'gift_sent', itemId: 'rep-ripper', status: 'received', quantity: 1, eventCount: 1},
    {kind: 'gift_claimed', itemId: 'health-potion', status: 'received', quantity: 9, eventCount: 3},
    {kind: 'gift_incoming', itemId: 'treat', status: 'pending', quantity: 8, eventCount: 2},
    {kind: 'gift_incoming', itemId: 'treat', status: 'invalidated', quantity: 4, eventCount: 1},
  ];
  const {root} = fixture({data: data({summary, events: []})});
  const groups = byClass(root, 'item-history-summary-group');
  assert.equal(groups.length, 4);
  for (const [label, quantity, records] of [
    ['Gifts sent', 1, 1], ['Gifts claimed', 9, 3], ['Awaiting claim', 8, 2], ['Invalidated', 4, 1],
  ]) {
    const group = groups.find(node => node.textContent.includes(label));
    assert.ok(group, label);
    assert.ok(group.textContent.includes('Quantity: ' + quantity));
    assert.ok(group.textContent.includes('Records: ' + records));
  }
  assert.doesNotMatch(root.textContent, /unique transfers|overall gift total/i);
  assert.match(root.textContent, /not credited/i);
});

test('timeline shows real dates, gift states, counterparty-name provenance and prior progress without raw messages', () => {
  const secret = 'PRIVATE GIFT MESSAGE';
  const events = [
    event({eventId: 'gift:one:sent', kind: 'gift_sent', itemId: 'rep-ripper', status: 'received',
      sentAt: '2026-10-27T09:00:00Z', receivedAt: '2026-10-28T09:00:00Z',
      peer: {playerId: otherId, username: 'Current recipient', nameSource: 'current_profile'}, message: secret}),
    event({eventId: 'gift:two:claimed', kind: 'gift_claimed', quantity: 8, status: 'received', generation: 1,
      sentAt: '2026-10-01T09:00:00Z', receivedAt: '2026-10-28T09:00:00Z',
      peer: {playerId: null, username: 'Sender snapshot', nameSource: 'at_send'}}),
    event({eventId: 'gift:three:incoming', kind: 'gift_incoming', status: 'invalidated',
      sentAt: '2026-10-26T09:00:00Z', peer: {playerId: null, username: null, nameSource: 'unavailable'}}),
  ];
  const {root} = fixture({data: data({events})});
  const rows = byClass(root, 'item-history-event');
  assert.equal(rows.length, 3);
  assert.match(rows[0].textContent, /Recipient \(current profile\)/);
  assert.match(rows[0].textContent, /Current recipient/);
  assert.match(rows[1].textContent, /Sender \(at send\)/);
  assert.match(rows[1].textContent, /Sender snapshot/);
  assert.match(rows[1].textContent, /Earlier progress/);
  assert.match(rows[2].textContent, /Invalidated/);
  assert.match(rows[2].textContent, /Account unavailable/);
  assert.match(rows[2].textContent, /invalidation time is not recorded/i);
  assert.ok(tags(rows[1], 'time').some(node => node.attributes.datetime === '2026-10-01T09:00:00Z'));
  assert.equal(root.textContent.includes(secret), false);
  assert.equal(root.textContent.includes('gift:one:sent'), false);
});

test('box openings and reusable Magic Potion or Bottle uses are not presented as consumed stock', () => {
  const summary = [
    {kind: 'opened', itemId: 'treasure-box', status: null, quantity: 2, eventCount: 2},
    {kind: 'used', itemId: 'magic-potion', status: null, quantity: 3, eventCount: 3},
    {kind: 'used', itemId: 'power-bottle', status: null, quantity: 4, eventCount: 4},
  ];
  const {root} = fixture({data: data({summary, events: [event({kind: 'used', itemId: 'power-bottle'})]})});
  const groups = byClass(root, 'item-history-summary-group');
  assert.ok(groups.some(node => /Boxes opened/.test(node.textContent) && /Opened: 2/.test(node.textContent)));
  const used = groups.find(node => node.textContent.includes('Reusable items used'));
  assert.match(used.textContent, /Magic Potion/);
  assert.match(used.textContent, /Uses: 3/);
  assert.match(used.textContent, /Power Bottle/);
  assert.match(used.textContent, /Uses: 4/);
  assert.doesNotMatch(byClass(root, 'item-history-event')[0].textContent, /Consumed/);
  assert.doesNotMatch(root.textContent, /TP awarded|potion stock/i);
});

test('native period and refresh controls accept only 7 or 30 days without sending on render', () => {
  const {root, calls} = fixture();
  assert.deepEqual(calls, []);
  const select = tags(root, 'select')[0];
  assert.deepEqual(tags(select, 'option').map(node => node.attributes.value), ['7', '30']);
  for (const value of ['14', '7x', '', 'Infinity']) select.events.change({currentTarget: {value}});
  assert.deepEqual(calls, []);
  select.events.change({currentTarget: {value: '30'}});
  click(button(root, 'Refresh'));
  assert.deepEqual(calls, [['period', 30], ['refresh']]);
});

test('pagination preserves the opaque cursor and only enables Previous when the controller supplies availability', () => {
  const nextCursor = {version: 1, playerId, generation: 2, days: 7, anchorAt: to, beforeAt: '2026-10-28T09:00:00Z', beforeId: 'care:2:one'};
  const {root, calls} = fixture({data: data({nextCursor})});
  assert.equal(button(root, 'Previous').disabled, true);
  click(button(root, 'Previous'));
  click(button(root, 'Next'));
  assert.deepEqual(calls, [['page', 'next', nextCursor]]);
  assert.equal(calls[0][2], nextCursor);
  const previous = fixture({canPrevious: true});
  click(button(previous.root, 'Previous'));
  assert.deepEqual(previous.calls, [['page', 'previous']]);
  assert.equal(button(previous.root, 'Next').disabled, true);
});

test('loading disables every action and hides old records and counts even when matching data is supplied', () => {
  const {root, calls} = fixture({busy: true});
  assert.match(root.textContent, /Loading item history/);
  assert.equal(root.textContent.includes('Treat'), false);
  assert.equal(byClass(root, 'item-history-summary').length, 0);
  assert.equal(byClass(root, 'item-history-event').length, 0);
  tags(root, 'select')[0].events.change({currentTarget: {value: '30'}});
  for (const node of tags(root, 'button')) { assert.equal(node.disabled, true); click(node); }
  assert.equal(tags(root, 'select')[0].disabled, true);
  assert.deepEqual(calls, []);
});

test('a required player reload disables history controls while preserving the specific reload error', () => {
  const {root, calls} = fixture({needsReload: true, error: 'Reload player details before viewing item history.'});
  assert.match(root.textContent, /Reload player details/);
  assert.equal(tags(root, 'select')[0].disabled, true);
  assert.equal(button(root, 'Refresh').disabled, true);
  tags(root, 'select')[0].events.change({currentTarget: {value: '30'}});
  click(button(root, 'Refresh'));
  assert.deepEqual(calls, []);
  assert.equal(byClass(root, 'item-history-event').length, 0);
});

test('errors and missing or mismatched player, generation, period or projection data never become empty history', () => {
  for (const state of [{error: 'History page expired. Refresh to retry.'}, {data: null}, {player: null},
    {data: data({playerId: otherId})}, {data: data({generation: 1})}, {days: 30}, {data: data({summary: null})}]) {
    const {root} = fixture(state);
    assert.equal(byClass(root, 'item-history-event').length, 0);
    assert.equal(byClass(root, 'item-history-summary').length, 0);
    assert.equal(root.textContent.includes('No recorded item events'), false);
    assert.equal(root.textContent.includes('Treat'), false);
  }
  const failed = fixture({error: 'History page expired. Refresh to retry.'});
  assert.equal(button(failed.root, 'Refresh').disabled, false);
  click(button(failed.root, 'Refresh'));
  assert.deepEqual(failed.calls, [['refresh']]);
});

test('an empty retained window is stated narrowly, without implying the player never used or gifted items', () => {
  const {root} = fixture({data: data({summary: [], events: []})});
  assert.match(root.textContent, /No recorded item events in the retained records for this period/);
  assert.match(root.textContent, /incomplete|removed/i);
  assert.doesNotMatch(root.textContent, /never used|never gifted|Quantity: 0/);
});

test('reset and undated Magic coverage notices qualify totals without fabricating dates or events', () => {
  const resetAt = '2026-10-25T09:00:00Z';
  const {root} = fixture({data: data({resetAt, coverage: {basis: 'retained_server_records', undatedMagicUses: true, resetWithinWindow: true}})});
  assert.match(root.textContent, /progress reset/i);
  assert.match(root.textContent, /legacy Magic Potion uses have no recorded date/i);
  assert.match(root.textContent, /excluded/i);
  assert.ok(tags(root, 'time').some(node => node.attributes.datetime === resetAt));
  assert.equal(byClass(root, 'item-history-event').length, 1);
});

test('remote item IDs, names and errors remain literal text and can never provide artwork URLs or markup', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const unknown = data({summary: [{kind: 'consumed', itemId: payload, status: null, quantity: 1, eventCount: 1}],
    events: [event({kind: 'gift_claimed', itemId: payload, status: 'received', peer: {playerId: null, username: payload, nameSource: 'at_send'}})]});
  const {root} = fixture({data: unknown});
  assert.ok(root.textContent.includes(payload));
  assert.equal(tags(root, 'img').length, 0);
  assert.equal(tags(root, 'script').length, 0);
  const failed = fixture({error: payload}).root;
  assert.ok(failed.textContent.includes(payload));
  assert.equal(tags(failed, 'img').length, 0);
});
