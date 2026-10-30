# Capture-only battle adapter

Problem: `preview/PreviewApp.tsx:635–649` sends a one-member preview into the legacy `mode="solo"` prop path, where a hard-coded first-D1 Power Bottle preview is appended. That path cannot display `attackSplitPolicy` and uses generic rather than per-member reward data.

The actual confirmed numbered battle component accepts a shared snapshot with `mode="group"` even when the party has one member. `src/screens/dungeonBattleContract.ts:8–10` derives the visible **Solo** label for a one-member numbered battle, so this preserves the requested Solo screenshot composition. Production `MapScreen.tsx:1001–1050` uses the shared renderer and snapshot. This adapter changes fixture routing/data only; it does not modify any screen/component or drawing.

Prepared, not installed:

- `websiteCaptureDungeon.ts`: accepts a one-player/one-day fixture, adds the split policy and production TP-balance shape. For a victory fixture, runs the existing `splitAttackCost` + `applyPreviewDungeonHit` helpers to create three legal attacks. Calculates XP with `getDungeonMemberXpReward` and a deterministic possible loot outcome with `rollIndependentDungeonLoot`. No Power Bottle unlock.
- `install-capture-dungeon-adapter.py`: dry-run by default; `--apply` adds adapter to the isolated app snapshot and patches three exact anchors in `preview/PreviewApp.tsx`. Creates backup `PreviewApp.before-dungeon-capture.tsx`. No native app repository, production UI, server or database edits.
- `capture-dungeon-proof.mjs` + `capture-dungeon-proof-adapter.ts`: executed against source models without modifying the app snapshot.

To use: run the patch script with `--apply`, rebuild the existing local capture bundle, then use:

- Battle: `?scene=battle&dungeon=dungeon-1&variant=blue&split=1&tp=250`
- Result: `?scene=win&dungeon=dungeon-1&variant=blue&split=1`

Expected: Solo, D1 monster300HP, ready250TP, next attack123TP, two ready sword markers and one waiting; cleared Solo result has three attacks totaling300damage/370spentTP,96.5XP plus one Tama Coin from the fixed sample roll, and no Power Bottle. The reward outcome is one valid possibility, not a promised drop. Website screenshots remain sample data, and marker policy availability remains version/run dependent.

Proof passed: both snapshots validate with the actual dungeon-definition validator; actual shared view model labels them Solo; active markers = ready/ready/waiting; victory HP0, three legal hits; final model reward keys exactly`xp,tama-coin`. Node only emitted its existing typeless-package warning. No browser run performed by this agent.
