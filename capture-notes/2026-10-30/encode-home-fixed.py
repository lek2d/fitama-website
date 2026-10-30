from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image,features
import numpy as np
import json,hashlib,math
base=Path('/Users/fsapanlay/Documents/Codex/2026-10-20/che');raw=base/'outputs/Fitama-Home-Fix-2026-10-30';site=base/'work/fitama-website/docs';out=site/'assets/screens-2026-10-30-home-fixed';out.mkdir(exist_ok=True)
names=['home']
def encode(name):
 src=raw/(name+'.png');master=Image.open(src).convert('RGB');assert master.size==(1560,3376)
 rows=[]
 for width,suffix in [(780,'.2x'),(1170,'.3x'),(1560,'')]:
  im=master if width==1560 else master.resize((width,844*width//390),Image.Resampling.LANCZOS)
  for fmt in ['webp','avif']:
   target=out/(name+suffix+'.'+fmt)
   if fmt=='webp': im.save(target,'WEBP',lossless=True,method=6)
   else: im.save(target,'AVIF',quality=94,subsampling='4:4:4',speed=6,max_threads=2,range='full')
   decoded=Image.open(target).convert('RGB');assert decoded.size==im.size
   if fmt=='webp':assert decoded.tobytes()==im.tobytes()
   a=np.asarray(im,dtype=np.float32);b=np.asarray(decoded,dtype=np.float32);mse=float(np.mean((a-b)**2));psnr=20*math.log10(255/math.sqrt(mse)) if mse else None
   if fmt=='avif':assert psnr is None or psnr>=42,(target.name,psnr)
   rows.append({'file':target.name,'width':width,'height':im.height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'psnrDb':round(psnr,3) if psnr else None,'pixelIdentical':mse==0})
 print('ENCODED',name,flush=True)
 return {'name':name,'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'variants':rows}
rows=list(ThreadPoolExecutor(max_workers=3).map(encode,names))
manifest={'date':'2026-10-30','sourceCommit':'9b785bc6ff4868a5a43be15a358ce98d85973e52','capture':'Actual latest app UI with isolated sample state. PNG1560x3376 captured at390x844, deviceScaleFactor4; no upscaling/redraw. Home capture waits for the live pet opacity1 and persistent fallback opacity0, removing the earlier mid-handoff double pose.','encoder':{'Pillow':Image.__version__,'libavif':features.version('avif'),'avifQuality':94,'avifChroma':'4:4:4','webp':'lossless'},'screens':rows}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('ALL',sum(v['bytes'] for r in rows for v in r['variants']),flush=True)
