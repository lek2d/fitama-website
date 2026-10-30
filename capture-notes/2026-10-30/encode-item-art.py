from pathlib import Path
from PIL import Image
import hashlib,json
base=Path('/Users/fsapanlay/Documents/Codex/2026-10-20/che')
audit=base/'work/website-refresh-2026-10-30';app=audit/'app';site=base/'work/fitama-website/docs';out=site/'assets/guide-items-2026-10-30';out.mkdir(exist_ok=True)
page=site/'guide.html';html=page.read_text();records=[]
for row in json.loads((audit/'item-art-map.json').read_text()):
 src=app/row['app'];im=Image.open(src).convert('RGBA');original=im.size
 im.thumbnail((512,512),Image.Resampling.LANCZOS)
 target=out/Path(row['website']).with_suffix('.webp').name
 im.save(target,'WEBP',lossless=True,method=6,exact=True)
 decoded=Image.open(target).convert('RGBA');assert im.tobytes()==decoded.tobytes()
 replacement=str(target.relative_to(site));count=html.count(row['website']);assert count,(row['id'],row['website'])
 html=html.replace(row['website'],replacement)
 records.append({**row,'output':replacement,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source_size':original,'output_size':im.size,'references':count})
page.write_text(html.replace('Guide updated October 28, 2026','Guide updated October 30, 2026'))
(out/'manifest.json').write_text(json.dumps({'source_commit':'9b785bc6ff4868a5a43be15a358ce98d85973e52','date':'2026-10-30','transform':'Proportional maximum512px; lossless WebP, no redraw','items':records},indent=2)+'\n')
print('Updated',len(records),'item assets;',sum(r['references'] for r in records),'references')
