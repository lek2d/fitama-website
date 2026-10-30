#!/usr/bin/env python3
"""Prepare/run the isolated capture adapter. Dry-run by default; --apply writes only the snapshot.
Never apply this to the app's working tree or commit the adapter as a gameplay change.
"""
from pathlib import Path
import argparse
p=argparse.ArgumentParser()
p.add_argument('--apply', action='store_true')
a=p.parse_args()
base=Path(__file__).resolve().parent
app=base/'app'
target=app/'preview/PreviewApp.tsx'
old=target.read_text()
changes=[
 ('import {splitAttackCost} from \'../src/domain/splitAttacks\';',
  'import {splitAttackCost} from \'../src/domain/splitAttacks\';\nimport {getWebsiteCaptureDungeonSnapshot} from \'./websiteCaptureDungeon\';'),
 (': dungeonPreview.partySize > 1 ? <DungeonBattleScreen mode="group"',
  ': (dungeonPreview.partySize > 1 || splitAttacksPreview) ? <DungeonBattleScreen mode="group"'),
 ('snapshot={splitPreviewSnapshot(getPreviewGroupSnapshot(dungeonPreview, session.petName, session.variant, !previewActiveBattle))}',
  'snapshot={splitAttacksPreview && dungeonPreview.partySize === 1\n                  ? getWebsiteCaptureDungeonSnapshot(dungeonPreview, session.petName, session.variant, !previewActiveBattle, splitEarnedTp)\n                  : splitPreviewSnapshot(getPreviewGroupSnapshot(dungeonPreview, session.petName, session.variant, !previewActiveBattle))}'),
]
new=old
for before,after in changes:
 if new.count(before)!=1:raise SystemExit(f'Expected one capture anchor, found {new.count(before)}: {before[:90]}')
 new=new.replace(before,after)
print('Three PreviewApp anchors verified; preserves the production renderer and default previews.')
print('Capture URLs: ?scene=battle&dungeon=dungeon-1&variant=blue&split=1&tp=250')
print('              ?scene=win&dungeon=dungeon-1&variant=blue&split=1')
if a.apply:
 backup=base/'PreviewApp.before-dungeon-capture.tsx'
 if backup.exists():raise SystemExit('Backup already exists; refusing to overwrite.')
 backup.write_text(old)
 (app/'preview/websiteCaptureDungeon.ts').write_text((base/'websiteCaptureDungeon.ts').read_text())
 target.write_text(new)
 print('Applied only to the isolated October 30 source snapshot. Rebuild the local capture bundle.')
else:print('Dry-run only. No app or shared source changed. Pass --apply to install.')
