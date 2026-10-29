import {GRANTABLE_ITEMS} from './grant-catalog.mjs';

const grantable = GRANTABLE_ITEMS;
const catalog = new Map(grantable.map(item => [item.itemId, item]));
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : 'Not available';
function intent(value) {
  const entry = catalog.get(value?.itemId);
  const quantity = typeof value?.quantity === 'number' ? value.quantity
    : typeof value?.quantity === 'string' && /^\d+$/.test(value.quantity) ? Number(value.quantity) : NaN;
  const reason = typeof value?.reason === 'string' && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value.reason)
    ? value.reason.trim() : '';
  return entry && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= entry.maxQuantity
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
      else if (name === 'disabled' || name === 'hidden' || name === 'checked') node[name] = !!value;
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
  const picture = (itemId, lazy = false) => {
    const entry = catalog.get(itemId);
    return entry ? h('img', {class: 'grant-icon', src: entry.icon, alt: '', width: 64, height: 64,
      decoding: 'async', ...(lazy ? {loading: 'lazy'} : {})}) : null;
  };
  const isUnlock = itemId => catalog.get(itemId)?.grantKind === 'unlock';
  const itemName = itemId => isUnlock(itemId) ? 'Magic Potion — test access' : catalog.get(itemId)?.name || text(itemId);
  const unlockNote = () => note('Account-wide unlimited test access to Magic Potion. It survives progress resets. Enabling access awards no TP or XP.');
  const targetKnown = uuid(player?.profile?.id) && Number.isSafeInteger(player?.generation) && player.generation >= 0;
  const validReview = intent(review);
  const targetMatches = targetKnown && player.profile.id === review?.playerId && player.generation === review?.generation;
  const canConfirm = !!(targetMatches && validReview && validReview.reason === review.reason && uuid(review.requestId));
  const targetFacts = value => facts([
    ['Player', value.username], ['Friend code', value.friendCode], ['Player UUID', value.playerId],
  ]);
  const reviewedItem = value => h('div', {class: 'grant-item'}, picture(value.itemId),
    facts([['Item', itemName(value.itemId)],
      isUnlock(value.itemId) ? ['Access', 'Unlimited tester access'] : ['Quantity', value.quantity], ['Reason', value.reason]]));
  const panel = h('details', {class: 'section grant-panel', ...(open ? {open: ''} : {}),
    ontoggle: event => actions.toggle(!!event.currentTarget.open)}, h('summary', {}, 'Add item'));

  if (result) {
    panel.append(h('div', {class: 'grant-result', role: 'status'}, h('h3', {tabindex:-1},
      isUnlock(result.itemId) ? 'Magic Potion test access unlocked' : 'Added to server inventory'),
      note(isUnlock(result.itemId) ? 'Open Inventory or return to Fitama online to refresh access.'
        : 'It will appear on the player’s phone after the next successful sync.'), reviewedItem(result),
      isUnlock(result.itemId) ? unlockNote() : null,
      facts([['Player UUID', result.playerId], ['Added', time(result.grantedAt)], ['Receipt', result.requestId]]),
      note('Saved in admin history.')), h('div', {class: 'actions grant-actions'},
        button('Add another item', () => actions.edit(), false, true)));
    return panel;
  }
  if (review || uncertain) {
    const unlock = isUnlock(review?.itemId);
    panel.append(h('h3', {tabindex:-1}, uncertain ? unlock ? 'Check tester unlock' : 'Check item delivery'
      : unlock ? 'Unlock Magic Potion test access' : 'Review item addition'));
    if (review) panel.append(targetFacts(review), reviewedItem(review));
    if (unlock) panel.append(unlockNote());
    if (!targetMatches) panel.append(note('The selected player has changed. Reload this player before adding an item.'));
    if (uncertain) {
      panel.append(note(statusChecked ? unlock ? 'No completed delivery was found. You can retry this same unlock.'
        : 'No completed delivery was found. You can retry this same item addition.'
        : 'Delivery is not confirmed. Check its status before trying again.'),
      note('Check delivery before leaving or reloading. If you reload, check admin history before adding again.'),
      h('div', {class: 'actions grant-actions'},
        button('Check delivery status', () => actions.checkStatus()),
        statusChecked ? button(unlock ? 'Retry same unlock' : 'Retry same addition', () => actions.confirm(), !canConfirm, true) : null));
    } else {
      panel.append(note(unlock ? 'Confirm the player above. This enables Magic Potion test access for their account.'
        : 'Confirm the player and item above. This adds the item directly to their server inventory.'),
        h('div', {class: 'actions grant-actions'}, button(unlock ? 'Confirm tester unlock' : 'Confirm add item', () => actions.confirm(), !canConfirm),
          button('Edit item', () => actions.edit(), false, true)));
    }
    return panel;
  }
  if (!targetKnown) {
    panel.append(note('Load a player’s current details before adding an item.'));
    return panel;
  }
  const alreadyUnlocked = entry => entry.itemId === 'magic-potion' && player?.inventory?.magicPotion?.available === true;
  const selected = catalog.get(draft.itemId);
  const selection = selected && !alreadyUnlocked(selected) ? selected : null;
  const unlock = selection?.grantKind === 'unlock';
  const choiceInputs = [];
  let keyboardSelection = false;
  const pickerSummary = h('summary', {id: 'grant-item', 'aria-disabled': !!busy,
    onclick: event => { if (busy) event.preventDefault(); }},
    h('span', {class: 'grant-picker-selected'}, selection ? picture(selection.itemId) : null,
      h('span', {}, selection ? itemName(selection.itemId) : 'Choose an item')));
  const choice = entry => {
    const input = h('input', {id: 'grant-choice-' + entry.itemId, type: 'radio', name: 'itemId', value: entry.itemId,
      required: '', disabled: busy || alreadyUnlocked(entry), checked: selection?.itemId === entry.itemId});
    choiceInputs.push(input);
    return h('label', {class: 'grant-picker-choice'}, input, picture(entry.itemId, true), h('span', {}, itemName(entry.itemId),
      alreadyUnlocked(entry) ? h('span', {class: 'grant-picker-unavailable'}, 'Already unlocked') : null));
  };
  const picker = h('details', {id: 'grant-item-picker', class: 'grant-picker',
    onpointerdown: () => { keyboardSelection = false; }}, pickerSummary,
    h('div', {class: 'grant-picker-options'},
      ...[['stack', 'Items'], ['equipment', 'Equipment'], ['unlock', 'Tester access']].map(([kind, label]) =>
        h('fieldset', {class: 'grant-picker-group'}, h('legend', {}, label),
          ...grantable.filter(entry => entry.grantKind === kind).map(choice)))));
  const validation = h('p', {class: 'grant-validation error', role: 'alert', hidden: true});
  const showValidation = (message, chooseItem = false) => {
    validation.textContent = message;
    validation.hidden = false;
    if (chooseItem) {
      picker.open = true;
      choiceInputs.find(input => !input.disabled)?.focus();
    }
  };
  const form = h('form', {class: 'grant-form', onsubmit: event => {
    event.preventDefault();
    if (busy) return;
    const FormData = document.defaultView?.FormData || globalThis.FormData;
    const data = new FormData(event.currentTarget);
    const fields = {};
    for (const name of ['itemId', 'quantity', 'reason']) {
      const values = data.getAll(name);
      if (values.length !== 1 || typeof values[0] !== 'string') {
        showValidation(name === 'itemId' ? 'Choose an item before reviewing.' : 'Check the quantity and reason before reviewing.', name === 'itemId');
        return;
      }
      fields[name] = values[0];
    }
    const parsed = intent(fields);
    const entry = catalog.get(fields.itemId);
    if (!parsed || !entry || alreadyUnlocked(entry)) {
      showValidation('Choose an item, enter a valid quantity, and give a reason of 1–240 characters on one line.', !entry || alreadyUnlocked(entry));
      return;
    }
    actions.review(parsed);
  }});
  const changed = (event, allowSelection = false) => {
    const {name, value} = event.target || {};
    if (busy || !['itemId', 'quantity', 'reason'].includes(name) || typeof value !== 'string') return;
    if (name === 'itemId') {
      const entry = catalog.get(value);
      if (!allowSelection || !event.target.checked || !entry || alreadyUnlocked(entry)) return;
      actions.change(name, value);
      const nextPicker = document.getElementById?.('grant-item-picker') || picker;
      nextPicker.open = keyboardSelection;
      if (keyboardSelection) (document.getElementById?.('grant-choice-' + value) || event.target).focus();
      else (document.getElementById?.('grant-item') || pickerSummary).focus({preventScroll: true});
    } else actions.change(name, value);
  };
  form.addEventListener('invalid', event => {
    if (busy || choiceInputs.some(input => input.checked && !input.disabled)) return;
    event.preventDefault();
    showValidation('Choose an item before reviewing.', true);
  }, true);
  form.addEventListener('keydown', event => {
    keyboardSelection = event.target?.name === 'itemId' && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key);
  });
  form.addEventListener('input', event => changed(event));
  form.addEventListener('change', event => changed(event, true));
  const quantity = unlock ? h('input', {name: 'quantity', type: 'hidden', value: 1, disabled: busy})
    : h('input', {id: 'grant-quantity', name: 'quantity', type: 'number', inputmode: 'numeric',
    min: 1, max: selection?.maxQuantity || 99, step: 1, required: '', disabled: busy,
    value: typeof draft.quantity === 'number' || typeof draft.quantity === 'string' ? draft.quantity : 1});
  const reason = h('textarea', {id: 'grant-reason', name: 'reason', rows: 3, required: '', maxlength: 480,
    disabled: busy, autocomplete: 'off', 'aria-describedby': 'grant-reason-note'}, typeof draft.reason === 'string' ? draft.reason : '');
  form.append(...[h('div', {class: 'grant-fields' + (unlock ? ' grant-fields-unlock' : '')},
    h('div', {class: 'grant-item-field'}, h('span', {class: 'grant-field-label'}, 'Item'), picker),
    unlock ? quantity : h('div', {}, h('label', {for: 'grant-quantity'}, 'Quantity'), quantity)),
    selection ? h('div', {class: 'grant-preview'}, picture(selection.itemId), h('span', {}, itemName(selection.itemId)),
      h('span', {class: 'muted'}, unlock ? 'Unlimited tester access' : selection.grantKind === 'equipment' ? 'One copy per addition' : '1–99 per addition')) : null,
    unlock ? unlockNote() : null,
    h('label', {for: 'grant-reason'}, 'Reason'), reason,
    h('p', {id: 'grant-reason-note', class: 'grant-note muted'}, '1–240 characters on one line. Saved in admin history.'), validation,
    h('button', {type: 'submit', disabled: busy}, unlock ? 'Review tester unlock' : 'Review item')].filter(Boolean));
  panel.append(note('Choose an item for this player. Review the player and item before confirming.'), form);
  return panel;
}
