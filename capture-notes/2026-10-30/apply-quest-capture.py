#!/usr/bin/env python3
"""Apply only to a disposable app snapshot used for website screenshot capture."""
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('Usage: python3 apply-quest-capture.py /absolute/path/to/disposable/app')
app = Path(sys.argv[1]).resolve()
source = app / 'preview/PreviewApp.tsx'
fixture = Path(__file__).with_name('websiteQuestCapture.ts').read_text()
text = source.read_text()

replacements = [
    ("import { QuestScreen } from '../src/screens/QuestScreen';",
     "import { QuestScreen } from '../src/screens/QuestScreen';\nimport {websiteQuestCaptureEnabled, websiteQuestCaptureProps} from './websiteQuestCapture';"),
    ("const [tab, setTab] = useState<MainTab>(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('profile') === '1' ? 'profile' : initialDungeon.scene === 'map' ? 'map' : 'fitama');",
     "const [tab, setTab] = useState<MainTab>(websiteQuestCaptureEnabled() ? 'quest' : typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('profile') === '1' ? 'profile' : initialDungeon.scene === 'map' ? 'map' : 'fitama');"),
    ("""          {!hatchPreviewOpen && !riveOpen && tab === 'quest' ? <QuestScreen
            {...common}
            questProgress={session.questProgress}
            hatchTp={session.dailyTp}
            trainingOnboardingComplete
            isEggStage={false}
            onClaimQuest={claim}
            onOpenTrainingCamp={previewOnly}
          /> : null}""",
     """          {!hatchPreviewOpen && !riveOpen && tab === 'quest' ? <QuestScreen
            {...common}
            questProgress={session.questProgress}
            hatchTp={session.dailyTp}
            trainingOnboardingComplete
            isEggStage={false}
            onClaimQuest={claim}
            onOpenTrainingCamp={previewOnly}
            {...websiteQuestCaptureProps(session)}
          /> : null}"""),
]
for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f'Expected one capture anchor; found {text.count(old)}: {old[:90]}')
    text = text.replace(old, new)
# Nothing is written until every anchor is checked.
(app / 'preview/websiteQuestCapture.ts').write_text(fixture)
source.write_text(text)
print('Installed query-gated quest fixture in disposable preview only.')
