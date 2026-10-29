# Player item history — agreed request and implementation contract

2026-10-29. Implements the owner's explicit request for equipped items and consumed/gifted items for the past week/month. This is a bounded extension of the existing admin read view, not the separate unapproved activity/cheating proposal. Existing icon/Magic commits remain preserved and unpublished pending their separate activation approval.

## Product scope

- **Equipped now:** Weapon, Headgear, Accessory from the last saved server snapshot, using existing equipment DTO and artwork. No historical equip/unequip dates exist; grantedAt is not equip time.
- **Recorded item history:** Last 7 days / Last 30 days, rolling server UTC instants `[from,to)`. Show exact window with locally formatted timestamps. Do not call this a calendar week/month.
- Item icons/names, quantity, recorded date and previous/current progress generation as relevant. Current loadout is independent of selected history period.
- Uses include nine ordinary care consumables, two box openings, Magic Potion use and Bottle use. Label consumed/opened/reusable-use correctly. Exclude currency spending, acquisitions, admin additions, tester unlocks, failed/pending requests and companion/wrapper duplicate receipts.
- Gifts sent, gifts claimed and incoming pending/invalidated parcels remain distinct. Pending parcels are not credited inventory. Show current gift status, actual sent/claimed times and minimal counterparty name, not gift messages.
- Retained history only; old records can be removed by reset/deletion and some legacy Magic uses lack timestamps. Never reconstruct missing events or show acquisition time as equip/claim time. No complete historical audit or physical-phone verification claim.
- No gameplay writes, mail-read marking, Health access, raw saves/results/messages, app build, penalties or new telemetry. Owner+live-session+verified-TOTP/AAL2 and audited read gate stay mandatory.

## Backend interface

New public RPC `fitamaster_player_item_history(p_request_id uuid,p_player_id uuid,p_generation bigint,p_days integer default 7,p_after jsonb default null,p_limit integer default 25) returns jsonb`.

Use existing begin_request(...,'read'), fixed security-definer search path and bounded statement/lock timeouts. Reuse existing `player_read` audit action, scoped to target player: no change to history_action_check is necessary. Every successful page is audited; denied reads leave no gameplay/admin effects. Check requested target/current generation in the same statement snapshot as all history projections. On mismatch raise `FITAMASTER_HISTORY_TARGET_CHANGED`; missing target is an error. No target mutation locks/getters/initializers.

Return:

```js
{
  playerId: uuid, generation: safeInteger,
  days: 7 | 30, from: timestamp, to: timestamp,
  observedAt: timestamp, // equals anchored to, reused across cursor pages
  resetAt: timestamp | null,
  coverage: {
    basis: 'retained_server_records',
    undatedMagicUses: boolean,
    resetWithinWindow: boolean
  },
  summary: [{kind, itemId, status, quantity, eventCount}],
  events: [{
    eventId: string, kind, itemId: string, quantity: positiveSafeInteger,
    generation: safeInteger, recordedAt: timestamp,
    status: 'pending' | 'received' | 'invalidated' | null,
    sentAt: timestamp | null, receivedAt: timestamp | null,
    peer: {playerId: uuid | null, username: string | null,
      nameSource: 'at_send' | 'current_profile' | 'unavailable'} | null
  }],
  nextCursor: {version:1, playerId:uuid, generation:safeInteger, days:7|30,
    anchorAt:timestamp, beforeAt:timestamp, beforeId:string} | null
}
```

Kinds: `consumed`, `opened`, `used`, `gift_sent`, `gift_claimed`, `gift_incoming`. Summary rows use the same kind/item/status grouping, quantity=sum units and eventCount=count independent canonical events across the entire selected retained window, not page length. Usage/open events have quantity1, null status/times/peer. All pages sort `(recordedAt DESC,eventId DESC)` with source-scoped stable event IDs (source + generation + request ID; gift ID + event type for transfers). Do not dedupe equipment forwarding by physical instance ID.

Validate days exactly7/30, generation safe range, cursor object allowlisted fields and target/generation/days/version binding, finite timestamps and bounded event IDs. Initial anchor is one server clock observation. Cursor anchor may not be in the future or older than 15 minutes at evaluation; beforeAt must lie in the anchored window. Use existing page_limit helper (1–50), maximum50 events. Return a fresh error for expired/mismatched cursors rather than silently change the window. Do not accept arbitrary period dates/timezones/table names from the browser. Return a stable anchored snapshot boundary, without claiming immutable rows: source records/status may later be corrected/deleted.

## Exact sources

Read the two audit notes next to this contract for exact definitions/references and live schema metadata in `admin-feasibility/item-history-live-schema.json`.

- Care: exact actions `use_treat`, `use_health_potion`, `use_hi_heart_potion`, `use_talakitok`, `use_xp_book:1/2/3`, `use_protein-bar`, `use_rest-stopper` in pet_action_receipts, recorded created_at, quantity1. Never add dungeon/gift-stack companion records.
- Mystery/treasure opening ledgers, created_at, quantity1, kind opened. Do not flatten opening rewards into consumption.
- Magic uses issued_at only, kind used; undated legacy uses excluded from dated totals and surfaced via coverage. Bottle operations action use only, created_at, kind used; amount is TP, never item count.
- Include all retained generations within the selected period. Use current game_reset_state only for binding/coverage, never to silently remove prior-generation history.
- friend_gifts outgoing: original_sender_id=target, sent_at in window, kind gift_sent, recipient's current profile name if available; current status and both timestamps preserved.
- Claimed incoming: recipient_id=target and status received, received_at in window, kind gift_claimed. This includes old parcels claimed now. Sender username_at_send is labeled at_send; no invented recipient name snapshot.
- Incoming awaiting/invalidated: recipient_id=target, status pending/invalidated, sent_at in window, kind gift_incoming. No invalidatedAt/reason exists, so show current status without claiming its change date. Counterparty sender snapshot survives donor deletion.

Use target/time predicates in independent UNION branches before aggregate/page queries. No raw receipts/results/messages/source-stack identifiers in DTO. Known catalog IDs use existing static artwork; unfamiliar IDs are literal text with no remote image URL.

## Client/UI interface

Root owns core.mjs/app.mjs/view.mjs wiring and a strict DTO parser in new `item-history.mjs`. UI worker exports `renderPlayerItemHistory(document,{player,data,days,busy,error,canPrevious=false,needsReload=false},actions)` from `item-history-view.mjs`; actions `{period(days),refresh(),page(direction,nextCursor)}`. No fetching in renderer. Root also wires `renderEquippedEquipment(document,player)` from equipped-view.mjs.

Default days7 for each newly selected player; period changes reset item-history page stack. Auto-load first history page after successful player load. Next uses the opaque validated cursor; Previous restores a revalidated in-memory page/anchor without a new RPC. A generation-mismatch response clears pagination, blocks read/cache reuse and requires a guarded player reload while preserving unresolved immutable grant intent. Refresh starts a new anchored window. Data, errors and cursors live only in memory and are erased on target change, sign-out/auth loss, navigation or reset-generation mismatch. Old-period/old-player/late responses must never restore old data. Failed/unsupported backend is unavailable/error, not empty history or zero. Maintain existing immutable grant/unknown-outcome navigation safeguards.

Renderer shows a native period selector and refresh, window/coverage note, all-period per-item summary groups with icons, and a newest-first paginated event list with recorded times, status, counterparty name source, quantities and prior-generation marker. Empty retained records is not a claim the player never used/gifted anything. Keep invalidated incoming separate from pending; no overall sent+claimed unique-transfer total. Loading must not flash zeros or previous player's records.

## Implementation and verification

Use fresh additive migration `202610290002_fitamaster_player_item_history.sql` if still free. Preserve live009 and pending001 exactly. Guard owner/admission/audit/page-limit dependencies and inspect current required table shapes. Add only private pure helper(s), authenticated guarded read RPC and useful scoped indexes selected from live metadata/synthetic plans; no existing gameplay function replacement, RLS weakening or new table grants. If indexes need prolonged locks, stop and revise the install strategy; bounded lock/statement timeouts must prevent indefinite blocking.

Test real successful normal/gifted/battle use plus canonical fixtures, retries/duplicate companions, boxes, Magic/Bottle semantics, all-generation history and reset loss, incoming pending vs claimed, original_sender_id after donor deletion, forwarding identity, boundaries, tied pagination, full-window summary, cursor tampering/expiry, target/generation mismatch, owner/AAL1/session/TOTP/anon denial and no gameplay/Auth side effects. Inspect meaningful synthetic query plans. Existing normal grant/Magic suites remain unchanged.

UI/core tests cover malformed DTOs, selector bounds, unavailable vs empty, stale target/period/auth responses, current equipment unknown/conflicts, safe literal text and static icons. Verify desktop and320/390px without overflow. One independent combined review, exact SQL hash/source diff and final live-activation approval are required before deployment. Existing icon/Magic approval remains scoped to its exact previously reviewed artifacts; do not silently extend it to this new reader.
