import {inventoryModel, ITEM_CATALOG} from './inventory.mjs';

const slots = [['weapon', 'Weapon'], ['headgear', 'Headgear'], ['accessory', 'Accessory']];
const slotIds = new Set(slots.map(([id]) => id));
const catalog = new Map(ITEM_CATALOG.map(item => [item.itemId, item]));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function reliableProjection(player, model) {
  if (!model.equipmentAvailable) return false;
  const copies = new Map();
  for (const row of player.equipment) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || !nonempty(row.itemId) || !nonempty(row.instanceId)
      || typeof row.equipped !== 'boolean' || !slotIds.has(row.slot)
      || (catalog.has(row.itemId) && catalog.get(row.itemId).kind !== 'equipment')) return false;
    const previous = copies.get(row.instanceId);
    if (previous && ['itemId', 'slot', 'equipped'].some(key => previous[key] !== row[key])) return false;
    copies.set(row.instanceId, row);
  }
  return true;
}

/** Current saved flags only. Acquisition timestamps never establish an equip date or selection. */
export function renderEquippedEquipment(document, player) {
  const model = inventoryModel(player);
  const reliable = reliableProjection(player, model);
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') node.className = value;
      else node.setAttribute(name, String(value));
    }
    for (const child of children.flat()) if (child !== null && child !== undefined)
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return node;
  }
  const items = model.equipment.flatMap(group => group.instances.map(instance => ({...group, ...instance})));
  const slot = ([id, label]) => {
    const candidates = reliable ? items.filter(item => item.equipped === true && item.slot === id) : [];
    const selected = candidates.length === 1 ? candidates[0] : null;
    const icon = selected?.icon ? h('img', {class: 'inventory-icon', src: selected.icon, alt: '',
      width: 64, height: 64, loading: 'lazy', decoding: 'async'}) : null;
    return h('li', {class: 'equipped-slot'}, h('h3', {class: 'equipped-slot-label'}, label),
      h('div', {class: 'equipped-content'}, icon,
        selected ? h('p', {class: 'equipped-name'}, selected.name)
          : h('p', {class: 'equipped-empty muted'}, reliable && candidates.length === 0 ? 'No item equipped' : 'Unavailable')));
  };
  return h('section', {class: 'section equipped-section'}, h('h2', {}, 'Equipped now'),
    h('p', {class: 'equipped-note muted'}, 'Last saved server state. Offline equipment changes on the player’s phone may not appear yet.'),
    h('ul', {class: 'equipped-slots', 'aria-label': 'Current equipment slots'}, ...slots.map(slot)));
}
