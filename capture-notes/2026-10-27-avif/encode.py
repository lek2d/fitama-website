"""Encode the approved PNG screenshot masters; keep WebP fallbacks unchanged."""
from pathlib import Path
import argparse,hashlib,json,math,time
from PIL import Image,features
import numpy as np
parser=argparse.ArgumentParser()
parser.add_argument('--masters',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--fallback',type=Path,required=True)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
names=['egg-home','home','health-activities','map','battle-before','battle-result','equipment','shop-funded-v1','quests-claimed']
rows=[]
for name in names:
 source=args.masters/f'{name}.png';master=Image.open(source).convert('RGB')
 assert master.size==(1560,3376)
 row={'name':name,'sourcePngSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'variants':[]}
 for width,suffix in [(780,'.2x'),(1170,'.3x'),(1560,'')]:
  im=master if width==1560 else master.resize((width,844*width//390),Image.Resampling.LANCZOS)
  filename=f'{name}{suffix}.avif';f=args.output/filename;t=time.perf_counter()
  im.save(f,format='AVIF',quality=94,subsampling='4:4:4',speed=6,max_threads=4,range='full')
  decoded=Image.open(f).convert('RGB');assert decoded.size==im.size
  a=np.asarray(im).astype(np.float32);b=np.asarray(decoded).astype(np.float32);mse=float(np.mean((a-b)**2));psnr=20*math.log10(255/math.sqrt(mse)) if mse else None
  assert psnr is None or psnr>=42,(filename,psnr)
  fallback=args.fallback/f'{name}{suffix}.webp';originalBytes=fallback.stat().st_size
  variant={'file':filename,'dimensions':list(im.size),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'fallbackFile':fallback.name,'fallbackBytes':originalBytes,'savingPercent':round((1-f.stat().st_size/originalBytes)*100,2),'psnrDb':round(psnr,3) if psnr else None,'meanAbsoluteError':round(float(np.mean(np.abs(a-b))),4),'pixelIdentical':bool(np.array_equal(a,b))}
  row['variants'].append(variant);print(filename,variant['bytes'],variant['savingPercent'],variant['psnrDb'],flush=True)
 rows.append(row)
manifest={'date':'2026-10-27','sourceCommit':'9e2696b8c6c8d5fc94215020ce1063c55c348c51','source':'Same approved native4x PNG screenshot masters from the October27 local sample capture; no recapture or redesign.','encoder':{'Pillow':Image.__version__,'libavif':features.version('avif'),'quality':94,'subsampling':'4:4:4','range':'full','speed':6},'quality':'High-quality lossy AVIF; not pixel-lossless.4:4:4 avoids chroma subsampling; all retained source resolutions. Original lossless WebP fallbacks remain unchanged.','integration':'Native picture/source type=image/avif; original img attributes, responsive candidates and WebPfallbacks retained.','scope':'Nine website screenshot images only. No native app, backend, account, provider, QA or automation changes.','screens':rows}
manifest['totals']={str(width):{'avifBytes':sum(r['variants'][i]['bytes'] for r in rows),'webpBytes':sum(r['variants'][i]['fallbackBytes'] for r in rows)} for i,width in enumerate([780,1170,1560])}
for total in manifest['totals'].values():total['savingPercent']=round((1-total['avifBytes']/total['webpBytes'])*100,2)
(args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['totals'],indent=2),flush=True)
