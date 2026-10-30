# Capture current Quest UI

The current `preview/PreviewApp.tsx:473–483` renders the shared `QuestScreen` but omits `currentTp`, `helpingHand`, `referral`, `socials` and `firstSteps` props. Production `src/screens/QuestScreen.tsx:40–61,186–197` shows the new cards only when those controls/state are supplied. The separate `src/dev/FirstStepsPreview.tsx` and `SocialsQuestPreview.tsx` are isolated developer previews, not the full production Quest layout, so do not substitute their screenshots for the full screen.

## Minimal setup

1. Install the provided fixture **only in the disposable capture snapshot**:
   ```sh
   python3 work/website-refresh-2026-10-30/apply-quest-capture.py /Users/fsapanlay/Documents/Codex/2026-10-20/che/work/website-refresh-2026-10-30/app
   ```
2. Use the existing preview Vite/server workflow and navigate to the normal preview entry with `?website-quests=1&variant=blue` (for example `/preview.html?website-quests=1&variant=blue`, matching whatever preview HTML root is configured).
3. The fixture selects the Quest tab directly and passes sample states to actual `QuestScreen`. At the top, production order is Invite Friends → Daily Check-In → Visit Fitama’s Socials → Solo Debut / other First Steps → recurring quests. Keep It Going is marked already claimed in this sample to avoid showing a retired onboarding step among the current cards.
4. For the First Steps screenshot, scroll the actual Quest list until Solo Debut and Better Together appear. Do not move DOM nodes or flatten production ordering. For Weekly, click the real Weekly tab; it displays current 3,220 TP Weekly Progress, Weekly Raid and Helping Hand.
5. Screenshots remain sample progress. Existing site disclosure is appropriate. The new cards are unclaimed, Helping Hand shows 0/5, and social visits show 0/5. Titles, requirements, item/reward labels and artwork come from current shared components/domain catalogs.

## Files and scope

- `websiteQuestCapture.ts`: copy goes under `preview/`. Query-gated props factory; no UI markup and no server or Health calls. FIRST_STEPS IDs come from the real catalog. Social/First Steps action handlers are deliberately inert (`false`) for capture.
- `apply-quest-capture.py`: checks all three unique anchors before any write, copies the adapter, imports it, adds the query-gated initial tab, then spreads capture props only on the QuestScreen instance. Not idempotent: a second application fails safely on anchors. Does not touch production `src/` or backend.
- Adapter was typechecked using an in-memory virtual file against actual `QuestScreen` prop types: zero adapter diagnostics. All three patch replacements dry-applied in memory. Neither script has been applied to shared app source as of this handoff.

## Limits

Do not use the capture fixture to exercise real reward claims. Recurring quest callbacks remain the existing local preview behavior; Social/First Steps actions are inert. The Referral component can show a sample invite popup if tapped; do not share its `DEMO2222` sample code. A website capture should use its visible card only.

The outer preview session has additional stale sample behavior (for example `closeDungeonPreview` assumes a D1 win grants a bottle); this adapter does not correct unrelated preview code. Root owns dungeon captures.
