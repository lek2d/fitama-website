import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemGrantController} from '../src/fitamaster/grant-controller.mjs';

const api = await import('../src/fitamaster/grant-view.mjs').catch(() => ({}));
const playerId = '12345678-1234-4234-8234-123456789abc';
const requestId = 'abcdef12-1234-4234-8234-123456789abc';
const player = {profile: {id: playerId, username: 'Known player', friendCode: 'ABC123'}, generation: 4};
const draft = {itemId: 'treat', quantity: 3, reason: 'Support correction'};
const review = {playerId, username: 'Known player', friendCode: 'ABC123', generation: 4, ...draft, requestId};

// This DOM boundary deliberately rejects markup. FormData preserves duplicate and non-string values.
class Element {
  constructor(tagName = '#text', text = '') {
    this.tagName = tagName; this.text = text; this.children = []; this.attributes = {}; this.events = {}; this.value = '';
  }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); if (['value', 'name', 'type'].includes(name)) this[name] = String(value); }
  append(...children) { this.children.push(...children); }
  addEventListener(name, handler) { this.events[name] = handler; }
  focus() { this.focused = true; }
}
const document = {
  createElement: tag => new Element(tag), createTextNode: text => new Element('#text', text),
  defaultView: {FormData: class {
    constructor(form) { this.entries = form.formEntries ?? nodes(form)
      .filter(node => node.attributes.name && !node.disabled && (node.attributes.type !== 'radio' || node.checked))
      .map(node => [node.attributes.name, node.tagName === 'textarea' ? node.value || node.textContent : node.value]); }
    getAll(name) { return this.entries.filter(([key]) => key === name).map(([, value]) => value); }
  }},
};
const nodes = root => [root, ...root.children.flatMap(nodes)];
const tags = (root, tag) => nodes(root).filter(node => node.tagName === tag);
const button = (root, label) => tags(root, 'button').find(node => node.textContent === label);
const control = (root, name) => nodes(root).find(node => node.attributes.name === name);
const choices = root => tags(root, 'input').filter(node => node.attributes.type === 'radio');
const click = node => node?.events.click?.({currentTarget: node});
function fixture(state = {}) {
  assert.equal(typeof api.renderItemGrant, 'function', 'grant renderer must exist');
  const calls = [];
  const actions = Object.fromEntries(['toggle', 'change', 'review', 'edit', 'confirm', 'checkStatus'].map(name =>
    [name, (...args) => calls.push([name, ...args])]));
  return {root: api.renderItemGrant(document, {player, busy: false, open: true, draft, review: null,
    result: null, uncertain: false, statusChecked: false, ...state}, actions), calls};
}
function submit(root, entries = Object.entries({itemId: 'treat', quantity: '3', reason: 'Support correction'})) {
  const form = tags(root, 'form')[0];
  assert.ok(form, 'draft form is available');
  form.formEntries = entries;
  let prevented = false;
  form.events.submit({currentTarget: form, preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
}

test('picker offers 37 labeled native radios, each with the approved real item icon', () => {
  const {root} = fixture();
  const options = choices(root);
  assert.equal(options.length, 37);
  assert.equal(new Set(options.map(node => node.attributes.value)).size, 37);
  for (const id of ['ancient-compass', 'power-bottle'])
    assert.equal(options.some(node => node.attributes.value === id), false, id);
  const groups = tags(root, 'fieldset');
  assert.deepEqual(groups.map(group => choices(group).length), [12, 24, 1]);
  assert.deepEqual(groups.map(group => tags(group, 'legend')[0].textContent), ['Items', 'Equipment', 'Tester access']);
  const rows = tags(root, 'label').filter(node => choices(node).length);
  assert.equal(rows.length, 37);
  for (const row of rows) {
    const radio = choices(row)[0];
    assert.equal(radio.attributes.name, 'itemId');
    assert.equal(radio.disabled, false);
    assert.equal(tags(row, 'img')[0].attributes.src, '../assets/fitamaster-items/' + radio.value + '.webp');
    assert.equal(tags(row, 'img')[0].attributes.alt, '');
    assert.ok(row.textContent.trim());
  }
  assert.deepEqual(options.filter(node => node.checked).map(node => node.value), ['treat']);
  assert.equal(tags(root, 'img')[0].attributes.src, '../assets/fitamaster-items/treat.webp');
  const unsafe = fixture({draft: {...draft, itemId: 'javascript:alert(1)'}}).root;
  assert.ok(tags(unsafe, 'img').every(node => node.attributes.src.startsWith('../assets/fitamaster-items/')));
  assert.equal(choices(unsafe).some(node => node.checked), false);
  assert.equal(tags(root, 'select').length, 0);
});

test('an empty draft requires explicit item selection and cannot default to a grantable item', () => {
  const {root, calls} = fixture({draft: {}});
  assert.equal(choices(root).some(node => node.checked), false);
  assert.equal(nodes(root).find(node => node.attributes.id === 'grant-item').textContent, 'Choose an item');
  submit(root, [['itemId', ''], ['quantity', '1'], ['reason', 'Correction']]);
  assert.deepEqual(calls, []);
});

test('native Add item disclosure and input changes preserve the draft without sending', () => {
  const {root, calls} = fixture({open: false});
  assert.equal(root.tagName, 'details');
  assert.equal(tags(root, 'summary')[0].textContent, 'Add item');
  assert.equal('open' in root.attributes, false);
  root.events.toggle({currentTarget: {open: true}});
  const form = tags(root, 'form')[0];
  form.events.input({target: {name: 'reason', value: 'Replaced lost stock'}});
  form.events.change({target: {name: 'itemId', value: 'vitaslash', checked: true, type: 'radio'}});
  form.events.input({target: {name: '__proto__', value: 'ignored'}});
  assert.deepEqual(calls, [['toggle', true], ['change', 'reason', 'Replaced lost stock'], ['change', 'itemId', 'vitaslash']]);
});

test('native radio FormData preserves the selected item, quantity and reason across the controller redraw', () => {
  let root, controller;
  const localDocument = {...document, getElementById: id => nodes(root).find(node => node.attributes.id === id)};
  const portal = {state: {phase: 'ready', busy: false, selectedPlayer: playerId, player},
    setError(message) { assert.fail(message); }};
  const render = () => { root = api.renderItemGrant(localDocument,
    {player, ...controller.state}, controller.actions); };
  controller = createItemGrantController(portal, {id: () => requestId, onChange: render});
  controller.sync(portal.state);
  controller.actions.toggle(true);
  controller.actions.change('quantity', '7');
  controller.actions.change('reason', 'Keep this support reason');
  render();
  const oldSummary = nodes(root).find(node => node.attributes.id === 'grant-item');
  const choice = choices(root).find(node => node.value === 'health-potion');
  choice.checked = true;
  tags(root, 'form')[0].events.change({target: choice});
  const newSummary = nodes(root).find(node => node.attributes.id === 'grant-item');
  assert.notEqual(newSummary, oldSummary);
  assert.equal(newSummary.focused, true);
  assert.equal(controller.state.review, null);
  assert.deepEqual(controller.state.draft, {itemId: 'health-potion', quantity: '7', reason: 'Keep this support reason'});
  assert.deepEqual(choices(root).filter(node => node.checked).map(node => node.value), ['health-potion']);
  submit(root, null);
  assert.equal(controller.state.review.itemId, 'health-potion');
  assert.equal(controller.state.review.quantity, 7);
  assert.equal(controller.state.review.reason, 'Keep this support reason');
  assert.equal(controller.state.review.requestId, requestId);
});

test('unchecked and busy picker changes cannot replace a draft item', () => {
  for (const state of [{}, {busy: true}]) {
    const {root, calls} = fixture(state);
    const radio = choices(root).find(node => node.value === 'tama-coin');
    radio.checked = false;
    tags(root, 'form')[0].events.change({target: radio});
    assert.deepEqual(calls, []);
  }
});

test('missing native radio selection opens the picker, reports the problem and focuses an enabled choice', () => {
  for (const mode of ['invalid', 'submit']) {
    const {root, calls} = fixture({draft: {quantity: 1, reason: 'Correction'}});
    const form = tags(root, 'form')[0];
    if (mode === 'invalid') {
      assert.equal(typeof form.events.invalid, 'function');
      let prevented = false;
      form.events.invalid({target: choices(root)[0], preventDefault() { prevented = true; }});
      assert.equal(prevented, true);
    } else submit(root, null);
    assert.equal(tags(root, 'details').find(node => node.className === 'grant-picker').open, true);
    assert.equal(choices(root)[0].focused, true);
    const alert = nodes(root).find(node => node.attributes.role === 'alert');
    assert.equal(alert.hidden, false);
    assert.match(alert.textContent, /Choose an item/);
    assert.deepEqual(calls, []);
  }
});

test('native keyboard selection keeps the replacement picker open and its selected radio focused across redraws', () => {
  let root, controller;
  const localDocument = {...document, getElementById: id => nodes(root).find(node => node.attributes.id === id)};
  const portal = {state: {phase: 'ready', busy: false, selectedPlayer: playerId, player},
    setError(message) { assert.fail(message); }};
  const render = () => { root = api.renderItemGrant(localDocument, {player, ...controller.state}, controller.actions); };
  controller = createItemGrantController(portal, {onChange: render});
  controller.sync(portal.state);
  controller.actions.toggle(true);
  render();
  for (const itemId of ['health-potion', 'hi-heart-potion']) {
    const form = tags(root, 'form')[0];
    assert.equal(typeof form.events.keydown, 'function');
    const radio = choices(root).find(node => node.value === itemId);
    form.events.keydown({target: radio, key: 'ArrowDown'});
    radio.checked = true;
    form.events.change({target: radio});
    assert.equal(tags(root, 'details').find(node => node.className === 'grant-picker').open, true);
    const selected = choices(root).find(node => node.value === itemId);
    assert.equal(selected.checked, true);
    assert.equal(selected.focused, true);
    assert.equal(controller.state.draft.itemId, itemId);
    assert.equal(controller.state.review, null);
  }
});

test('form reviews the latest native fields with trimmed reason and never confirms a send', () => {
  const {root, calls} = fixture();
  submit(root, Object.entries({itemId: 'tama-coin', quantity: '99', reason: '  Server correction  '}));
  assert.deepEqual(calls, [['review', {itemId: 'tama-coin', quantity: 99, reason: 'Server correction'}]]);
  assert.equal(control(root, 'quantity').attributes.min, '1');
  assert.equal(control(root, 'quantity').attributes.max, '99');
  assert.equal(control(root, 'reason').attributes['aria-describedby'], 'grant-reason-note');
});

test('invalid item, quantities, nonprintable or oversized reasons, and duplicate fields cannot reach review', () => {
  const invalid = [
    {itemId: 'magic-potion', quantity: '2'}, {itemId: 'ancient-compass'}, {itemId: 'power-bottle'}, {itemId: 'unknown'},
    {quantity: '0'}, {quantity: '100'}, {quantity: '1.5'}, {quantity: '1e1'}, {quantity: ''}, {quantity: 'NaN'},
    {itemId: 'vitaslash', quantity: '2'}, {reason: '  '}, {reason: 'x'.repeat(241)}, {reason: '🙂'.repeat(241)}, {reason: 'a\nb'},
    {reason: 'a\u0000b'}, {reason: 'a\u202eb'}, {reason: '\nCorrection'}, {reason: 'Correction\t'},
    {reason: {name: 'not text'}},
  ];
  for (const patch of invalid) {
    const {root, calls} = fixture();
    submit(root, Object.entries({itemId: 'treat', quantity: '3', reason: 'Correction', ...patch}));
    assert.deepEqual(calls, [], JSON.stringify(patch));
  }
  const {root, calls} = fixture();
  submit(root, [['itemId', 'treat'], ['itemId', 'tama-coin'], ['quantity', '1'], ['reason', 'Correction']]);
  assert.deepEqual(calls, []);
  for (const [itemId, quantity] of [['treat', '1'], ['treat', '99'], ['vitaslash', '1']]) {
    const allowed = fixture({draft: {itemId, quantity, reason: 'Correction'}});
    submit(allowed.root, Object.entries({itemId, quantity, reason: 'Correction'}));
    assert.equal(allowed.calls.length, 1);
  }
  const gear = fixture({draft: {...draft, itemId: 'vitaslash', quantity: 1}}).root;
  assert.equal(control(gear, 'quantity').attributes.max, '1');
  const unicode = fixture();
  submit(unicode.root, Object.entries({itemId: 'treat', quantity: '1', reason: '🙂'.repeat(240)}));
  assert.equal(unicode.calls[0]?.[1].reason, '🙂'.repeat(240));
});

test('review identifies the exact player, item, quantity and reason before explicit confirmation', () => {
  const {root, calls} = fixture({review});
  for (const text of ['Known player', 'ABC123', playerId, 'Treat', '3', 'Support correction'])
    assert.ok(root.textContent.includes(text), text);
  assert.equal(tags(root, 'form').length, 0);
  assert.deepEqual(calls, []);
  assert.equal(button(root, 'Confirm add item').disabled, false);
  click(button(root, 'Confirm add item'));
  click(button(root, 'Edit item'));
  assert.deepEqual(calls, [['confirm'], ['edit']]);
});

test('a changed or missing target and invalid review intent cannot be confirmed', () => {
  for (const patch of [
    {player: null}, {player: {...player, profile: {...player.profile, id: requestId}}},
    {player: {...player, generation: 5}}, {review: {...review, itemId: 'ancient-compass'}},
    {review: {...review, quantity: 100}}, {review: {...review, reason: ''}},
  ]) {
    const {root, calls} = fixture({review, ...patch});
    const confirm = button(root, 'Confirm add item');
    assert.ok(!confirm || confirm.disabled);
    click(confirm);
    assert.deepEqual(calls, []);
  }
  const {root, calls} = fixture({player: null});
  assert.equal(tags(root, 'form').length, 0);
  assert.deepEqual(calls, []);
});

test('profile, review and receipt strings remain literal text and never create remote artwork', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const {root} = fixture({player: {...player, profile: {...player.profile, username: payload, friendCode: payload}},
    review: {...review, username: payload, friendCode: payload, reason: payload}});
  assert.ok(root.textContent.includes(payload));
  assert.equal(tags(root, 'img').length, 1);
  assert.equal(tags(root, 'script').length, 0);
  const receipt = fixture({result: {...review, itemId: payload, reason: payload, grantedAt: payload}}).root;
  assert.ok(receipt.textContent.includes(payload));
  assert.equal(tags(receipt, 'img').length, 0);
});

test('busy state disables draft, review and uncertain sends even when handlers are invoked directly', () => {
  const draftState = fixture({busy: true});
  for (const node of nodes(draftState.root).filter(node => ['input', 'textarea', 'select', 'button'].includes(node.tagName)))
    assert.equal(node.disabled, true, node.tagName);
  submit(draftState.root);
  assert.deepEqual(draftState.calls, []);
  for (const state of [{review}, {review, uncertain: true, statusChecked: true}]) {
    const {root, calls} = fixture({...state, busy: true});
    for (const node of tags(root, 'button')) { assert.equal(node.disabled, true); click(node); }
    assert.deepEqual(calls, []);
  }
});

test('uncertain delivery locks editing and requires a status check before the same-send retry', () => {
  const {root, calls} = fixture({review, uncertain: true});
  assert.equal(tags(root, 'form').length, 0);
  assert.equal(button(root, 'Edit item'), undefined);
  assert.ok(!button(root, 'Retry same addition') || button(root, 'Retry same addition').disabled);
  assert.equal(button(root, 'Confirm add item'), undefined);
  click(button(root, 'Check delivery status'));
  assert.deepEqual(calls, [['checkStatus']]);
  const checked = fixture({review, uncertain: true, statusChecked: true});
  assert.match(checked.root.textContent, /No completed delivery/);
  assert.equal(button(checked.root, 'Retry same addition').disabled, false);
  click(button(checked.root, 'Retry same addition'));
  assert.deepEqual(checked.calls, [['confirm']]);
});

test('confirmed result displays durable receipt and next successful phone sync without another send', () => {
  const {root, calls} = fixture({review, uncertain: true, result: {...review, grantedAt: '2026-10-28T04:00:00Z'}});
  assert.match(root.textContent, /Added to server inventory/);
  assert.match(root.textContent, /next successful sync/);
  assert.match(root.textContent, /admin history/i);
  assert.ok(root.textContent.includes(requestId));
  assert.ok(root.textContent.includes(playerId));
  assert.ok(root.textContent.includes('Treat'));
  assert.equal(tags(root, 'form').length, 0);
  assert.equal(button(root, 'Confirm add item'), undefined);
  assert.equal(button(root, 'Retry same addition'), undefined);
  assert.deepEqual(calls, []);
  click(button(root, 'Add another item'));
  assert.deepEqual(calls, [['edit']]);
});

test('Magic Potion tester access uses a real icon and fixed hidden quantity with explicit unlimited-access copy', () => {
  const {root, calls} = fixture({draft: {itemId: 'magic-potion', quantity: 1, reason: 'Approved tester'}});
  const radio = choices(root).find(node => node.value === 'magic-potion');
  assert.equal(radio.checked, true);
  const row = tags(root, 'label').find(node => choices(node).includes(radio));
  assert.ok(row.textContent.includes('Magic Potion — test access'));
  assert.equal(tags(row, 'img')[0].attributes.src, '../assets/fitamaster-items/magic-potion.webp');
  assert.equal(control(root, 'quantity').attributes.type, 'hidden');
  assert.equal(control(root, 'quantity').value, '1');
  assert.equal(tags(root, 'input').some(node => node.attributes.type === 'number'), false);
  assert.match(root.textContent, /account-wide/i);
  assert.match(root.textContent, /unlimited/i);
  assert.match(root.textContent, /survives progress resets/i);
  assert.match(root.textContent, /awards no TP/i);
  assert.ok(button(root, 'Review tester unlock'));
  submit(root, null);
  assert.deepEqual(calls, [['review', {itemId: 'magic-potion', quantity: 1, reason: 'Approved tester'}]]);
});

test('already unlocked Magic Potion is disabled for new selection without suppressing stock choices or same-intent status', () => {
  const unlockedPlayer = {...player, inventory: {magicPotion: {available: true}}};
  const {root} = fixture({player: unlockedPlayer});
  const radio = choices(root).find(node => node.value === 'magic-potion');
  assert.equal(radio.disabled, true);
  const row = tags(root, 'label').find(node => choices(node).includes(radio));
  assert.ok(row.textContent.includes('Already unlocked'));
  assert.equal(choices(root).find(node => node.value === 'treat').disabled, false);
  const unlockReview = {...review, itemId: 'magic-potion', quantity: 1};
  const pending = fixture({player: unlockedPlayer, review: unlockReview, uncertain: true, statusChecked: true});
  assert.equal(tags(pending.root, 'form').length, 0);
  click(button(pending.root, 'Check delivery status'));
  click(button(pending.root, 'Retry same unlock'));
  assert.deepEqual(pending.calls, [['checkStatus'], ['confirm']]);
});

test('tester unlock review and receipt never describe a stock quantity or award TP', () => {
  const unlockReview = {...review, itemId: 'magic-potion', quantity: 1};
  const {root, calls} = fixture({review: unlockReview});
  assert.match(root.textContent, /Unlock Magic Potion test access/);
  assert.equal(tags(root, 'dt').some(node => node.textContent === 'Quantity'), false);
  assert.equal(button(root, 'Confirm add item'), undefined);
  click(button(root, 'Confirm tester unlock'));
  assert.deepEqual(calls, [['confirm']]);
  const done = fixture({result: {...unlockReview, grantedAt: '2026-10-28T04:00:00Z'}}).root;
  assert.match(done.textContent, /Magic Potion test access unlocked/);
  assert.match(done.textContent, /Open Inventory or return to Fitama online to refresh access/);
  assert.equal(tags(done, 'dt').some(node => node.textContent === 'Quantity'), false);
  assert.match(done.textContent, /awards no TP/i);
  assert.match(done.textContent, /no TP or XP/i);
});
