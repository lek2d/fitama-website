import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {journey} from '../docs/journey-timeline.mjs';

// Read the actual non-interlaced RGBA lawn, including PNG row filters. Sampling
// its alpha catches feet over transparent sky/water without mirroring the clamp.
function readLawn() {
  const file=readFileSync(new URL('../docs/assets/hero-parallax-v2/foreground-extended.png',import.meta.url));
  const width=file.readUInt32BE(16),height=file.readUInt32BE(20),chunks=[];
  assert.deepEqual([...file.subarray(24,29)],[8,6,0,0,0]);
  for(let at=8;at<file.length;){
    const size=file.readUInt32BE(at),type=file.toString('ascii',at+4,at+8);
    if(type==='IDAT')chunks.push(file.subarray(at+8,at+8+size));
    at+=size+12;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,alpha=new Uint8Array(width*height);
  let previous=new Uint8Array(stride),at=0;
  const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[at++],row=new Uint8Array(stride);assert.ok(filter<=4);
    for(let i=0;i<stride;i++){
      const a=i>=4?row[i-4]:0,b=previous[i],c=i>=4?previous[i-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      row[i]=(raw[at++]+predictor)&255;
    }
    for(let x=0;x<width;x++)alpha[y*width+x]=row[x*4+3];
    previous=row;
  }
  return {width,height,alpha};
}
const lawn=readLawn();
const sizes=[[320,640],[375,812],[390,844],[430,932],[699,1024],[700,900],[753,1024],[768,1024],[820,1180],[1009,1366],[1024,1366],[1280,600],[1440,900],[1920,1080],[2560,1440],[3440,600]];
for(const [w,h]of sizes)test(`all three hero eggs touch opaque painted lawn at ${w}x${h}`,()=>{
  const scene=journey(0,w,h),canvasWidth=w*(w<700?2.4:1);
  const scale=canvasWidth/lawn.width,left=(w-canvasWidth)/2,top=h-canvasWidth/2;
  const row=Math.floor((scene.nestBase-top)/scale);
  assert.ok(row>=0&&row<lawn.height);
  for(const [name,x,width]of [['clovie',scene.clovieX,scene.clovieW],['blukie',scene.eggX,scene.eggW],['ignie',scene.ignieX,scene.ignieW]]){
    for(const fraction of [-.2,0,.2]){
      const column=Math.floor((x+fraction*width-left)/scale);
      const alpha=lawn.alpha[row*lawn.width+column];
      assert.ok(alpha>=240,`${name} foot is over transparent foreground: row ${row}, column ${column}, alpha ${alpha}`);
    }
  }
});

test('grounded tablet poses stay attached to the meadow and join the unchanged release smoothly',()=>{
  for(const[w,h]of[[700,900],[753,1024],[820,1180],[1009,1366]]){
    for(let p=0;p<=.24;p+=.005){
      const s=journey(p,w,h);
      assert.ok(Math.abs(s.eggY+s.eggH/2-s.nestBase-s.valleyY)<1e-6);
      assert.equal(s.nestY,s.valleyY);
    }
    for(const p of [.24,.32]){
      const a=journey(p-1e-8,w,h),b=journey(p+1e-8,w,h);
      assert.ok(Math.abs(a.eggY-b.eggY)<.001,'ground correction must not introduce a position jump');
    }
    assert.equal(journey(.32,w,h).eggY,h*.24,'desktop release remains viewport-relative after the meadow exits');
  }
});

test('already grounded phone and desktop hero compositions keep their baseline',()=>{
  for(const[w,h,baseline]of[[390,844,746.9098],[1440,900,777.672],[1920,1080,936.8352],[2560,1440,1253.952]]){
    assert.ok(Math.abs(journey(0,w,h).nestBase-baseline)<1e-6,`${w}x${h}`);
  }
});
