# Item, equipment and shop audit — 30 October 2026

Source: `app/` snapshot of GitHub main `9b785bc6ff4868a5a43be15a358ce98d85973e52`. Target inspected: `work/fitama-website/docs/guide.html`. This is a source/copy audit, not proof of a native release or a database deployment. No app, guide or backend files were edited by this audit.

## Ready-to-apply files

- `items-replacements.json`: 32 ordered `{old,new}` exact replacements, validated sequentially against the current guide. First apply the other agents' article/paragraph replacements, then these. The last 24 entries are visible-name substitutions; if another agent replaces an old name before these are applied, a zero match for that name is harmless. Do not rename stable item IDs, anchors or file paths.
- `item-art-map.json`: 35 current app-art to existing guide-art mappings, all source files verified present. Existing web targets end in WebP; transcode or change the HTML path/type correctly, never copy AVIF bytes under a WebP extension. Equipment art comes from `src/assets/equipmentCatalog.ts`; consumable art from `src/assets/fitamaAssets.ts` and `src/assets/itemCatalog.ts`. This audit has not changed assets.

## Corrections

1. **Renamed items:** Health Potion → Heart Potion; Super Health Potion → Super Heart Potion; Rest Stopper → Second Wind. Canonical runtime names: `src/assets/itemCatalog.ts:28–45`; actual dungeon summary names: `src/domain/dungeonItemsUsed.ts:7–9`. Global replacements cover shop, equipment descriptions, rewards, enemy cards and prose, including existing nonbreaking-space variants.
2. **Twenty equipment names changed:** visible names below; effects and stable IDs remain the same. Evidence: `src/assets/equipmentCatalog.ts:21–45`.
3. **Prices:** Super Heart Potion 12 coins (was22), Protein Bar6 (was12), Second Wind18 (was25). Canonical client/preview mirror `src/domain/tamaShop.ts:4–12`; authoritative migration `supabase/migrations/202610280005_consumable_prices.sql:1–24`. The shop uses server catalog quotes and refuses stale prices; the guide already retains that caveat.
4. **Power Bottle:** claim **Solo Debut** in First Steps after a solo dungeon win. It no longer unlocks directly from Dungeon1. Existing bottle owners keep it. Evidence: `src/domain/firstSteps.ts:3–12`; `supabase/migrations/202610290015_first_steps_quests.sql:3–16,59–69,80–95,121–156`. Kept correct existing storage restrictions, next-reset readiness and200/400/600 capacity; `src/domain/powerBottle.ts:13–28`, `supabase/migrations/202609200001_power_bottle.sql:89–105`.
5. **Shop flow:** Buy1 → Confirm purchase → Added to Inventory. Canonical UI `src/screens/TamaShopScreen.tsx:31–37,45–64`. Item effects now appear in the shared gold box, `src/assets/itemCatalog.ts:12–13` and `src/assets/equipmentCatalog.ts:9–10`.
6. **Inventory organization:** hold/drag into any slot, including empty slots; new items go upper-left, and NEW! marks newly acquired items for one visit. Evidence: `src/components/DraggableInventory.tsx:8–10,35–70`; `src/domain/inventoryLayout.ts:10–44`; `src/hooks/useNewInventoryItems.ts:14–34`.
7. **Stretchwood Bow copy:** state the full active-teammate bonus: +5% attack, +5% per active teammate, capped at+15% total, for its wearer only. Evidence: `src/domain/equipment.ts:24,74–78`; `src/assets/equipmentCatalog.ts:24,72–73`.

| Old name | Current visible name | Stable ID |
| --- | --- | --- |
| Vitamin G | Frostleaf Staff | vitamin-g |
| Point of Wellness | Wellness Spear | point-of-wellness |
| Draw Your Limits | Stretchwood Bow | draw-your-limits |
| Sore Tomorrow | Burnout Hammer | sore-tomorrow |
| Sir Takes-a-Lot | Iron Guard Helm | sir-takes-a-lot |
| Hardheaded Hero | Hero’s Horned Helm | hardheaded-hero |
| Wit Happens | Wizard’s Wit Hat | wit-happens |
| Leaf Me Alone | Leafshade Hood | leaf-me-alone |
| Quest Inspector | Explorer’s Goggle Cap | quest-inspector |
| Not Today, Bonk | Spikeback Helm | not-today-bonk |
| Sweat Dreams | Sweat Headband | sweat-dreams |
| Reigning Champ | Champion’s Circlet | reigning-champ |
| Hood Riddance | Hustle Hood | hood-riddance |
| Heart to Get | Ruby Heart Pendant | heart-to-get |
| Grow Getter | Growth Ring | grow-getter |
| Watt a Workout | Volt Bracelet | watt-a-workout |
| Luck Around & Find Out | Four-Leaf Pendant | luck-around |
| Restie Bestie | Rest Charm Bracelet | restie-bestie |
| Pack to the Grind | Adventurer’s Pack | pack-to-the-grind |
| Pill Good Inc. | Medic Pill Box | pill-good-inc |

Unchanged gear names: Rep Ripper, VitaSlash, Axercise, Heartpour Flask. XP Book names,100/200/300XP and10/18/25coin prices remain current (`src/domain/xpBooks.ts:3–6`, `src/domain/tamaShop.ts:8`). All 24 equipment effects match the existing guide; no numerical equipment rebalance found. All item gifts remain limited to the existing allowlist (`src/domain/gifting.ts:3–10`); coins, bottles, boxes, Grilled Talakitok, Ancient Compass and VitaSlash remain excluded.

## Conflicts and cautions

- `src/assets/itemCatalog.ts:33,67` says Super Heart Potion / books are used “outside dungeons”, but actual `EquipmentScreen.tsx:253–254,390,847–858` blocks only active battles. Lobbies are not excluded by those guards. Keep the guide's more precise “outside an active battle”; do not turn the generic popup phrase into a new lobby restriction.
- Second Wind has frozen per-run policies; `itemCatalog.ts:17–24` distinguishes70% spent-TP restoration for policy1, older75% policy0, and generic context where the run is not known. The guide intentionally stays generic and sends users to current item details. Once-per-day, at daily attack limit in battle, ends rest outside battle, no healing remain accurate (`EquipmentScreen.tsx:344–347,852–853`). Do not turn this into a universal single percentage or a TP-earning calculation.
- `src/domain/xpBooks.ts:8–11` contains an old restricted dungeon helper. Current independent loot uses `src/domain/dungeonEquipmentLoot.ts:70–88` forD1–4/T1,D5–8/T2,D9–12/T3; dungeon audit agent confirmed this. Keep the current guide tier pools.
- Historical docs and older release notes still mention old names, prices andDungeon1 bottles. Latest runtime catalog and specific newer migrations take precedence. `releaseNotes.ts:20–28` explicitly marks some changes as after build94 was built; do not claim all changes are in that installed binary.
- Latest social reward code says2Protein Bars,1Second Wind,2Grilled Talakitok (`src/domain/socialVisits.ts:16–18`), despite a stale example comment atline25 saying3bars. Use constants/SQL, not that comment. Quest agent/root should cover the new reward sections.
- Respect the user's request not to publish the Tama Power earning calculation. No new earning formula or Protein Bar percentage was added; existing qualitative workout/movement copy remains.

## Verification

- Parsed and verified every exact replacement in sequence against the inspected guide, with no old visible names remaining after replacement.
- Confirmed all 35 art source paths exist.
- Source-only audit: no native build, browser run, purchase, grant, database query or deployment performed.
