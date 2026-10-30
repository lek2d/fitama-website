# Progression and quest copy audit — October 30, 2026

Compared publisher `work/fitama-website/docs/guide.html` and `journey.html` against the read-only app snapshot at commit `9b785bc6ff4868a5a43be15a358ce98d85973e52` (`work/website-refresh-2026-10-30/app`). This is a source audit, not verification of a deployed backend migration or an installed binary.

## Deliverable and application order

`progress-replacements.json` contains 18 exact, unique `{file, old, new}` replacements for `docs/guide.html`. The source HTML has not been edited. Each old string matched exactly once; sequential application to an in-memory copy succeeds. Two new articles (`first-steps`, `social-visits`) bring the topic count from 41 to 43. Root should update the initial status count and Guide updated date, then apply item-wide display-name replacements after these replacements so their anchors still match. The new paragraphs already use Heart Potion, Second Wind and Tama Coins. No CSS or JavaScript change is needed for the new articles; they use the existing searchable article and guide-table structures.

## Verified changes

| Website evidence | Latest app evidence | Required correction |
| --- | --- | --- |
| `docs/guide.html:34`: Weekly Progress is 2,500 TP, no Helping Hand | `src/domain/quests.ts:94–108`; `supabase/migrations/202610290013_weekly_quests_helping_hand.sql:1–7,34–40` | Weekly Progress: 3,220 TP and 1,000 XP. Add Helping Hand: five NPC bonus quests in a game week for one Second Wind. Fixed quests count after reward claim; progressive ones after reward settlement/package; Mumu excluded. |
| `docs/guide.html:34`: Keep It Going phrased as 320 TP without current-day qualification | `src/domain/quests.ts:49–54`; `src/domain/gameRules.ts:189–198` | Clarify 320 TP in the current game day, one-time claim and daily progress reset until claimed. Training Camp currently awards 50 XP. |
| No First Steps guide | `src/domain/firstSteps.ts:3–12,29–34`; `src/screens/QuestScreen.tsx:192–196`; `supabase/migrations/202610290015_first_steps_quests.sql:3–15,75–100,121–139` | Add five once-per-account quests: Solo Debut → Power Bottle; Better Together, Bring a Buddy, Snack Time, Good Neighbor → two Tama Coins each. Quest Daily after Training; explicit claim; claimed cards disappear after next reset. Eligible past progress may count. First Steps persists across game resets. |
| `docs/guide.html:51` Power Bottle still says first eligible Dungeon 1 win | `supabase/migrations/202610290015_first_steps_quests.sql:13–16,121–155` | **Items audit owns this replacement.** Current source unlocks it by claiming Solo Debut. Existing earned bottle retained. No duplicate D1 reward promise. |
| No Visit Fitama’s Socials guide | `src/domain/socialVisits.ts:4–21,42–50`; `src/components/socials/SocialsQuest.tsx:107–127`; `src/screens/QuestScreen.tsx:192–193` | Add once-account visit quest: Facebook, X, Instagram, TikTok, YouTube; open from in-app quest and return to claim two coins per page. All five claimed unlock bonus: two Protein Bars, one Second Wind, two Grilled Talakitok. No follow/like requirement. Card remains until reset after final bonus; does not recur daily. |
| `docs/guide.html:27`: first hatch has no Sign-up bonus information | `src/domain/referral.ts:7,20–21`; `supabase/migrations/202610290014_welcome_gift.sql:1–11,79–91` | Add eligible new-player first-hatch Mail parcel: one Mystery Package, two Treats and two Protein Bars. No friend code needed; invite gift separate. Once per Apple/Google sign-in; prior hatches/resets/recreated sign-ins do not receive another. |
| `docs/guide.html:40`: invite field accepts username | `src/domain/referral.ts:118–135`; `src/components/referral/FriendCodeStep.tsx:84–90` | Friend code field accepts friend codes only. Opened invite link supported. Separate Friend Search can still accept username; leave its article alone. |
| `docs/guide.html:41`: Mail Parcel list omits Sign-up bonus | `src/domain/referral.ts:20–27,69–76` | Add Sign-up bonus to parcel examples. |
| `docs/guide.html:52,53,66`: cancellation consumes bonus day | `src/domain/npcBonusQuestDay.ts:23–32`; `supabase/migrations/202610290012_bonus_quest_cancel_frees_day.sql` | Cancelling frees the daily slot. Claimed/settled rewarded quest keeps it used until 4 AM. One non-Mumu NPC active at a time. Mumu separate. |
| `docs/guide.html:53`: Kabutehan 136 XP | `src/domain/npcBonusQuests.ts:4–15` | Newly accepted Heavy Lifting: 250 TP → 100 XP and one Treat. Previous accepted policy can retain 136 XP; existing version caveat remains. |
| `docs/guide.html:66`: one coin/checkpoint | `src/domain/progressiveNpcQuests.ts:13–29,40–46` | Estranghero, Monkey, Coo Coo, Oso: two coins/checkpoint, up to six at three checkpoints. Goals unchanged from existing guide. Mumu unaffected except display name Second Wind. |
| No early level progression explanation | `src/domain/gameRules.ts:156–174`; `supabase/migrations/202610300001_level_curve_v2.sql:1–16` | Add short care subsection: 200 total XP level 2, 400 level 3, 850 level 4; existing player levels retained on updated progression. No XP formula displayed. |

## Verified unchanged / preserved

- Daily goals remain 300/650/1,000 TP, with 48/84/160 XP (`src/domain/quests.ts:64–89`). Weekly Raid remains three completed dungeon-days, item renamed Heart Potion (`:100–102`). Dungeon-days vs wins detail belongs to dungeon agent.
- Daily check-in track and streak handling remain accurate: rewards/XP in `src/domain/dailyCheckIn.ts:2–24`; Heart Potion label only is new.
- NPC unlock levels remain 1/2/3/4/6/8/10/13 (`src/domain/npcAccess.ts:1–4`). No new unlock-level claims needed.
- Progressive thresholds, XP range 45–325, Mumu window/cooldown and gear reduction semantics were preserved; item display name is handled separately.
- Invite rewards and ranking prize quantities remain accurate; only renamed items change (`src/domain/referral.ts:16–21`; `src/domain/rankingPrizes.ts:13–23`).
- Journey’s movement/workout, hatch threshold, general quests/dungeon language remains accurate. No Journey text replacement proposed.
- No base Tama Power earning calculation, conversion factor or earning cap formula was introduced. Existing workouts/movement wording stays.
- No account/social interaction, backend mutation, browser session, app source edit or shared HTML edit performed.

## Screenshot implications for root

- Capture latest Quest Daily: new order is bonus quests → Invite Friends → Daily Check-In → Visit Fitama’s Socials → onboarding/First Steps → recurring quests (`src/screens/QuestScreen.tsx:125–130,186–197`). Preview harness must actually supply `socials` and `firstSteps` controls, otherwise new UI will be absent despite fresh capture.
- Weekly screenshot should show 3,220 TP and Helping Hand. Old 2,500 TP screen is stale.
- New item names/art need fresh Inventory, Shop, item detail and rewards screenshots (items agent owns exact names).
- Any snapshot showing level 2 after only introductory Training is stale under the current XP curve. Training now gives 50 XP and level 2 begins at 200 total XP.
- Guide quest screenshot alt text currently mentions a claimed Warm Up; update it if the new capture instead shows First Steps/social cards at the top.

## Verification limitation

Release notes distinguish shipped build 94 from later source changes, and several SQL migrations are capability gated. This audit proves source behavior at the pinned commit, not universal availability in every installed version. Preserve Guide’s version and accepted-card caveat. Root should not claim backend deployment based on this audit alone.
