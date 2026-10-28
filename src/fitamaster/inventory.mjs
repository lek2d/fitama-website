const asset = file => '../assets/fitamaster-items/' + file;
const definitions = [
  ['treat', 'Treat', 'stack'],
  ['health-potion', 'Health Potion', 'stack'],
  ['hi-heart-potion', 'Super Health Potion', 'stack'],
  ['protein-bar', 'Protein Bar', 'stack'],
  ['rest-stopper', 'Rest Stopper', 'stack'],
  ['grilled-talakitok', 'Grilled Talakitok', 'stack'],
  ['xp-book-1', 'Small Brain Energy', 'stack'],
  ['xp-book-2', 'Getting Wiser', 'stack'],
  ['xp-book-3', 'Certified Big Brain', 'stack'],
  ['tama-coin', 'Tama Coin', 'stack'],
  ['mystery-package', 'Mystery Package', 'stack'],
  ['treasure-box', 'Treasure Box', 'stack'],
  ['power-bottle', 'Power Bottle', 'unique', 'power-bottle-empty.webp'],
  ['magic-potion', 'Magic Potion', 'unique'],
  ['ancient-compass', 'Ancient Compass', 'unique'],
  ['vitaslash', 'VitaSlash', 'equipment'],
  ['rep-ripper', 'Rep Ripper', 'equipment'],
  ['vitamin-g', 'Vitamin G', 'equipment'],
  ['axercise', 'Axercise', 'equipment'],
  ['point-of-wellness', 'Point of Wellness', 'equipment'],
  ['draw-your-limits', 'Draw Your Limits', 'equipment'],
  ['sore-tomorrow', 'Sore Tomorrow', 'equipment'],
  ['sir-takes-a-lot', 'Sir Takes-a-Lot', 'equipment'],
  ['heartpour-flask', 'Heartpour Flask', 'equipment'],
  ['hardheaded-hero', 'Hardheaded Hero', 'equipment'],
  ['wit-happens', 'Wit Happens', 'equipment'],
  ['leaf-me-alone', 'Leaf Me Alone', 'equipment'],
  ['quest-inspector', 'Quest Inspector', 'equipment'],
  ['not-today-bonk', 'Not Today, Bonk', 'equipment'],
  ['sweat-dreams', 'Sweat Dreams', 'equipment'],
  ['reigning-champ', 'Reigning Champ', 'equipment'],
  ['hood-riddance', 'Hood Riddance', 'equipment'],
  ['heart-to-get', 'Heart to Get', 'equipment'],
  ['grow-getter', 'Grow Getter', 'equipment'],
  ['watt-a-workout', 'Watt a Workout', 'equipment'],
  ['luck-around', 'Luck Around & Find Out', 'equipment'],
  ['restie-bestie', 'Restie Bestie', 'equipment'],
  ['pack-to-the-grind', 'Pack to the Grind', 'equipment'],
  ['pill-good-inc', 'Pill Good Inc.', 'equipment'],
];

// Presentation metadata only. Catalog membership never establishes ownership.
export const ITEM_CATALOG = Object.freeze(definitions.map(([itemId, name, kind, file]) =>
  Object.freeze({itemId, name, kind, icon: asset(file || itemId + '.webp')})));
const catalog = new Map(ITEM_CATALOG.map(entry => [entry.itemId, entry]));
const quantity = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const string = value => typeof value === 'string' && value.length ? value : null;
const boolean = value => typeof value === 'boolean' ? value : null;
const metadata = (itemId, kind) => {
  const entry = catalog.get(itemId);
  return entry?.kind === kind ? {itemId, name: entry.name, icon: entry.icon} : {itemId, name: itemId, icon: null};
};

function groupEquipment(rows) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    const itemId = string(row.itemId) || 'Unknown equipment';
    if (!groups.has(itemId)) groups.set(itemId, {...metadata(itemId, 'equipment'), instances: [], ids: new Map()});
    const group = groups.get(itemId);
    const instance = {itemId, instanceId: string(row.instanceId), equipped: boolean(row.equipped),
      slot: string(row.slot), grantedAt: string(row.grantedAt)};
    const duplicate = instance.instanceId && group.ids.get(instance.instanceId);
    if (duplicate) {
      // Repeating a projection is not another owned copy. Conflicting facts remain unknown.
      for (const key of ['equipped', 'slot', 'grantedAt']) if (duplicate[key] !== instance[key]) duplicate[key] = null;
      continue;
    }
    group.instances.push(instance);
    if (instance.instanceId) group.ids.set(instance.instanceId, instance);
  }
  return [...groups.values()].map(({ids, ...group}) => ({...group,
    copyCount: group.instances.length,
    equippedCount: group.instances.filter(instance => instance.equipped === true).length,
    unknownEquippedCount: group.instances.filter(instance => instance.equipped === null).length,
  }));
}

/** Normalize only the additive inventory projection. Never add overlapping care/coin balances. */
export function inventoryModel(player) {
  const inventory = player?.inventory;
  const stacks = new Map(ITEM_CATALOG.filter(entry => entry.kind === 'stack').map(entry =>
    [entry.itemId, {...metadata(entry.itemId, 'stack'), quantity: null}]));
  const seen = new Set();
  for (const row of Array.isArray(inventory?.items) ? inventory.items : []) {
    const itemId = string(row?.itemId);
    if (!itemId) continue;
    const count = quantity(row.quantity);
    if (!stacks.has(itemId)) stacks.set(itemId, {...metadata(itemId, 'stack'), quantity: null});
    const entry = stacks.get(itemId);
    if (seen.has(itemId) && entry.quantity !== count) entry.quantity = null;
    else if (!seen.has(itemId)) entry.quantity = count;
    seen.add(itemId);
  }
  const bottle = inventory?.powerBottle;
  const storedTp = quantity(bottle?.storedTp), capacity = quantity(bottle?.capacity);
  const fill = storedTp === null || capacity === null || capacity <= 0 ? null
    : storedTp <= 0 ? 'empty' : storedTp >= capacity ? 'full' : storedTp / capacity >= .6 ? 'half' : 'low';
  return {
    items: [...stacks.values()].filter(entry => entry.quantity !== null && entry.quantity > 0),
    zeroItems: [...stacks.values()].filter(entry => entry.quantity === 0),
    unavailableItems: [...stacks.values()].filter(entry => entry.quantity === null),
    equipmentAvailable: Array.isArray(player?.equipment),
    equipment: groupEquipment(player?.equipment),
    powerBottle: {itemId: 'power-bottle', name: 'Power Bottle', icon: fill ? asset('power-bottle-' + fill + '.webp') : null,
      level: [1, 2, 3].includes(bottle?.level) ? bottle.level : null, storedTp, capacity,
      pendingTp: quantity(bottle?.pendingTp), pendingUntil: string(bottle?.pendingUntil), readyTp: quantity(bottle?.readyTp),
      recorded: !!bottle && typeof bottle === 'object' && !Array.isArray(bottle)},
    magicPotion: {...metadata('magic-potion', 'unique'), available: boolean(inventory?.magicPotion?.available)},
    // Lazy compass entitlement absence is not proof of non-ownership.
    ancientCompass: {...metadata('ancient-compass', 'unique'), available: inventory?.ancientCompass?.available === true ? true : null},
  };
}

const valueText = value => value === null || value === undefined ? 'Not available' : String(value);
function timeText(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'medium'}) + ' (local time)';
}

/** Return one section; every remote string enters the DOM through text nodes. */
export function renderInventory(document, player) {
  const model = inventoryModel(player);
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else node.setAttribute(key, String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }
  const note = text => h('p', {class: 'inventory-note muted'}, text);
  const icon = entry => entry.icon ? h('img', {class: 'inventory-icon', src: entry.icon, alt: '', width: 64, height: 64, loading: 'lazy', decoding: 'async'}) : null;
  const name = entry => h('div', {class: 'inventory-name'}, entry.name);
  const facts = rows => h('dl', {class: 'inventory-facts'}, ...rows.map(([label, value]) =>
    h('div', {}, h('dt', {}, label), h('dd', {}, valueText(value)))));
  const itemRow = entry => h('li', {class: 'inventory-item'}, icon(entry), h('div', {class: 'inventory-item-copy'}, name(entry),
    h('div', {class: 'inventory-quantity'}, entry.quantity === null ? 'Quantity unavailable' : 'Quantity: ' + entry.quantity)));
  const itemList = entries => h('ul', {class: 'inventory-items'}, ...entries.map(itemRow));
  function equipmentRow(entry) {
    const copies = entry.copyCount + (entry.copyCount === 1 ? ' copy' : ' copies');
    const equipped = entry.equippedCount + ' equipped' + (entry.unknownEquippedCount ? ' · ' + entry.unknownEquippedCount + ' status unknown' : '');
    return h('li', {class: 'inventory-equipment'}, h('div', {class: 'inventory-equipment-heading'}, icon(entry),
      h('div', {class: 'inventory-item-copy'}, name(entry), h('div', {class: 'inventory-quantity'}, copies + ' · ' + equipped))),
    h('details', {class: 'inventory-instances'}, h('summary', {}, 'View ' + entry.copyCount + (entry.copyCount === 1 ? ' instance' : ' instances')),
      h('ul', {class: 'inventory-instance-list'}, ...entry.instances.map(instance => h('li', {}, facts([
        ['Instance ID', instance.instanceId], ['Equipped', instance.equipped === null ? null : instance.equipped ? 'Yes' : 'No'],
        ['Slot', instance.slot], ['Granted', timeText(instance.grantedAt)],
      ]))))));
  }
  const bottle = model.powerBottle;
  const bottleRow = bottle.recorded && bottle.level !== null ? h('li', {class: 'inventory-unique inventory-bottle'}, icon(bottle), h('div', {class: 'inventory-item-copy'}, name(bottle),
    facts([['Level', bottle.level], ['Stored TP', bottle.storedTp], ['Capacity', bottle.capacity],
      ['Ready TP', bottle.readyTp], ['Pending TP', bottle.pendingTp], ['Pending until', timeText(bottle.pendingUntil)]]))) : null;
  const entitlementRow = (entry, text) => h('li', {class: 'inventory-unique'}, icon(entry), h('div', {class: 'inventory-item-copy'}, name(entry),
    h('div', {class: 'inventory-quantity'}, text)));
  const unique = [bottleRow,
    model.magicPotion.available === true ? entitlementRow(model.magicPotion, 'Unlimited') : null,
    model.ancientCompass.available === true ? entitlementRow(model.ancientCompass, 'Available') : null].filter(Boolean);
  const hasOwned = model.items.length || unique.length || model.equipment.length;
  const incomplete = model.unavailableItems.length > 0 || !model.equipmentAvailable;
  return h('section', {class: 'section inventory-section'}, h('h2', {}, 'Inventory'),
    note(incomplete ? 'Some inventory data is not recorded; only confirmed items are shown.' : 'Owned items from the latest server snapshot.'),
    !hasOwned ? note('No confirmed items to display.') : null,
    model.items.length ? h('div', {}, h('h3', {}, 'Items'), itemList(model.items)) : null,
    unique.length ? h('div', {}, h('h3', {class: 'inventory-subheading'}, 'Unique items'), h('ul', {class: 'inventory-unique-list'}, ...unique)) : null,
    model.equipment.length ? h('div', {}, h('h3', {class: 'inventory-subheading'}, 'Equipment'),
      h('ul', {class: 'inventory-equipment-list'}, ...model.equipment.map(equipmentRow))) : null);
}
