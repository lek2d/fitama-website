# Fitamaster owned inventory and direct admin item grants

Goal: Show only confirmed owned items, and let the single owner add a selected normal item to a chosen player's server inventory with a review/confirm step and durable history.
Spec: User requested removal of zero/unavailable item tiles, Add item with selection, and explicitly chose direct inventory over generic Parcel. Same owner-only login and verified TOTP/AAL2 remain. Phone reflects server changes after a successful sync; no real-time/offline or parcel notification promise.
Architecture: Existing isolated app/backend and website worktrees. Reuse guarded admin authorization and canonical inventory grant helpers. Add bounded owner-only grant/status RPCs, immutable full-intent receipts, and atomic grant/audit. Static web item picker/review/outcome is session memory only.
Tech: Existing PostgreSQL/Supabase RPCs, ES modules, static approved art, Node/disposable PostgreSQL tests and CUA synthetic preview.
Global constraints: No real production player grant in implementation/testing. No grants for Magic Potion entitlement, Ancient Compass or Power Bottle upgrades. No ban/delete, Auth configuration change, native build, QA/automation resume or public TP calculation. Preserve other work. Production activation requires separate explicit approval of the reviewed migration and publication.
Review focus: Exact owner/session/TOTP/AAL2; lifecycle/reset/target-generation races; retry idempotency and full-intent conflicts; stock provenance/revision/overflow; per-copy equipment receipts; box counts; immutable history; stale target/auth clearance and ambiguous network outcome.

## Shared contracts
- Grantable catalog: existing12 stack IDs plus24 equipment IDs (36 total). Stack quantity1–99; equipment quantity1. Reason required1–240 trimmed printable characters. Special3 items excluded.
- RPC public.fitamaster_grant_item(p_request_id uuid,p_player_id uuid,p_generation bigint,p_item_id text,p_quantity integer,p_reason text) -> receipt {requestId,playerId,generation,itemId,quantity,reason,grantedAt}. Exact retry returns the original receipt; a changed intent under the same request ID must fail.
- RPC public.fitamaster_grant_status(p_request_id uuid,p_grant_request_id uuid) -> receipt|null. Same owner/AAL2 required; status does not issue a grant.
- History events for grants expose itemGrant:{itemId,quantity,reason,generation,grantedAt}; preserve original fields/events and no gameplay writes on reads.
- Website renderer export renderItemGrant(document,{player,busy,open,draft,review,result,uncertain,statusChecked},actions), returning a section/details panel. draft={itemId,quantity,reason}. review={playerId,username,friendCode,generation,itemId,quantity,reason,requestId}. result=receipt|null. actions={toggle(open),change(name,value),review(draft),edit(),confirm(),checkStatus()}. Native form data is parsed safely; remote content text nodes only. Root integrates/controller methods.
- While uncertain, editing/new-intent sends are disabled. Check status; if no completed receipt is found, allow retry of the SAME requestId/intent. A completed result says added to server inventory, awaiting phone sync.

## Task1: Backend grant/status/history
- [x] Inspect latest source/live metadata before choosing migration version; source drift guards and fixed search paths/ACLs.
- [x] Add RED behavioral tests then implement owner-only grant/status and immutable request receipts, atomic with stock and history. Use canonical locks/reset generation/provenance and acquisition helpers.
- [x] Include9 food/potion/XP stocks, coins, both boxes and24equipment definitions. No fake check-in/prize/friend-gift origins. Box counters must count admin stock before subtracting openings (not after clamping).
- [x] Verify unauthorized/aal1/expired/revoked-factor/session denial, conflicts, timeout/retry/concurrent duplicate, overflow, target reset/deletion, zero side effects on denial and rollback-aware disable.
- [x] Write operations/activation/rollback boundaries. No deployment or real grants.

## Task2: Add item renderer
- [x] Build grant-view.mjs, grant.css and focused tests. Use existing artwork/catalog/palette; do not modify core/app/view/inventory.
- [x] Add item control; allowed-item icon/name selection, quantity constraints, reason; review player+item+qty+reason before confirmation. Safe result/uncertain/status/retry states.
- [x] Test special exclusions, target identity, bounds, literal text, busy state, uncertain state and receipt display. No fake RPC test sends on live.

## Task3: Website controller and owned display
- [x] Owned inventory filtering completed;12focused/143full website tests pass before grant feature integration.
- [x] Add grant validation, core guarded RPC methods and outcome handling. Integrate renderer + history metadata and clear intents on auth/target changes.
- [x] Keep the same intent on ambiguous failures, require review before confirm, use status and same-request retry, refresh selected player's server inventory after success.
- [x] Build, full tests, synthetic desktop/mobile/uncertain/auth-clear visual checks.

## Task4: Review and approval-ready delivery
- [x] Independent security/behavior review and fixes. Verify source/art/build/test evidence.
- [x] Prepare exact migration/operator preflight and a concrete reviewable result; request production migration+publication approval at the final activation step.
- [ ] After approval only, install, verify metadata and unauthorized denials; publish matching site. Do not issue a real grant unless separately selected/confirmed by the owner.

## Current evidence

Final local website build and171tests pass. Backend cumulative PostgreSQL65/65 and related client inventory29/29 pass. Independent integrated website review64/64 pass; no unresolved blockers. Browser synthetic picker/review/confirmation/status-recovery and320/390/1440px checks pass. Broader legacy database fixtures have44 setup failures before007 (missing authenticator role); these are recorded, not claimed green. Migration source SHA256:8bb514989de928881d6bd845532ff7427f22510b77dd30ef7eb9bd49287d21d2. No production grant or activation.

## Concurrent source preservation and approved activation

Owner approved live migration/source/site publication. A concurrent monthly-rank update occupied007 before our install; preflight stopped without writes. Grant SQL was renamed008 with identical reviewedbytes/hash. The exact live007 monthly-rank source was recovered and preserved in the source chain. Fresh cumulative007→008 grant verification21/21passes. Newerwebsiteprivacy/404 RedpotsGames corrections were merged fromorigin/main and all171website tests rerunpass. Live008 preflight passed against PostgreSQL17.6 with8 revieweddependencies, singleowner and privateaccess denied. Installation/readback/publication evidence follow in the delivery package.
