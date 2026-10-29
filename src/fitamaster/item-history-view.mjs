import {ITEM_CATALOG} from './inventory.mjs';

const catalog = new Map(ITEM_CATALOG.map(item => [item.itemId, item]));
const kinds = ['consumed', 'opened', 'used', 'gift_sent', 'gift_claimed', 'gift_incoming'];
const titles = {consumed: 'Consumed', opened: 'Boxes opened', used: 'Reusable items used',
  gift_sent: 'Gifts sent', gift_claimed: 'Gifts claimed', gift_incoming: 'Incoming gifts'};
const eventTitles = {consumed: 'Consumed', opened: 'Box opened', used: 'Reusable item used',
  gift_sent: 'Gift sent', gift_claimed: 'Gift claimed', gift_incoming: 'Incoming gift'};
const statuses = {pending: 'Awaiting claim', received: 'Claimed', invalidated: 'Invalidated'};
const positive = value => Number.isSafeInteger(value) && value > 0;
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const rowShape = row => !!row && kinds.includes(row.kind) && typeof row.itemId === 'string' && !!row.itemId
  && positive(row.quantity) && (row.status === null || Object.hasOwn(statuses, row.status));
const countLabel = kind => ({consumed: 'Consumed', opened: 'Opened', used: 'Uses'}[kind] || 'Quantity');

/** Read-only presentation. The controller owns requests/cursors; the parser owns the complete DTO contract. */
export function renderPlayerItemHistory(document, {player, data, days, busy, error, canPrevious = false, needsReload = false}, actions) {
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') node.className = value;
      else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else if (name === 'disabled') node.disabled = !!value;
      else node.setAttribute(name, String(value));
    }
    for (const child of children.flat()) if (child !== null && child !== undefined)
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return node;
  }
  const note = value => h('p', {class: 'item-history-note muted'}, value);
  const time = value => validTime(value) ? h('time', {datetime: value},
    new Date(value).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'medium'}) + ' (local time)') : 'Not recorded';
  const name = itemId => catalog.get(itemId)?.name || itemId;
  const icon = itemId => catalog.has(itemId) ? h('img', {class: 'item-history-icon', src: catalog.get(itemId).icon,
    alt: '', width: 48, height: 48, loading: 'lazy', decoding: 'async'}) : null;
  const facts = rows => h('dl', {class: 'item-history-facts'}, ...rows.map(([label, value]) =>
    h('div', {}, h('dt', {}, label), h('dd', {}, value))));
  const targetKnown = typeof player?.profile?.id === 'string' && !!player.profile.id
    && Number.isSafeInteger(player?.generation) && player.generation >= 0;
  const selectedDays = days === 30 ? 30 : 7;
  const controlDisabled = !!busy || !targetKnown || !!needsReload;
  const button = (label, callback, disabled = false) => h('button', {type: 'button', class: 'secondary',
    disabled: controlDisabled || disabled, onclick: () => { if (!controlDisabled && !disabled) callback(); }}, label);
  const period = h('select', {id: 'item-history-days', disabled: controlDisabled, onchange: event => {
    const value = event.currentTarget.value;
    if (!controlDisabled && ['7', '30'].includes(value) && Number(value) !== selectedDays) actions.period(Number(value));
  }}, h('option', {value: 7}, 'Last 7 days'), h('option', {value: 30}, 'Last 30 days'));
  period.value = String(selectedDays);
  const section = h('section', {class: 'section item-history-section'}, h('h2', {}, 'Item history'),
    h('div', {class: 'item-history-controls'}, h('div', {}, h('label', {for: 'item-history-days'}, 'Period'), period),
      button('Refresh', () => actions.refresh())));
  if (!targetKnown) {
    section.append(note('Load a player’s current details to view item history.'));
    return section;
  }
  if (busy) {
    section.append(h('p', {class: 'item-history-note muted', role: 'status'}, 'Loading item history…'));
    return section;
  }
  if (typeof error === 'string' && error) {
    section.append(h('p', {class: 'message error', role: 'alert'}, error));
    return section;
  }
  if (needsReload) {
    section.append(note('Reload player details before viewing item history.'));
    return section;
  }
  const bound = data && data.playerId === player.profile.id && data.generation === player.generation && data.days === days
    && [7, 30].includes(days) && validTime(data.from) && validTime(data.to) && validTime(data.observedAt)
    && Date.parse(data.from) < Date.parse(data.to) && data.coverage?.basis === 'retained_server_records'
    && Array.isArray(data.summary) && data.summary.every(row => rowShape(row) && positive(row.eventCount))
    && Array.isArray(data.events) && data.events.every(row => rowShape(row) && validTime(row.recordedAt)
      && Number.isSafeInteger(row.generation) && row.generation >= 0);
  if (!bound) {
    section.append(note('Item history is unavailable for this player or period. Refresh to try again.'));
    return section;
  }
  section.append(facts([['From (inclusive)', time(data.from)], ['Until (exclusive)', time(data.to)],
    ['Server observed', time(data.observedAt)]]),
    note('Retained server records only. History can be incomplete: resets or account deletion may remove records. Refresh starts a new time window.'));
  if (data.coverage.resetWithinWindow) section.append(h('p', {class: 'item-history-note muted'},
    'A progress reset falls within this period.', data.resetAt ? ' Reset recorded: ' : '', data.resetAt ? time(data.resetAt) : null,
    (data.resetAt ? '.' : '') + ' Earlier retained records remain visible; removed records cannot be reconstructed.'));
  if (data.coverage.undatedMagicUses) section.append(note('Some legacy Magic Potion uses have no recorded date and are excluded from these totals.'));

  const groups = [];
  for (const kind of kinds) for (const status of [null, 'pending', 'received', 'invalidated']) {
    const rows = data.summary.filter(row => row.kind === kind && row.status === status);
    if (rows.length) groups.push(h('div', {class: 'item-history-summary-group'},
      h('h3', {}, titles[kind] + (status && kind !== 'gift_claimed' ? ' · ' + statuses[status] : '')),
      h('ul', {class: 'item-history-summary-items'}, ...rows.map(row => h('li', {class: 'item-history-summary-row'},
        icon(row.itemId), h('div', {class: 'item-history-copy'}, h('div', {class: 'item-history-name'}, name(row.itemId)),
          h('div', {class: 'item-history-count muted'}, countLabel(kind) + ': ' + row.quantity + ' · Records: ' + row.eventCount)))))));
  }
  section.append(h('div', {class: 'item-history-summary'}, h('h3', {}, 'Period totals'),
    note('Across all retained records in this window, independently of the page below.'), ...groups));
  if (!data.summary.length && !data.events.length) section.append(note('No recorded item events in the retained records for this period.'));
  if (data.summary.some(row => row.kind === 'gift_incoming')) section.append(note('Incoming parcels awaiting claim are not credited inventory. Invalidated parcels are shown separately.'));
  if (data.summary.some(row => row.kind === 'gift_sent' || row.kind === 'gift_claimed'))
    section.append(note('Sent and claimed records describe different actions; their totals must not be added as a count of distinct transfers.'));

  function eventRow(event) {
    const gift = event.kind.startsWith('gift_');
    const peer = event.peer;
    const role = event.kind === 'gift_sent' ? 'Recipient' : 'Sender';
    const peerLabel = role + (peer?.nameSource === 'at_send' ? ' (at send)' : peer?.nameSource === 'current_profile' ? ' (current profile)' : '');
    const peerName = peer?.nameSource !== 'unavailable' && typeof peer?.username === 'string' && peer.username ? peer.username : 'Account unavailable';
    const rows = [[countLabel(event.kind), String(event.quantity)], ['Recorded', time(event.recordedAt)]];
    if (gift) {
      rows.push(['Delivery status', statuses[event.status] || 'Not recorded'], [peerLabel, peerName]);
      if (event.sentAt) rows.push(['Sent', time(event.sentAt)]);
      if (event.receivedAt) rows.push(['Claimed', time(event.receivedAt)]);
    }
    return h('li', {class: 'item-history-event'}, h('div', {class: 'item-history-event-heading'}, icon(event.itemId),
      h('div', {class: 'item-history-copy'}, h('div', {class: 'item-history-name'}, name(event.itemId)),
        h('div', {class: 'item-history-kind muted'}, eventTitles[event.kind]))),
      event.generation < data.generation ? h('p', {class: 'item-history-prior muted'}, 'Earlier progress · Generation ' + event.generation) : null,
      facts(rows), gift && event.status === 'invalidated' ? note('Invalidation time is not recorded.') : null);
  }
  if (data.events.length) section.append(h('h3', {class: 'item-history-timeline-heading'}, 'Recorded item events'),
    note('Most recent first.'), h('ol', {class: 'item-history-events'}, ...data.events.map(eventRow)));
  else if (data.summary.length) section.append(note('No records on this page. Period totals above cover the full retained window.'));
  section.append(h('div', {class: 'pager item-history-pager'}, button('Previous', () => actions.page('previous'), !canPrevious),
    button('Next', () => actions.page('next', data.nextCursor), !data.nextCursor)));
  return section;
}
