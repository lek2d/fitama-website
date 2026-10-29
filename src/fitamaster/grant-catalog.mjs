import {ITEM_CATALOG} from './inventory.mjs';

// Presentation and input bounds only; the guarded server RPC authorizes every action.
// A Magic Potion entry enables account-wide tester access, never potion stock.
export const GRANTABLE_ITEMS = Object.freeze(ITEM_CATALOG
  .filter(item => item.kind === 'stack' || item.kind === 'equipment' || item.itemId === 'magic-potion')
  .map(item => Object.freeze({...item,
    grantKind: item.itemId === 'magic-potion' ? 'unlock' : item.kind,
    maxQuantity: item.kind === 'stack' ? 99 : 1,
  })));
