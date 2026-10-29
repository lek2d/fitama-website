import test from 'node:test';
import assert from 'node:assert/strict';
import {startPortal} from '../src/fitamaster/app.mjs';

const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
class Element {
  constructor(tagName = '#text', text = '') { this.tagName = tagName; this.text = text; this.children = []; this.attributes = {}; this.events = {}; }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.text = ''; }
  addEventListener(name, handler) { this.events[name] = handler; }
}
const nodes = root => [root, ...root.children.flatMap(nodes)];
const button = (root, label) => nodes(root).find(node => node.tagName === 'button' && node.textContent === label);
const historySection = root => nodes(root).find(node => node.className === 'section item-history-section');
const click = node => { assert.ok(node, 'Expected control exists'); return node.events.click({currentTarget: node}); };
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setTimeout(resolve, 0)); };
function fixture() {
  const root = new Element('root'), calls = [], documentEvents = new Map(), browserEvents = new Map(), storage = new Map();
  let authCallback, historyResponder, grantUnknown = false, observation = 0;
  let session = {user: {id: firstId}, expires_at: Date.now() / 1000 + 3600};
  const players = new Map([[firstId, {profile: {id: firstId, username: 'Alpha', friendCode: 'ALPHA'}, generation: 2, equipment: [], inventory: {items: []}}],
    [secondId, {profile: {id: secondId, username: 'Beta', friendCode: 'BETA'}, generation: 3, equipment: [], inventory: {items: []}}]]);
  const document = {visibilityState: 'visible', createElement: tag => new Element(tag), createTextNode: value => new Element('#text', value),
    getElementById: id => id === 'portal' ? root : nodes(root).find(node => node.attributes.id === id),
    addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name)};
  const browser = {document, location: new URL('https://fitama.app/fitamaster/'), history: {replaceState() {}},
    sessionStorage: {get length() { return storage.size; }, key: i => [...storage.keys()][i], getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)},
    FormData: class {getAll(name) { return [{itemId: 'treat', quantity: '1', reason: 'Support correction'}[name]]; }},
    addEventListener: (name, fn) => browserEvents.set(name, fn), removeEventListener: name => browserEvents.delete(name)};
  document.defaultView = browser;
  function historyResult(args) {
    const anchorAt = args.p_after?.anchorAt || new Date(Date.parse('2026-10-29T09:00:00Z') + ++observation * 60000).toISOString();
    const recordedAt = new Date(Date.parse(args.p_after?.beforeAt || anchorAt) - 1000).toISOString();
    const itemId = 'history-for-' + args.p_player_id;
    const row = {eventId: 'care:' + args.p_generation + ':' + (args.p_after ? 'older' : 'latest-' + observation),
      kind: 'consumed', itemId, quantity: 1, generation: args.p_generation, recordedAt, status: null, sentAt: null, receivedAt: null, peer: null};
    return {playerId: args.p_player_id, generation: args.p_generation, days: args.p_days,
      from: new Date(Date.parse(anchorAt) - args.p_days * 86400000).toISOString(), to: anchorAt, observedAt: anchorAt, resetAt: null,
      coverage: {basis: 'retained_server_records', undatedMagicUses: false, resetWithinWindow: false},
      summary: [{kind: 'consumed', itemId, status: null, quantity: 40, eventCount: 40}], events: [row],
      nextCursor: args.p_after ? null : {version: 1, playerId: args.p_player_id, generation: args.p_generation, days: args.p_days,
        anchorAt, beforeAt: recordedAt, beforeId: row.eventId}};
  }
  const client = {auth: {getSession: async () => ({data: {session}}), getUser: async () => ({data: {user: session?.user}}),
    onAuthStateChange: fn => { authCallback = fn; return {data: {subscription: {unsubscribe() {}}}}; },
    signOut: async () => { session = null; return {}; }, mfa: {getAuthenticatorAssuranceLevel: async () => ({data: {currentLevel: 'aal2'}})}},
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === 'fitamaster_access_status') return {data: {allowed: true, mfaRequired: false}};
      if (name === 'fitamaster_players') return {data: {players: [...players.values()].map(value => ({...value.profile})), nextCursor: null}};
      if (name === 'fitamaster_player') return {data: players.get(args.p_player_id)};
      if (name === 'fitamaster_reports') return {data: {reports: [], nextCursor: null}};
      if (name === 'fitamaster_player_item_history') return historyResponder ? historyResponder(args) : {data: historyResult(args)};
      if (name === 'fitamaster_grant_item') {
        if (grantUnknown) throw new TypeError('Synthetic lost response');
        return {data: {requestId: args.p_request_id, playerId: args.p_player_id, generation: args.p_generation,
          itemId: args.p_item_id, quantity: args.p_quantity, reason: args.p_reason, grantedAt: '2026-10-29T09:00:00Z'}};
      }
      if (name === 'fitamaster_grant_status') return {data: null};
      return {data: {events: [], nextCursor: null}};
    }};
  return {root, browser, client, calls, browserEvents, historyResult, players,
    get historyCalls() { return calls.filter(([name]) => name === 'fitamaster_player_item_history'); },
    set historyResponder(value) { historyResponder = value; }, set grantUnknown(value) { grantUnknown = value; },
    signOutEvent() { session = null; authCallback('SIGNED_OUT', null); }};
}
async function openFirst(f, running) { await flush(); await click(button(f.root, 'Alpha')); await flush(); }
const period = (f, value) => {
  const select = nodes(historySection(f.root)).find(node => node.tagName === 'select');
  return select.events.change({currentTarget: {value: String(value)}});
};

test('opening a player automatically reads its current-generation 7-day history once, without repeated reads on ordinary redraws', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running);
    assert.equal(f.historyCalls.length, 1);
    assert.equal(f.historyCalls[0][1].p_player_id, firstId);
    assert.equal(f.historyCalls[0][1].p_generation, 2);
    assert.equal(f.historyCalls[0][1].p_days, 7);
    assert.equal(f.historyCalls[0][1].p_after, null);
    assert.match(historySection(f.root).textContent, /history-for-11111111/);
    await running.portal.reports({playerId: firstId}); await running.portal.refresh(); await flush();
    assert.equal(f.historyCalls.length, 1);
  } finally { running.dispose(); }
});

test('period changes and refresh reset paging, while Next and Previous use the saved history cursor stack', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running);
    period(f, 30); await flush();
    assert.equal(running.portal.state.itemHistoryDays, 30);
    const firstPage = running.portal.state.itemHistory;
    const cursor = running.portal.state.itemHistory.nextCursor;
    click(button(historySection(f.root), 'Next')); await flush();
    assert.deepEqual(f.historyCalls.at(-1)[1].p_after, cursor);
    assert.equal(button(historySection(f.root), 'Previous').disabled, false);
    const beforePrevious = f.historyCalls.length;
    click(button(historySection(f.root), 'Previous')); await flush();
    assert.equal(f.historyCalls.length, beforePrevious, 'Previous restores a verified cached page without a fresh RPC anchor');
    assert.deepEqual(running.portal.state.itemHistory, firstPage);
    assert.equal(button(historySection(f.root), 'Previous').disabled, true);
    const oldAnchor = running.portal.state.itemHistory.observedAt;
    click(button(historySection(f.root), 'Refresh')); await flush();
    assert.equal(f.historyCalls.at(-1)[1].p_after, null);
    assert.equal(f.historyCalls.at(-1)[1].p_days, 30);
    assert.notEqual(running.portal.state.itemHistory.observedAt, oldAnchor);
    assert.equal(button(historySection(f.root), 'Previous').disabled, true);
  } finally { running.dispose(); }
});

test('a new target resets period and paging, and a late old-target history response cannot reappear', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running); period(f, 30); await flush();
    let resolveOld;
    f.historyResponder = args => args.p_player_id === firstId
      ? new Promise(resolve => { resolveOld = () => resolve({data: f.historyResult(args)}); }) : {data: f.historyResult(args)};
    click(button(historySection(f.root), 'Refresh')); await flush();
    assert.equal(typeof resolveOld, 'function');
    await running.portal.player(secondId); await flush();
    assert.equal(f.historyCalls.at(-1)[1].p_player_id, secondId);
    assert.equal(f.historyCalls.at(-1)[1].p_days, 7);
    assert.equal(button(historySection(f.root), 'Previous').disabled, true);
    resolveOld(); await flush();
    assert.equal(running.portal.state.itemHistory.playerId, secondId);
    assert.doesNotMatch(historySection(f.root).textContent, /history-for-11111111/);
    assert.match(historySection(f.root).textContent, /history-for-22222222/);
  } finally { running.dispose(); }
});

test('sign-out clears pending history and no late result or auto-load can restore it', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    let resolveRead;
    f.historyResponder = args => new Promise(resolve => { resolveRead = () => resolve({data: f.historyResult(args)}); });
    await openFirst(f, running);
    assert.equal(typeof resolveRead, 'function');
    f.signOutEvent(); resolveRead(); await flush();
    assert.equal(running.portal.state.phase, 'login');
    assert.equal(running.portal.state.itemHistory, null);
    assert.equal(historySection(f.root), undefined);
    const calls = f.historyCalls.length; await flush(); assert.equal(f.historyCalls.length, calls);
  } finally { running.dispose(); }
});

test('an authoritative history target change disables history and requires an explicit fresh player reload', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running);
    f.historyResponder = () => ({error: {code: 'P0001', message: 'FITAMASTER_HISTORY_TARGET_CHANGED'}});
    click(button(historySection(f.root), 'Next')); await flush();
    assert.equal(running.portal.state.itemHistoryNeedsReload, true);
    assert.equal(running.portal.state.player.profile.id, firstId);
    assert.equal(button(historySection(f.root), 'Refresh').disabled, true);
    assert.ok(button(f.root, 'Reload player details'));
    f.players.set(firstId, {...f.players.get(firstId), generation: 3});
    f.historyResponder = null;
    await click(button(f.root, 'Reload player details')); await flush();
    assert.equal(running.portal.state.itemHistoryNeedsReload, false);
    assert.equal(running.portal.state.itemHistory.generation, 3);
    assert.equal(f.historyCalls.at(-1)[1].p_after, null);
    assert.equal(button(historySection(f.root), 'Previous').disabled, true);
  } finally { running.dispose(); }
});

test('unavailable player details keep explicit reload and back controls, then auto-load history after recovery', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await flush();
    const saved = f.players.get(firstId); f.players.delete(firstId);
    await click(button(f.root, 'Alpha')); await flush();
    assert.ok(button(f.root, 'Reload player details'));
    assert.ok(button(f.root, 'Back to players'));
    assert.equal(f.historyCalls.length, 0);
    f.players.set(firstId, saved);
    await click(button(f.root, 'Reload player details')); await flush();
    assert.equal(f.historyCalls.length, 1);
    assert.equal(running.portal.state.itemHistory.playerId, firstId);
  } finally { running.dispose(); }
});

test('a confirmed grant reloads the selected history period with a fresh anchor while keeping the receipt visible', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running); period(f, 30); await flush();
    const anchor = running.portal.state.itemHistory.observedAt;
    nodes(f.root).find(node => node.className === 'grant-form').events.submit({preventDefault() {}, currentTarget: {}});
    await click(button(f.root, 'Confirm add item')); await flush();
    assert.equal(f.calls.filter(([name]) => name === 'fitamaster_grant_item').length, 1);
    assert.equal(running.portal.state.itemHistoryDays, 30);
    assert.equal(f.historyCalls.at(-1)[1].p_days, 30);
    assert.equal(f.historyCalls.at(-1)[1].p_after, null);
    assert.notEqual(running.portal.state.itemHistory.observedAt, anchor);
    assert.match(f.root.textContent, /Added to server inventory/);
  } finally { running.dispose(); }
});

test('uncertain grant delivery continues to block player navigation and unload after history is integrated', async () => {
  const f = fixture(), running = await startPortal({window: f.browser, client: f.client});
  try {
    await openFirst(f, running); f.grantUnknown = true;
    nodes(f.root).find(node => node.className === 'grant-form').events.submit({preventDefault() {}, currentTarget: {}});
    await click(button(f.root, 'Confirm add item')); await flush();
    assert.match(f.root.textContent, /Check item delivery/);
    click(button(f.root, 'Back to players')); await flush();
    assert.equal(running.portal.state.selectedPlayer, firstId);
    assert.match(f.root.textContent, /Check this item delivery before leaving/);
    let prevented = false;
    f.browserEvents.get('beforeunload')({preventDefault() { prevented = true; }});
    assert.equal(prevented, true);
    f.historyResponder = () => ({error: {code: 'P0001', message: 'FITAMASTER_HISTORY_TARGET_CHANGED'}});
    click(button(historySection(f.root), 'Refresh')); await flush();
    assert.equal(running.portal.state.itemHistoryNeedsReload, true);
    const playerReads = f.calls.filter(([name]) => name === 'fitamaster_player').length;
    click(button(f.root, 'Reload player details')); await flush();
    assert.equal(f.calls.filter(([name]) => name === 'fitamaster_player').length, playerReads);
    assert.ok(button(f.root, 'Check delivery status'));
  } finally { running.dispose(); }
});
