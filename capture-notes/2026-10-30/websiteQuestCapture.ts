import type {ComponentProps} from 'react';
import type {QuestScreen} from '../src/screens/QuestScreen';
import {FIRST_STEPS} from '../src/domain/firstSteps';
import type {PreviewSession} from './previewSession';

/** Capture-only sample state, rendered by the current production QuestScreen.
 * Install under preview/ only. Enabled solely by ?website-quests=1.
 * No account, Health, server or external-social action is performed by these controls.
 * No quest titles, goal text, reward labels or artwork are re-created here.
 */
export const websiteQuestCaptureEnabled = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('website-quests') === '1';

export function websiteQuestCaptureProps(session: PreviewSession): Partial<ComponentProps<typeof QuestScreen>> {
  if (!websiteQuestCaptureEnabled()) return {};
  return {
    actionScopeKey: 'website-quest-sample-only',
    // This sample has finished its one-time introduction. All First Steps are unclaimed.
    questProgress: {...session.questProgress, keepItGoingClaimed: true},
    currentTp: session.dailyTp,
    helpingHand: {completed: 0, claimed: false},
    referral: {state: {
      code: 'DEMO2222', link: 'https://fitama.app/r/DEMO2222',
      invited: 0, hatched: 0, weeklyGiftsLeft: 5, canEnterCode: false,
      referredBy: null, invites: [],
    }},
    socials: {
      state: {claimed: [], bonusClaimedAt: null}, visited: [], busyId: null, error: null,
      visit: async () => false, claim: async () => false,
    },
    firstSteps: {
      state: FIRST_STEPS.map(({id}) => ({id, done: false, claimedAt: null})),
      busyId: null, error: null, claim: async () => false,
    },
  };
}
