/** Capture-only fixture adapter. Installed beside dungeonPreview.ts by the companion patch script.
 * It feeds the unmodified production shared-battle renderer with one member, which renders Solo.
 * No network requests, live rewards, new UI or app gameplay changes are involved. */
import {applyPreviewDungeonHit,getPreviewGroupSnapshot,type PreviewDungeonBattle} from './dungeonPreview.ts';
import {splitAttackCost} from '../src/domain/splitAttacks.ts';
import {getDungeonMemberXpReward} from '../src/domain/dungeonMemberRewards.ts';
import {rollIndependentDungeonLoot} from '../src/domain/dungeonEquipmentLoot.ts';
import type {DungeonReward} from '../src/domain/dungeonDefinitions.ts';
import type {PetVariant} from '../src/domain/gameRules.ts';
import type {DungeonBattleSnapshot} from '../src/services/social/types.ts';

export function getWebsiteCaptureDungeonSnapshot(
  original: PreviewDungeonBattle, petName: string, variant: PetVariant,
  cleared: boolean, earnedTp: number | null = null,
): DungeonBattleSnapshot {
  if (original.partySize !== 1 || original.durationDays !== 1) {
    throw new Error('Website capture adapter expects a one-player, one-day example.');
  }
  let battle = original;
  // A result fixture must represent an earned victory, not a zero-damage reward.
  // Replay legal split hits through the existing fixture helper; a lethal third hit can overkill.
  if (cleared) {
    for (let n=0; battle.currentHp>0 && n<3; n++) {
      const cost=splitAttackCost(battle.dailyMaximumTp,battle.dailySpentTp);
      if(cost<=0)break;
      battle=applyPreviewDungeonHit(battle,cost,new Date(battle.startedAt));
    }
    if(battle.currentHp>0)throw new Error('This sample cannot win within its one-day allowance.');
  }
  const snapshot: DungeonBattleSnapshot = {
    ...getPreviewGroupSnapshot(battle,petName,variant,cleared),
    attackSplitPolicy:1,independentLootVersion:1,rewardPolicyVersion:2,
    powerBottleUnlocked:false,
  };
  snapshot.members=snapshot.members.map(member=>({...member,itemsUsed:[]}));
  const spent=battle.dailySpentTp, maximumTp=battle.dailyMaximumTp;
  const readyTp=snapshot.status==='active'
    ? Math.max(0,Math.min(earnedTp??maximumTp,maximumTp)-spent) : 0;
  snapshot.tpBalanceOwnerId='preview-only';
  snapshot.tpBalance={policyVersion:1,generation:0,dayStartedAt:snapshot.gameDayStartedAt,
    expiresAt:snapshot.expiresAt,observedAt:new Date().toISOString(),battleVersion:snapshot.version,
    maximumTp,allowanceRemaining:Math.max(0,maximumTp-spent),cycle:0,readyTp,restoredTp:0,reserveTp:0};
  if(snapshot.status==='cleared'){
    const member=snapshot.members.find(entry=>entry.userId==='preview-only')!;
    const xp=getDungeonMemberXpReward(snapshot,member);
    // Fixed sample random draws produce one possible current-policy item outcome (a Tama Coin
    // in D1), not a promise of a drop. Use the actual domain pool/chance logic, never an old bottle.
    const loot=rollIndependentDungeonLoot(snapshot.dungeonId,snapshot.durationDays,0,1,
      {consumable:0.1,consumableItem:0.5,tier1:0.99,tier2:0.99,tier3:0.99,tier3Item:0.5});
    snapshot.memberRewardBundle=[{type:'xp',key:null,amount:xp,rarity:null},...loot] as DungeonReward[];
  }
  return snapshot;
}
