# Fitamaster player card and illustrated inventory

Goal: Show the selected player's saved Fitama appearance and complete cloud inventory with approved item artwork.
Architecture: Extend the existing guarded fitamaster_player JSON projection, then render one selected-player card and a grouped inventory. Keep public social APIs and all gameplay getters unchanged.
Tech: PostgreSQL guarded RPC; static ES modules and existing local Rive runtime/art; Node tests and disposable PostgreSQL; CUA visual checks with synthetic fixtures.
Spec: Owner approved a Fitama Card in Player Details and an inventory item list with icons. Existing owner-only access and mandatory 2FA remain.
Global constraints: No gameplay writes, initialization getters, item grants, bans or deletion. No random traits, future egg look disclosure, client secrets, missing-as-zero conversion or public TP earning formulas. Preserve original worktrees and existing artwork/layout. Publish only after verification; database activation is a distinct operator action.
Review focus: exact saved traits, expired TP, current generation, inventory double counts, no hidden ledger mutation, AAL2/owner/audit preservation, async rendering cleanup and small screens.

## Shared interfaces
Keep existing player fields. Add petCard: null or {stage:'egg'|'pet',variant:'blue'|'nature'|'red',name,appearance,level,weeklyRank,dailyTp,tpExpiresAt,sleeping,profileUpdatedAt,appearanceUpdatedAt}. Unknown values remain null. appearance is null for eggs; original or exact versioned saved traits for pets.
Add inventory: {items:[{itemId,quantity}],powerBottle:null|{level,storedTp,capacity,pendingTp,pendingUntil,readyTp},magicPotion:{available:boolean},ancientCompass:{available:true|null}}.
Canonical items: treat, health-potion, hi-heart-potion, protein-bar, rest-stopper, grilled-talakitok, xp-book-1, xp-book-2, xp-book-3, tama-coin, mystery-package, treasure-box. Missing quantities are null. Preserve existing equipment instance projection, grouped only by the renderer; unknown IDs remain visible.
Power Bottle level is not a quantity; Magic Potion is an unlimited entitlement; absent lazy compass entitlement is unknown, not zero.

## Task 1: Read-only backend projection
- [x] Add focused RED tests for exact saved appearance, eggs, expired TP, missing care, generation isolation, claimed boxes/openings, unique item state and guards.
- [x] Add additive migration replacing only fitamaster_player; reuse inspected STABLE read-only helpers for exact card projection, preserve begin_request and audit.
- [x] Verify local disposable PostgreSQL, no gameplay data mutations and existing ACL/function/role preservation; document operational boundaries and rollback.

## Task 2: Illustrated inventory module
- [x] Add normalize/group tests for owned quantities, missing values, XP books, gear copies/equipped, unknown IDs and unique states.
- [x] Copy canonical app PNGs with provenance; build inventory.mjs and inventory.css only, preserving DOM text safety.
- [x] Render owned items with meaningful labels/icons/quantities, unknown/unavailable states and separate equipment details. Root integrates into player view.

## Task 3: Saved pet card and integration
- [x] Test deterministic trait planning for all species, legacy originals, invalid/missing look and egg privacy; test async cancellation/resource release.
- [x] Build selected-player pet renderer with existing approved Rive data-binding assets; no random chooser; safe static fallback on unsupported rendering.
- [x] Add card fields and inventory module to Player Details; clear renderer on every view/auth lifecycle and dispose. Preserve existing raw admin facts separately.
- [x] Build and run full website tests; desktop/mobile visual QA uses explicitly synthetic fixtures, never shipped fixtures or live player data.

## Task 4: Review and activation
- [x] Independent review of database guards/counts, renderer races and accessibility. Fix material findings and repeat covering tests.
- [x] Owner explicitly approved migration006 after the initial review rejection. Installed and readback-verified on PostgreSQL17.6; exact target/SQL/hash/preservation checks passed. No gameplay edits.
- [x] Published feature commitf6e6a46 via successful Pages workflow40661463604. All74 live checks passed (65assets, canonical route,8unauthenticated RPCdenials). One protected owner-session petcard/inventory view rendered successfully. Final evidence is in the task outputs.
