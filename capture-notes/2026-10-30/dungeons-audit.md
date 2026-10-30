# Dungeon guide source audit — October 30, 2026

Reviewed snapshot: `9b785bc6ff4868a5a43be15a358ce98d85973e52` (GitHub app main), extracted under `work/website-refresh-2026-10-30/app`. Website input: `work/fitama-website/docs/guide.html`. This was a source audit; no production backend or database was read or changed.

## Deliverable

`dungeons-replacements.json` contains four unique exact `{old,new}` HTML replacements. Apply **before** broad item-name replacements. Each old anchor was found exactly once in the source guide. No guide/app source files were edited by this audit.

1. Extend the attack paragraph with the new three-marker battle rhythm, conditional on the player's run showing three sword markers. Describe the second-attack monster opportunity, missed-full-day penalty, older-run compatibility and Second Wind allowance.
2. Rename the dungeon-rest item to Second Wind.
3. Rename Heart Potion in loot prose and remove the outdated implication of an automatic first-clear Power Bottle. Explain Solo Debut claim and existing-bottle retention.
4. Clarify per-player item rolls in the enemy atlas outro; mention Heart Potion and separate one-time quests.

No movement/workout-to-TP earning calculation is added. Charges are described through the UI markers, without exposing the TP earning formula.

## New attack rules: client and server evidence

- `app/src/domain/splitAttacks.ts:1–16`: three attack portions and waiting/ready/used sword markers.
- `app/src/screens/DungeonBattleScreen.tsx:396–399`: new behavior only when the battle snapshot has `attackSplitPolicy === 1`; attack waits for the full next portion. `:414–423` also gates attack while zero-heart, pending, stale or terminal.
- `app/src/screens/DungeonBattleScreen.tsx:438–443`: new bar includes spent allowance and ready TP.
- `app/src/components/DungeonGuide.tsx:7–12`: latest app's first-visit tips teach three attacks, second-attack retaliation, skipped-day penalty, 1–3 days and Normal/Hard differences.
- `app/supabase/migrations/202610300002_split_attacks.sql:1–11`: new-run policy, compatible clients, explicit rollout instructions.
- Same migration `:22–29, :61–77`: configuration defaults **false**, new run adoption also needs daily-monster policy v2 plus every member's capability. This source does **not** prove the production switch is enabled. Public copy is deliberately conditional on the run's three markers. Older runs are not silently rewritten.
- Same migration `:87–145`: second-attack monster outcome can hold back; a living member is selected, defense and reflection are applied. Missed-day events hit the missed member directly without defense/reflection.
- Same migration `:151–164`: each member's second attack of the game day creates one daily monster opportunity, unless an event already exists or the run is terminal.
- Same migration `:168–199`: missed-day penalty only when the member belonged to the battle for the full earlier day, did not attack and had no daily monster event. It is processed on a subsequent active-run read after reset. No public exact heart-loss number is asserted: the underlying hit branch retains a Leafshade Hood risk check, so a blanket “always ½ heart on Normal” would be too broad.
- Same migration `:209–222`: server limits an attack to the next complete portion.
- `app/supabase/migrations/202610120003_daily_monster_opportunities.sql:10–18`: monster rolls have held-back outcomes and Hard critical-hit possibility. Therefore the source tutorial's unconditional “strikes back” was refined to “daily chance to strike back.”
- `app/supabase/migrations/202610300003_split_training.sql:1–6, :22–27`: first Training Camp uses split portions for compatible clients without the dungeon rollout switch. Training copy/quest rewards are assigned to the progress audit.

## Retained rules rechecked

- **Two daily numbered entries and cancellation exception:** `app/supabase/migrations/202610220006_dungeon_entry_skip_cancelled.sql:1–22`. Active/cleared/lost runs count; cancelled zero-contribution runs do not. Existing website text is accurate.
- **1–3 day runs:** `app/src/domain/dungeonDefinitions.ts:143–146, :155–157` caps new catalog requests at three days while old frozen versions can retain longer histories; `app/supabase/migrations/202610100002_independent_dungeon_loot.sql:9–14` enforces three days for that policy.
- **Rest after a win / expiry boundary:** `app/src/domain/dungeonRest.ts:44–58` uses the next frozen game-day reset after a win and the preceding day boundary for a lost run. Existing copy that late result reads do not add a rest day is accurate.
- **Normal vs Hard leaving refund:** `app/supabase/migrations/202610030006_hard_leave_refund.sql:1–29` returns 100% vs 80% of eligible unexpired raw attack spend. Existing prose is accurate; no earning calculation is involved.
- **Group size, solo XP and duration:** `app/src/domain/dungeonDefinitions.ts:98–104, :218–246` caps party at three and derives current rewards with solo reduction under the appropriate policy. Existing general guide statements remain accurate.
- **Late-join group clear:** `app/supabase/migrations/202610280009_group_clear_achievement.sql:1–8, :20–24` counts the greater of starting size/current members for achievements. Existing website group description does not conflict.
- **Chat availability:** `app/supabase/migrations/202610280001_dungeon_chat_for_all.sql:1–10, :18–25` removes beta enrollment, retaining eligibility/safety/room checks and kill switch. Existing website already says “when it is available,” does not claim beta-only, and remains accurate.

## Loot and Power Bottle

- `app/src/domain/dungeonEquipmentLoot.ts:60–97` and `app/supabase/migrations/202610100002_independent_dungeon_loot.sql:43–63` are the current independent loot implementation: each eligible member can roll one Treat/Coin/XP Book, with independent equipment-tier rolls.
- Server `:66–95`: no-damage members cannot receive XP or loot under this policy; rewards are frozen per member, eligible contribution matters; lost runs have partial XP but not victory item drops.
- Server `:83–87, :128–149`: Heart Potion's stable item key `health-potion` preserves the separate potion rolls and credit path; the updated public item name comes from the current catalog. D3/D6 potion availability is defined in `app/src/domain/dungeonDefinitions.ts:67, :70, :80–84, :124`.
- **Book tiers D1–4 / D5–8 / D9–12 remain correct.** Client `app/src/domain/dungeonEquipmentLoot.ts:70–88`; server `202610100002_independent_dungeon_loot.sql:49–53, :128–149`. Legacy `xpBooks.ts` helper is not the current independent reward source. Items agent informed.
- `app/supabase/migrations/202610290015_first_steps_quests.sql:3–16, :59–70, :80–100, :121–159`: Solo Debut is a once-per-account claimed quest; eligible solo win unlocks claim; existing bottle owners retain it; Dungeon 1 result no longer announces the automatic bottle. Power Bottle article itself assigned to items audit.

## Enemy atlas verification

Compared all 12 website enemy cards programmatically against current `dungeonDefinitions.ts` after applying the client D1–6 balance adjustment and Hard balance table. All 12 names, required levels and all 24 Normal/Hard `(HP, minimum TP, maximum TP)` tuples match. No numeric atlas changes are warranted. Equipment names/art are assigned to the items audit.

| Dungeon | Monster | Normal HP / daily TP | Hard HP / daily TP |
| --- | --- | --- | --- |
| 1 | Sour Candymaw | 300 / 100–370 | 450 / 150–560 |
| 2 | Rayumaw | 350 / 150–430 | 530 / 230–650 |
| 3 | Sweet Candymaw | 370 / 250–450 | 560 / 380–680 |
| 4 | Presyon Ogre | 390 / 250–470 | 590 / 380–710 |
| 5 | Armored Rayumaw | 430 / 250–530 | 650 / 380–800 |
| 6 | Cholestroll | 570 / 250–630 | 860 / 380–950 |
| 7 | Crampikat | 650 / 400–700 | 980 / 600–1,050 |
| 8 | Slim Cholestroll | 700 / 420–750 | 1,050 / 630–1,130 |
| 9 | Flamaga | 750 / 500–800 | 1,130 / 750–1,200 |
| 10 | Candymama | 720 / 400–750 | 1,080 / 600–1,130 |
| 11 | Dehydra | 750 / 500–800 | 1,130 / 750–1,200 |
| 12 | Joint Reaper | 888 / 666–1,000 | 1,340 / 1,000–1,500 |

## Verification actually run

- Exact replacement anchors: 4/4 unique in original guide.
- Programmatic 12-card atlas comparison: all 12 match.
- Existing client tests: `node --test tests/split-attacks.test.mjs` against extracted snapshot — **7 passed, 0 failed**. Node emitted its existing typeless-package warning; no source change was made for it.
- Server migrations and tests inspected, not executed or deployed. Production feature activation unverified by design.
