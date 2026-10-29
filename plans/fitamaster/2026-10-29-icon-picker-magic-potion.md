# Item icons and Magic Potion tester unlock implementation plan

> **For agentic workers:** Use subagent-driven-development for the independent picker and backend changes; root integrates shared grant metadata/client validation and verifies the whole change.

**Goal:** Show real item icons in Add item and let the owner explicitly unlock account-wide Magic Potion test access.

**Architecture:** Preserve the current guarded grant RPC, immutable intent/receipt/status flow and owner AAL2 authorization. Use the existing item assets in a native disclosure/radio picker. Add Magic Potion as a fixed-one entitlement action, never a stackable potion or immediate TP award.

**Tech stack:** Vanilla browser ES modules/HTML/CSS, Supabase PostgreSQL, Node tests, synthetic browser fixtures.

**Spec:** User requested icons and Magic Potion, then explicitly approved “Idagdag bilang tester unlock” after being told it is unlimited tester access with TP/XP progression. No activity-monitoring feature is approved by that response.

## Global constraints

- Retain all existing normal grants, review/confirm, owner-only access and mandatory verified TOTP/AAL2.
- Magic access is account-wide and survives progress resets. UI states this clearly; quantity is fixed to one entitlement action and hidden from numeric editing.
- No real player grants, new native build, Auth configuration change, TP/XP/coin/use-credit mutation, bans or deletion during implementation/testing.
- No public TP earning formulas; preserve approved artwork, portal layout and Tama-Guide label.
- Preserve live migration 202610280009 and allocate a fresh version. Source publication does not authorize database activation; obtain final approval for exact reviewed migration and matching site.

## Review focus

- Switching items preserves the draft reason/quantity and restores useful keyboard focus after full redraw.
- A reset/deleted target or lost acknowledgement cannot turn a new intent into a duplicate entitlement grant.
- Already unlocked access is a clear definitive rejection, not another successful stock grant.
- UI must distinguish enabling access from using Magic Potion or adding TP immediately.
- Existing role/permission/lifecycle locks and normal grant contracts remain unchanged.

### Task 1: Shared grant metadata and client rules — root

**Files:** Create `src/fitamaster/grant-catalog.mjs`; modify `core.mjs`, `grant-controller.mjs`, corresponding grant/controller tests.

**Interface:** `GRANTABLE_ITEMS` is an immutable array of item metadata with `grantKind: stack|equipment|unlock`, `maxQuantity:99|1`. Include only the existing 36 grantable entries plus `magic-potion`, leaving inventory ownership metadata unchanged. Existing RPC intent fields and receipt matching remain exact.

- [x] Add failing tests: magic-potion quantity 1 accepted, 0/2/99 rejected; other unique items still rejected; selection clamps unlock quantity to 1; already-enabled message is readable; unknown receipt still requires status.
- [x] Implement shared catalog and client validation/controller rules without changing status/idempotency flow.
- [x] Run focused client tests, then full website tests after UI integration.

### Task 2: Icon picker — UI worker

**Files:** `grant-view.mjs`, existing portal/grant styles and focused view tests.

**Interface:** Consume `GRANTABLE_ITEMS`; keep actions.change/review/confirm/checkStatus signatures. Use one itemId radio group in a native disclosure, visual sections Items/Equipment/Tester access and approved icon/name per option.

- [x] Add failing tests for explicit selection, real option artwork, grouped radios, busy state, focus, form values and Magic unlock review/result copy.
- [x] Implement accessible keyboard/touch picker, no modal. Use hidden quantity=1 for unlock; clearly disclose unlimited access across resets, and disable already-enabled Magic when confirmed by player inventory projection.
- [x] Verify existing item review, uncertain retry, text safety and target checks remain intact.

### Task 3: Guarded backend extension — backend worker

**Files:** Fresh migration `202610290001_fitamaster_magic_potion_unlock.sql` unless metadata shows collision; meaningful backend behavior/concurrency fixtures and rollback guidance.

**Interface:** Existing `fitamaster_grant_item(uuid,uuid,bigint,text,integer,text)`, itemId magic-potion, quantity1. Existing immutable receipt/status/history schema remains usable. No entitlement table direct grants.

- [x] Verify dependency metadata and version availability, no player records.
- [x] Test owner/AAL2 denial, invalid quantity, generation/custody change, exact retry, conflicting nonce, already-enabled rejection, audit/status and unchanged TP/XP/coins/uses/normal stock.
- [x] Extend only the guarded grant body with account allowlist insert; reject existing entitlement with `FITAMASTER_GRANT_ALREADY_ENABLED`. Preserve lifecycle locks, OID/ACL/config, timeouts and old exact-retry ordering.
- [x] Run synthetic PostgreSQL fixtures, concurrency checks and existing grant regressions. No live installation.

### Task 4: Integration, review and activation handoff — root + fresh reviewer

- [x] Review combined diff, run full website tests and meaningful backend checks; build portal bundle and update asset cache versions.
- [x] Use local synthetic fixture for desktop, 390px and 320px picker/selection/review/unlock/already-enabled/uncertain delivery. Never confirm a real player action.
- [x] Run one mechanical UI detector pass and one bounded screenshot review, fix concrete defects, recheck affected behavior.
- [x] Obtain fresh security/regression review and prepare exact migration, rollback, tests and screenshot in outputs.
- [ ] Request final approval for live migration plus matching source/site publication. After approval verify deployed definitions/ACLs and live bytes, without giving a real player access.
