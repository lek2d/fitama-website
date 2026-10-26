from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,sys,subprocess

root=Path(__file__).resolve().parents[2]
base=sys.argv[1].rstrip('/')+'/'
output=Path(sys.argv[2])
class Head(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.tags={};self.canonical=[]
 def handle_starttag(self,tag,attributes):
  a=dict(attributes)
  if tag=='head':self.inside=True
  if not self.inside:return
  if tag=='meta':
   key=a.get('property',a.get('name',''))
   if key:self.tags.setdefault(key,[]).append(a.get('content',''))
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
 def handle_endtag(self,tag):
  if tag=='head':self.inside=False

def get(path,ua):
 request=Request(base+path,headers={'User-Agent':ua,'Cache-Control':'no-cache'})
 with urlopen(request,timeout=30) as response:return response.status,response.headers.get_content_type(),response.read()

pages={'index.html':'journey.html','journey.html':'journey.html','guide.html':'guide.html','contact.html':'contact.html','privacy/':'privacy/'}
image='https://fitama.app/assets/fitama-share-cover-v1.jpg'
required=['og:title','og:type','og:url','og:image','og:description','og:site_name','og:image:secure_url','og:image:type','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']
checks=[]
def check_page(item):
 path,canonical=item
 status,mime,data=get(path,'FiTama share metadata verification')
 assert status==200 and mime=='text/html',(path,status,mime)
 relative='docs/'+('privacy/index.html' if path=='privacy/' else path)
 expected=subprocess.check_output(['git','show','HEAD:'+relative],cwd=root)
 assert data==expected,path+' differs from committed release'
 text=data.decode();head=Head();head.feed(text)
 assert all(len(head.tags.get(key,[]))==1 and head.tags[key][0] for key in required),path
 assert head.canonical==['https://fitama.app/'+canonical],path
 assert head.tags['og:url']==head.canonical
 for key in ['og:image','og:image:secure_url','twitter:image']:assert head.tags[key]==[image],path
 assert head.tags['og:type']==['website'] and head.tags['twitter:card']==['summary_large_image'],path
 assert head.tags['og:image:width']==['1200'] and head.tags['og:image:height']==['630'],path
 assert head.tags['og:image:type']==['image/jpeg'],path
 if path=='index.html':assert text.index('property="og:image"')<text.index('http-equiv="refresh"')<text.index("location.replace('journey.html'+location.search+location.hash)")
 return {'page':path,'status':status,'mime':mime,'static_metadata':True,'exact_committed_release_bytes':True,'canonical':head.canonical[0]}
with ThreadPoolExecutor(max_workers=5) as pool:checks=list(pool.map(check_page,pages.items()))
local_image=subprocess.check_output(['git','show','HEAD:docs/assets/fitama-share-cover-v1.jpg'],cwd=root)
for ua in ['facebookexternalhit/1.1','Twitterbot/1.0']:
 for path in ['', 'journey.html']:
  status,mime,data=get(path,ua)
  head=Head();head.feed(data.decode())
  assert status==200 and head.tags.get('og:image')==[image],(ua,path)
  checks.append({'crawler_ua':ua,'page':path or '/','status':status,'image_discoverable_without_js':True})
 status,mime,data=get('assets/fitama-share-cover-v1.jpg',ua)
 assert status==200 and mime=='image/jpeg' and data==local_image,ua
 checks.append({'crawler_ua':ua,'image_status':status,'image_mime':mime,'image_bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'matches_publisher':True})
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'base':base,'checks':checks,'actual_social_platform_render_tested':False},indent=2))
print(json.dumps({'checks_passed':len(checks),'pages':len(pages),'cover_bytes':len(local_image),'evidence':str(output)}))
