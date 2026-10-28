import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ITEM_CATALOG, inventoryModel, renderInventory} from '../src/fitamaster/inventory.mjs';

// A deliberately small DOM boundary: interpreting any string as markup fails the test.
class Element {
  constructor(tagName = '#text', value = '') { this.tagName = tagName; this.value = value; this.children = []; this.attributes = {}; }
  set innerHTML(value) { throw new Error('HTML insertion is forbidden'); }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(''); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...children) { this.children.push(...children); }
}
const document = {createElement: tag => new Element(tag), createTextNode: value => new Element('#text', value)};
const nodes = root => [root, ...root.children.flatMap(nodes)];
const byClass = (root, name) => nodes(root).filter(node => node.className?.split(' ').includes(name));
const item = (model, id) => [...model.items, ...model.zeroItems, ...model.unavailableItems].find(entry => entry.itemId === id);

test('catalog covers all 39 real items with the three distinct XP book names', () => {
  assert.equal(ITEM_CATALOG.length, 39);
  assert.equal(new Set(ITEM_CATALOG.map(entry => entry.itemId)).size, 39);
  assert.equal(ITEM_CATALOG.filter(entry => entry.kind === 'stack').length, 12);
  assert.equal(ITEM_CATALOG.filter(entry => entry.kind === 'equipment').length, 24);
  assert.deepEqual(ITEM_CATALOG.filter(entry => entry.kind === 'equipment').map(entry => entry.itemId),
    ['vitaslash', 'rep-ripper', 'vitamin-g', 'axercise', 'point-of-wellness', 'draw-your-limits', 'sore-tomorrow',
      'sir-takes-a-lot', 'heartpour-flask', 'hardheaded-hero', 'wit-happens', 'leaf-me-alone', 'quest-inspector',
      'not-today-bonk', 'sweat-dreams', 'reigning-champ', 'hood-riddance', 'heart-to-get', 'grow-getter',
      'watt-a-workout', 'luck-around', 'restie-bestie', 'pack-to-the-grind', 'pill-good-inc']);
  assert.deepEqual(ITEM_CATALOG.filter(entry => entry.kind === 'stack').map(entry => entry.itemId),
    ['treat', 'health-potion', 'hi-heart-potion', 'protein-bar', 'rest-stopper', 'grilled-talakitok',
      'xp-book-1', 'xp-book-2', 'xp-book-3', 'tama-coin', 'mystery-package', 'treasure-box']);
  assert.deepEqual(ITEM_CATALOG.filter(entry => entry.itemId.startsWith('xp-book-')).map(entry => entry.name),
    ['Small Brain Energy', 'Getting Wiser', 'Certified Big Brain']);
});

test('owned quantities, zero stock and unknown quantities stay distinct without adding legacy balances', () => {
  const player = {inventory: {items: [{itemId: 'treat', quantity: 7}, {itemId: 'health-potion', quantity: 0},
    {itemId: 'xp-book-1', quantity: 2}, {itemId: 'xp-book-2', quantity: 3}, {itemId: 'xp-book-3', quantity: 4},
    {itemId: 'tama-coin', quantity: 9}, {itemId: 'mystery-package', quantity: null}]},
  care: {inventory: {treat: 700, xpBooks: [20, 30, 40]}}, coins: 900};
  const snapshot = JSON.stringify(player);
  const model = inventoryModel(player);
  assert.equal(item(model, 'treat').quantity, 7);
  assert.equal(item(model, 'tama-coin').quantity, 9);
  assert.equal(model.zeroItems.find(entry => entry.itemId === 'health-potion').quantity, 0);
  assert.equal(item(model, 'mystery-package').quantity, null);
  assert.equal(item(model, 'treasure-box').quantity, null);
  assert.deepEqual(['xp-book-1', 'xp-book-2', 'xp-book-3'].map(id => item(model, id).quantity), [2, 3, 4]);
  assert.equal(JSON.stringify(player), snapshot);
});

test('missing and malformed quantities never become zero, and repeated projections are never summed', () => {
  for (const quantity of [null, undefined, -1, 1.5, '3', Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(item(inventoryModel({inventory: {items: [{itemId: 'treat', quantity}]}}), 'treat').quantity, null);
  }
  assert.equal(inventoryModel(null).unavailableItems.length, 12);
  const repeated = inventoryModel({inventory: {items: [{itemId: 'treat', quantity: 3}, {itemId: 'treat', quantity: 3},
    {itemId: 'health-potion', quantity: 2}, {itemId: 'health-potion', quantity: 5}]}});
  assert.equal(item(repeated, 'treat').quantity, 3);
  assert.equal(item(repeated, 'health-potion').quantity, null);
});

test('unknown stack IDs remain visible with their exact quantities and no invented artwork', () => {
  const model = inventoryModel({inventory: {items: [{itemId: 'future-item-v2', quantity: 11}]}});
  const unknown = item(model, 'future-item-v2');
  assert.equal(unknown.name, 'future-item-v2');
  assert.equal(unknown.quantity, 11);
  assert.equal(unknown.icon, null);
  const rendered = renderInventory(document, {inventory: {items: [{itemId: 'future-item-v2', quantity: 11}]}});
  const row = byClass(rendered, 'inventory-item').find(entry => entry.textContent.includes('future-item-v2'));
  assert.match(row.textContent, /11/);
  assert.equal(nodes(row).some(entry => entry.tagName === 'img'), false);
});

test('equipment groups real copies once and preserves instance facts and unknown equipped states', () => {
  const first = {itemId: 'vitaslash', instanceId: 'copy-one', equipped: true, slot: 'weapon', grantedAt: '2026-10-01T00:00:00Z'};
  const model = inventoryModel({equipment: [first, {...first},
    {itemId: 'vitaslash', instanceId: 'copy-two', equipped: false, slot: 'weapon', grantedAt: null},
    {itemId: 'vitaslash', instanceId: 'copy-three', equipped: null, slot: null, grantedAt: null},
    {itemId: 'future-gear', instanceId: 'future-copy', equipped: true, slot: 'accessory', grantedAt: null}]});
  assert.equal(model.equipmentAvailable, true);
  assert.equal(model.equipment.length, 2);
  const sword = model.equipment.find(entry => entry.itemId === 'vitaslash');
  assert.equal(sword.name, 'VitaSlash');
  assert.equal(sword.copyCount, 3);
  assert.equal(sword.equippedCount, 1);
  assert.equal(sword.unknownEquippedCount, 1);
  assert.deepEqual(sword.instances[0], first);
  assert.equal(model.equipment.find(entry => entry.itemId === 'future-gear').icon, null);
  assert.equal(inventoryModel({equipment: null}).equipmentAvailable, false);
  assert.equal(inventoryModel({equipment: []}).equipmentAvailable, true);
});

test('Power Bottle is a level and TP state, with the app’s four fill artwork states', () => {
  const model = inventoryModel({inventory: {powerBottle: {level: 3, storedTp: 400, capacity: 600,
    pendingTp: 300, pendingUntil: '2026-11-01T00:00:00Z', readyTp: 100}}});
  assert.deepEqual(model.powerBottle, {itemId: 'power-bottle', name: 'Power Bottle',
    icon: '../assets/fitamaster-items/power-bottle-half.webp', level: 3, storedTp: 400, capacity: 600,
    pendingTp: 300, pendingUntil: '2026-11-01T00:00:00Z', readyTp: 100, recorded: true});
  assert.equal('quantity' in model.powerBottle, false);
  for (const [storedTp, state] of [[0, 'empty'], [119, 'low'], [120, 'half'], [200, 'full']]) {
    const bottle = inventoryModel({inventory: {powerBottle: {level: 1, storedTp, capacity: 200}}}).powerBottle;
    assert.ok(bottle.icon.endsWith(`power-bottle-${state}.webp`));
  }
  const unknown = inventoryModel({inventory: {powerBottle: null}}).powerBottle;
  assert.equal(unknown.recorded, false);
  assert.equal(unknown.level, null);
  assert.equal(unknown.storedTp, null);
  assert.equal(unknown.icon, null);
});

test('conflicting duplicate equipment facts do not invent a second copy or a definitive equipped state', () => {
  const model = inventoryModel({equipment: [
    {itemId: 'vitaslash', instanceId: 'same-copy', equipped: true, slot: 'weapon', grantedAt: '2026-10-01T00:00:00Z'},
    {itemId: 'vitaslash', instanceId: 'same-copy', equipped: false, slot: 'headgear', grantedAt: null},
  ]});
  assert.equal(model.equipment[0].copyCount, 1);
  assert.equal(model.equipment[0].equippedCount, 0);
  assert.equal(model.equipment[0].unknownEquippedCount, 1);
  assert.deepEqual(model.equipment[0].instances[0], {itemId: 'vitaslash', instanceId: 'same-copy', equipped: null, slot: null, grantedAt: null});
});

test('unique entitlements distinguish unlimited, unavailable and unrecorded availability', () => {
  const enabled = inventoryModel({inventory: {magicPotion: {available: true}, ancientCompass: {available: true}}});
  assert.equal(enabled.magicPotion.available, true);
  assert.equal(enabled.ancientCompass.available, true);
  const disabled = inventoryModel({inventory: {magicPotion: {available: false}, ancientCompass: {available: null}}});
  assert.equal(disabled.magicPotion.available, false);
  assert.equal(disabled.ancientCompass.available, null);
  assert.equal(inventoryModel({}).magicPotion.available, null);
  assert.equal(inventoryModel({inventory: {ancientCompass: {available: false}}}).ancientCompass.available, null);
  const rendered = renderInventory(document, {inventory: {magicPotion: {available: true}, ancientCompass: {available: null},
    powerBottle: {level: 2, storedTp: 180, capacity: 400, pendingTp: 80, pendingUntil: null, readyTp: 100}}});
  assert.match(rendered.textContent, /Magic PotionUnlimited/);
  assert.doesNotMatch(rendered.textContent, /Ancient Compass/);
  assert.match(rendered.textContent, /Level2/);
  assert.match(rendered.textContent, /Stored TP180/);
  assert.match(rendered.textContent, /Capacity400/);
  assert.match(rendered.textContent, /Pending TP80/);
  assert.match(rendered.textContent, /Ready TP100/);
});

test('rendered inventory shows owned items only and keeps grouped equipment details', () => {
  const root = renderInventory(document, {inventory: {items: [{itemId: 'treat', quantity: 2}, {itemId: 'health-potion', quantity: 0}]},
    equipment: [{itemId: 'rep-ripper', instanceId: 'copy-a', equipped: false, slot: 'weapon', grantedAt: null},
      {itemId: 'rep-ripper', instanceId: 'copy-b', equipped: true, slot: 'weapon', grantedAt: '2026-10-02T00:00:00Z'}]});
  assert.equal(root.tagName, 'section');
  assert.equal(byClass(root, 'inventory-zero-stock').length, 0);
  assert.equal(byClass(root, 'inventory-unavailable').length, 0);
  assert.match(root.textContent, /TreatQuantity: 2/);
  assert.doesNotMatch(root.textContent, /Health Potion|Quantity: 0|Items with no stock|Quantities unavailable/);
  const gear = byClass(root, 'inventory-equipment');
  assert.equal(gear.length, 1);
  assert.match(gear[0].textContent, /Rep Ripper2 copies · 1 equipped/);
  const detail = nodes(gear[0]).find(node => node.tagName === 'details');
  assert.match(detail.children[0].textContent, /View 2 instances/);
  assert.match(detail.textContent, /copy-a/);
  assert.match(detail.textContent, /copy-b/);
  assert.match(detail.textContent, /Slotweapon/);
  assert.match(detail.textContent, /Granted/);
  assert.equal(nodes(root).some(node => ['button', 'input', 'form'].includes(node.tagName)), false);
});

test('remote IDs and equipment metadata are literal text and never create markup or image URLs', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const root = renderInventory(document, {inventory: {items: [{itemId: payload, quantity: 4}]},
    equipment: [{itemId: payload, instanceId: payload, slot: payload, equipped: null, grantedAt: payload}]});
  assert.ok(root.textContent.includes(payload));
  for (const image of nodes(root).filter(node => node.tagName === 'img')) {
    assert.match(image.attributes.src, /^\.\.\/assets\/fitamaster-items\/[a-z0-9-]+\.webp$/);
    assert.equal(image.attributes.alt, '');
  }
  assert.equal(nodes(root).some(node => node.tagName === 'script' || 'onerror' in node.attributes), false);
  const empty = renderInventory(document, {});
  assert.doesNotMatch(empty.textContent, /Quantity unavailable|State not recorded|Availability not recorded|Power Bottle|Magic Potion|Ancient Compass/);
  assert.match(empty.textContent, /No confirmed items to display/);
  assert.match(empty.textContent, /only confirmed items are shown/);
});

test('catalog thumbnails preserve PNG provenance and matching hashes within the 2 MB delivery budget', async () => {
  const assetRoot = new URL('../docs/assets/fitamaster-items/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', assetRoot), 'utf8'));
  assert.equal(manifest.items.length, 39);
  assert.equal(manifest.assets.length, 42);
  assert.equal(new Set(manifest.assets.map(asset => asset.file)).size, 42);
  assert.equal((await readdir(assetRoot)).filter(file => file.endsWith('.webp')).length, 42);
  assert.equal((await readdir(assetRoot)).filter(file => file.endsWith('.png')).length, 0);
  let totalBytes = 0;
  for (const asset of manifest.assets) {
    assert.match(asset.source, /^assets\/.+\.png$/);
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
    const bytes = await readFile(new URL(asset.file, assetRoot));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.file);
    assert.ok(asset.width > 0 && asset.width <= 256 && asset.height > 0 && asset.height <= 256);
    assert.equal(bytes.length, asset.bytes);
    totalBytes += bytes.length;
  }
  assert.ok(totalBytes < 2_000_000, `Inventory thumbnails total ${totalBytes} bytes`);
  for (const definition of ITEM_CATALOG) {
    assert.ok(manifest.items.some(entry => entry.itemId === definition.itemId && entry.name === definition.name));
    if (definition.icon) assert.ok(manifest.assets.some(asset => definition.icon.endsWith('/' + asset.file)));
  }
});

test('absent special items are hidden and owned special items remain visible', () => {
  const absent = renderInventory(document, {inventory: {items: [{itemId: 'treat', quantity: 1}], powerBottle: null, magicPotion: {available: false}, ancientCompass: {available: null}}, equipment: []});
  assert.doesNotMatch(absent.textContent, /Unique items|Power Bottle|Magic Potion|Ancient Compass|Equipment|No equipment/);
  const present = renderInventory(document, {inventory: {items: [], powerBottle: {level: 1, storedTp: 0, capacity: 200, pendingTp: 0, readyTp: 0}, magicPotion: {available: true}, ancientCompass: {available: true}}, equipment: []});
  assert.match(present.textContent, /Power Bottle/);assert.match(present.textContent, /Magic PotionUnlimited/);assert.match(present.textContent, /Ancient CompassAvailable/);
  assert.equal(byClass(present, 'inventory-unique').length, 3);
});
