import {ITEM_CATALOG} from './inventory.mjs';

const grantable = ITEM_CATALOG.filter(item => item.kind === 'stack' || item.kind === 'equipment');
const catalog = new Map(grantable.map(item => [item.itemId, item]));
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : 'Not available';
function intent(value) {
  const entry = catalog.get(value?.itemId);
  const quantity = typeof value?.quantity === 'number' ? value.quantity
    : typeof value?.quantity === 'string' && /^\d+$/.test(value.quantity) ? Number(value.quantity) : NaN;
  const reason = typeof value?.reason === 'string' && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value.reason)
    ? value.reason.trim() : '';
  return entry && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= (entry.kind === 'stack' ? 99 : 1)
    && reason && [...reason].length <= 240
    ? {itemId: entry.itemId, quantity, reason} : null;
}
function time(value) {
  if (typeof value !== 'string') return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Not available'
    : date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'medium'}) + ' (local time)';
}

/** Presentation only: review and confirm are separate actions; every remote string is literal text. */
export function renderItemGrant(document, {player, busy, open, draft = {}, review, result, uncertain, statusChecked}, actions) {
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') node.className = value;
      else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else if (name === 'disabled' || name === 'hidden') node[name] = !!value;
      else node.setAttribute(name, String(value));
    }
    for (const child of children.flat()) if (child !== null && child !== undefined)
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return node;
  }
  const note = value => h('p', {class: 'grant-note muted'}, value);
  const button = (label, handler, disabled = false, secondary = false) => h('button', {
    type: 'button', disabled: busy || disabled, ...(secondary ? {class: 'secondary'} : {}),
    onclick: () => { if (!busy && !disabled) handler(); },
  }, label);
  const facts = rows => h('dl', {class: 'grant-facts'}, ...rows.map(([label, value]) =>
    h('div', {}, h('dt', {}, label), h('dd', {}, text(value)))));
  const picture = itemId => {
    const entry = catalog.get(itemId);
    return entry ? h('img', {class: 'grant-icon', src: entry.icon, alt: '', width: 64, height: 64, decoding: 'async'}) : null;
  };
  const itemName = itemId => catalog.get(itemId)?.name || text(itemId);
  const targetKnown = uuid(player?.profile?.id) && Number.isSafeInteger(player?.generation) && player.generation >= 0;
  const validReview = intent(review);
  const targetMatches = targetKnown && player.profile.id === review?.playerId && player.generation === review?.generation;
  const canConfirm = !!(targetMatches && validReview && validReview.reason === review.reason && uuid(review.requestId));
  const targetFacts = value => facts([
    ['Player', value.username], ['Friend code', value.friendCode], ['Player UUID', value.playerId],
  ]);
  const reviewedItem = value => h('div', {class: 'grant-item'}, picture(value.itemId),
    facts([['Item', itemName(value.itemId)], ['Quantity', value.quantity], ['Reason', value.reason]]));
  const panel = h('details', {class: 'section grant-panel', ...(open ? {open: ''} : {}),
    ontoggle: event => actions.toggle(!!event.currentTarget.open)}, h('summary', {}, 'Add item'));

  if (result) {
    panel.append(h('div', {class: 'grant-result', role: 'status'}, h('h3', {tabindex:-1}, 'Added to server inventory'),
      note('It will appear on the player’s phone after the next successful sync.'), reviewedItem(result),
      facts([['Player UUID', result.playerId], ['Added', time(result.grantedAt)], ['Receipt', result.requestId]]),
      note('Saved in admin history.')), h('div', {class: 'actions grant-actions'},
        button('Add another item', () => actions.edit(), false, true)));
    return panel;
  }
  if (review || uncertain) {
    panel.append(h('h3', {tabindex:-1}, uncertain ? 'Check item delivery' : 'Review item addition'));
    if (review) panel.append(targetFacts(review), reviewedItem(review));
    if (!targetMatches) panel.append(note('The selected player has changed. Reload this player before adding an item.'));
    if (uncertain) {
      panel.append(note(statusChecked ? 'No completed delivery was found. You can retry this same item addition.'
        : 'Delivery is not confirmed. Check its status before trying again.'),
      note('Check delivery before leaving or reloading. If you reload, check admin history before adding again.'),
      h('div', {class: 'actions grant-actions'},
        button('Check delivery status', () => actions.checkStatus()),
        statusChecked ? button('Retry same addition', () => actions.confirm(), !canConfirm, true) : null));
    } else {
      panel.append(note('Confirm the player and item above. This adds the item directly to their server inventory.'),
        h('div', {class: 'actions grant-actions'}, button('Confirm add item', () => actions.confirm(), !canConfirm),
          button('Edit item', () => actions.edit(), false, true)));
    }
    return panel;
  }
  if (!targetKnown) {
    panel.append(note('Load a player’s current details before adding an item.'));
    return panel;
  }
  const selected = catalog.get(draft.itemId);
  const select = h('select', {id: 'grant-item', name: 'itemId', required: '', disabled: busy},
    h('option', {value: ''}, 'Choose an item'),
    ...[['stack', 'Items'], ['equipment', 'Equipment']].map(([kind, label]) => h('optgroup', {label},
      ...grantable.filter(entry => entry.kind === kind).map(entry => h('option', {value: entry.itemId}, entry.name)))));
  select.value = selected?.itemId || '';
  const validation = h('p', {class: 'grant-validation error', role: 'alert', hidden: true});
  const form = h('form', {class: 'grant-form', onsubmit: event => {
    event.preventDefault();
    if (busy) return;
    const FormData = document.defaultView?.FormData || globalThis.FormData;
    const data = new FormData(event.currentTarget);
    const fields = {};
    for (const name of ['itemId', 'quantity', 'reason']) {
      const values = data.getAll(name);
      if (values.length !== 1 || typeof values[0] !== 'string') return;
      fields[name] = values[0];
    }
    const parsed = intent(fields);
    if (!parsed) {
      validation.textContent = 'Choose an item, enter a valid quantity, and give a reason of 1–240 characters on one line.';
      validation.hidden = false;
      return;
    }
    actions.review(parsed);
  }});
  const changed = event => {
    if (!busy && ['itemId', 'quantity', 'reason'].includes(event.target?.name) && typeof event.target.value === 'string')
      actions.change(event.target.name, event.target.value);
  };
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  const quantity = h('input', {id: 'grant-quantity', name: 'quantity', type: 'number', inputmode: 'numeric',
    min: 1, max: selected?.kind === 'equipment' ? 1 : 99, step: 1, required: '', disabled: busy,
    value: typeof draft.quantity === 'number' || typeof draft.quantity === 'string' ? draft.quantity : 1});
  const reason = h('textarea', {id: 'grant-reason', name: 'reason', rows: 3, required: '', maxlength: 480,
    disabled: busy, autocomplete: 'off', 'aria-describedby': 'grant-reason-note'}, typeof draft.reason === 'string' ? draft.reason : '');
  form.append(...[h('div', {class: 'grant-fields'}, h('div', {class: 'grant-item-field'},
    h('label', {for: 'grant-item'}, 'Item'), select), h('div', {}, h('label', {for: 'grant-quantity'}, 'Quantity'), quantity)),
    selected ? h('div', {class: 'grant-preview'}, picture(selected.itemId), h('span', {}, selected.name),
      h('span', {class: 'muted'}, selected.kind === 'equipment' ? 'One copy per addition' : '1–99 per addition')) : null,
    h('label', {for: 'grant-reason'}, 'Reason'), reason,
    h('p', {id: 'grant-reason-note', class: 'grant-note muted'}, '1–240 characters on one line. Saved in admin history.'), validation,
    h('button', {type: 'submit', disabled: busy}, 'Review item')].filter(Boolean));
  panel.append(note('Choose an item for this player. Review the player and item before confirming.'), form);
  return panel;
}
