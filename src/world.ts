// The same atlas drives terrain, traversal, generation, scenery and the M map.
export type Point={x:number;y:number};
export type Region={id:string;name:string;x:number;y:number;w:number;h:number;color:string;forest:'pine'|'birch'|'snow'|'gold';density:number};
export type Passage={id:string;name:string;kind:'bridge'|'rockfall';x:number;y:number;radius:number;cost:number;open:boolean};
export type Landmark={id:string;name:string;kind:'shop'|'sale'|'camp'|'lookout'|'passage';x:number;y:number;hidden?:boolean};
export const LEGACY_WORLD={w:4600,h:3700};
export const REGIONS:Region[]=[
 {id:'cedro',name:'Vale do Cedro',x:0,y:0,w:4600,h:4000,color:'#536b4a',forest:'pine',density:32},
 {id:'betulas',name:'Bosque das Bétulas',x:4600,y:0,w:4400,h:7000,color:'#89935e',forest:'birch',density:42},
 {id:'ardosia',name:'Escarpas de Ardósia',x:9000,y:0,w:6000,h:7000,color:'#728475',forest:'pine',density:30},
 {id:'branca',name:'Cordilheira Branca',x:15000,y:0,w:8040,h:9000,color:'#b9c9bf',forest:'snow',density:22},
 {id:'campos',name:'Campos do Sul',x:0,y:4000,w:4600,h:7800,color:'#879263',forest:'birch',density:16},
 {id:'profundos',name:'Pinhais Profundos',x:4600,y:7000,w:10400,h:4800,color:'#4f7158',forest:'pine',density:54},
 {id:'varzea',name:'Várzea Longa',x:0,y:11800,w:10000,h:6632,color:'#527c6c',forest:'pine',density:25},
 {id:'vento',name:'Chapada dos Ventos',x:10000,y:11800,w:5000,h:6632,color:'#9b9870',forest:'birch',density:13},
 {id:'ambar',name:'Planalto do Âmbar',x:15000,y:9000,w:8040,h:9432,color:'#9b8651',forest:'gold',density:33},
];
export const WORLD={w:Math.max(...REGIONS.map(r=>r.x+r.w)),h:Math.max(...REGIONS.map(r=>r.y+r.h))};
export const LAND={x:1090,y:1860,w:620,h:470},MILL={x:1660,y:2170},BUYER={x:770,y:2360,w:190,h:160},SHOP={x:680,y:1820},HARDWARE={x:3240,y:2570},GATE={x:2830,y:1160},SECRET={x:3800,y:1620};
export const CHUNK=768,EXPLORE=768;
export const OLD_ROOMS={vale:{x:5400,y:1900},east:{x:6600,y:1900}};
export const ROOMS={vale:{x:WORLD.w+2000,y:1900},east:{x:WORLD.w+3200,y:1900}};
const points=(a:number[][]):Point[]=>a.map(([x,y])=>({x,y}));
export const ROAD:Point[][]=[
 points([[350,2010],[930,2010],[1130,2360],[2150,2390],[2540,2240],[3000,2470],[3410,2700]]),
 points([[2140,2390],[2080,1990],[2360,1600],[2830,1500],[2830,1020],[3100,640]]),
 points([[930,2010],[1000,1540],[1280,1240],[1520,810]]),points([[3000,2470],[3550,2230],[3730,1870]]),
 points([[3410,2700],[4400,3500],[5700,4100],[7100,3600],[8050,4400],[8600,6300],[9250,6900],[10200,7700],[12400,8150],[14500,7700],[15100,7800]]),
 points([[1130,2360],[1300,3900],[900,5200],[1350,6800],[2550,6800],[4050,7400],[6000,8000],[7900,7900],[10200,7700]]),
 points([[1350,6800],[1100,9100],[1600,10900],[1250,13500],[2500,13500],[4300,14000],[7000,13100],[9600,14000],[12400,15300],[14300,15700],[14700,15000]]),
 points([[4300,14000],[4500,16200],[7300,17300],[10600,17400],[13600,16800]]),
 points([[7100,3600],[6500,2100],[7000,850]]),points([[6000,8000],[6700,10300],[8800,10900],[11100,10500],[13100,9600],[14500,7700]]),
 points([[10000,4800],[11600,3900],[12600,2000],[13900,1550]]),
 points([[17200,5000],[19200,3900],[21000,2100],[22100,3000]]),points([[19200,3900],[19600,6200],[21800,6100]]),
 points([[16900,12900],[19000,11600],[21600,11200],[22200,13700],[20600,16500],[17700,17100],[16600,15100],[16900,12900]]),
];
export const PLATEAUS=[
 {id:'ardosia',x:9300,y:300,w:5400,h:5300,height:280,ramp:points([[8600,6300],[9300,5700],[10000,4800]])},
 {id:'branca',x:15800,y:200,w:7040,h:6800,height:620,ramp:points([[15100,7800],[15700,6900],[16300,6100],[17200,5000]])},
 {id:'ambar',x:16000,y:9900,w:6700,h:8032,height:430,ramp:points([[14700,15000],[15500,14400],[16300,13700],[16900,12900]])},
];
// Round the joins before sharing the path with the road mesh and the height field.
for(const p of PLATEAUS){const source=p.ramp,rounded:Point[]=[source[0]];for(let i=1;i<source.length-1;i++){const a=source[i-1],b=source[i],c=source[i+1],u={x:b.x+(a.x-b.x)*.18,y:b.y+(a.y-b.y)*.18},v={x:b.x+(c.x-b.x)*.18,y:b.y+(c.y-b.y)*.18};rounded.push(u);for(let n=1;n<=8;n++){const t=n/8;rounded.push({x:(1-t)**2*u.x+2*(1-t)*t*b.x+t*t*v.x,y:(1-t)**2*u.y+2*(1-t)*t*b.y+t*t*v.y});}}rounded.push(source.at(-1)!);p.ramp=rounded;ROAD.push(rounded);}
export function riverX(y:number){return 2420+Math.sin(y/410)*140+Math.sin(y/180)*35;}
export const PASSAGES:Passage[]=[
 {id:'old-bridge',name:'Ponte Velha',kind:'bridge',x:2420,y:2290,radius:150,cost:0,open:true},
 {id:'south-bridge',name:'Ponte dos Campos',kind:'bridge',x:riverX(6800),y:6800,radius:125,cost:6,open:false},
 {id:'marsh-bridge',name:'Travessia da Várzea',kind:'bridge',x:riverX(13500),y:13500,radius:125,cost:8,open:false},
 {id:'snow-slide',name:'Desmoronamento da Cordilheira',kind:'rockfall',x:15320,y:7470,radius:210,cost:0,open:false},
 {id:'amber-crossing',name:'Passarela do Planalto',kind:'bridge',x:15100,y:14700,radius:190,cost:10,open:false},
];
export const LANDMARKS:Landmark[]=[
 {id:'shop-vale',name:'Armazém do Vale',kind:'shop',...SHOP},{id:'shop-east',name:'Armazém Leste',kind:'shop',...HARDWARE},
 {id:'buyer',name:'Pátio da Madeira',kind:'sale',...BUYER},
 {id:'birch-camp',name:'Acampamento das Bétulas',kind:'camp',x:6900,y:2050},
 {id:'slate-view',name:'Mirante de Ardósia',kind:'lookout',x:12400,y:1950},
 {id:'deep-camp',name:'Abrigo dos Pinhais',kind:'camp',x:8790,y:10600},
 {id:'snow-view',name:'Estação do Norte',kind:'lookout',x:21200,y:2130,hidden:true},
 {id:'amber-ruins',name:'Ruínas do Planalto',kind:'lookout',x:21100,y:16200,hidden:true},
 ...PASSAGES.map(p=>({id:p.id,name:p.name,kind:'passage' as const,x:p.x,y:p.y})),
];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function segment(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(length*length||1),0,1);return{distance:Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t),t,length};}
export function roadDistance(p:Point){let d=Infinity;for(const road of ROAD)for(let i=1;i<road.length;i++)d=Math.min(d,segment(p,road[i-1],road[i]).distance);return d;}
export function regionAt(p:Point){const x=p.x+Math.sin(p.y/870)*110+Math.sin(p.y/310)*45,y=p.y+Math.sin(p.x/1300)*120;return REGIONS.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)??REGIONS.find(r=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h)??REGIONS[5];}
const smooth=(t:number)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const rampData=PLATEAUS.map(p=>{let total=0;const segments=p.ramp.slice(1).map((b,i)=>{const a=p.ramp[i],length=Math.hypot(b.x-a.x,b.y-a.y),start=total;total+=length;return{a,b,length,start};});return{p,segments,total,minX:Math.min(p.x,...p.ramp.map(v=>v.x))-400,minY:Math.min(p.y,...p.ramp.map(v=>v.y))-400,maxX:p.x+p.w+400,maxY:Math.max(p.y+p.h,...p.ramp.map(v=>v.y))+400};});
export const TERRAIN_STEP=32;
const heightCache=new Map<number,number>();
function vertexHeight(x:number,y:number){const key=(x/TERRAIN_STEP+1024)*4096+y/TERRAIN_STEP+1024,cached=heightCache.get(key);if(cached!==undefined)return cached;let h=0;
 for(const {p,segments,total,minX,minY,maxX,maxY} of rampData){if(x<minX||x>maxX||y<minY||y>maxY)continue;
  const nx=(x-p.x-p.w/2)/(p.w/2),ny=(y-p.y-p.h/2)/(p.h/2),edge=1+Math.sin(x/670)*.08+Math.sin(y/540)*.06+Math.sin((x+y)/310)*.025-Math.abs(nx)**3-Math.abs(ny)**3;
  // A continuous rocky apron replaces vertical jumps; it remains too steep to drive up.
  let level=p.height*smooth((edge+.035)/.07),near=Infinity,progress=0;
  for(const s of segments){const q=segment({x,y},s.a,s.b);if(q.distance<near){near=q.distance;progress=(s.start+q.t*s.length)/total;}}
  if(near<310){const roadHeight=p.height*smooth(progress),blend=1-smooth((near-180)/130);level+=(roadHeight-level)*blend;}
  h=Math.max(h,level);
 }if(heightCache.size>120000)heightCache.clear();heightCache.set(key,h);return h;}
// Same vertices AND triangle diagonal as TerrainView. Physics and raycasting agree.
export function heightAt(p:Point){const x=Math.floor(p.x/TERRAIN_STEP)*TERRAIN_STEP,y=Math.floor(p.y/TERRAIN_STEP)*TERRAIN_STEP,u=(p.x-x)/TERRAIN_STEP,v=(p.y-y)/TERRAIN_STEP,a=vertexHeight(x,y),b=vertexHeight(x+TERRAIN_STEP,y),c=vertexHeight(x,y+TERRAIN_STEP);return u+v<=1?a+(b-a)*u+(c-a)*v:vertexHeight(x+TERRAIN_STEP,y+TERRAIN_STEP)*(u+v-1)+b*(1-v)+c*(1-u);}
const regionColors=REGIONS.map(r=>r.color.match(/\w\w/g)!.map(v=>parseInt(v,16)));
export function regionWeights(p:Point){const x=p.x+Math.sin(p.y/870)*110+Math.sin(p.y/310)*45,y=p.y+Math.sin(p.x/1300)*120;return REGIONS.map(r=>1-smooth(Math.hypot(Math.max(r.x-x,0,x-r.x-r.w),Math.max(r.y-y,0,y-r.y-r.h))/680));}
export function groundColor(p:Point){const weights=regionWeights(p),total=weights.reduce((a,b)=>a+b,0)||1,color=[0,0,0];for(let i=0;i<weights.length;i++)for(let j=0;j<3;j++)color[j]+=regionColors[i][j]*weights[i]/total;return color;}
function forestAt(p:Point,choice:number){const weights=regionWeights(p),total=weights.reduce((a,b)=>a+b,0);let at=choice*total;for(let i=0;i<weights.length;i++){at-=weights[i];if(at<=0)return REGIONS[i].forest;}return regionAt(p).forest;}
export function biomeAt(p:Point){if(p.x<4600&&p.y<3700)return p.y<1040&&p.x>2530?'snow':p.x>3590&&p.y<1830?'gold':p.y>2850?'marsh':'forest';const r=regionAt(p);return r.forest==='snow'?'snow':r.forest==='gold'?'gold':r.id==='varzea'?'marsh':'forest';}
export function inRiver(p:Point){return Math.abs(p.x-riverX(p.y))<75&&!PASSAGES.some(b=>b.kind==='bridge'&&Math.abs(b.x-riverX(b.y))<200&&Math.abs(p.y-b.y)<(b.id==='old-bridge'?120:80));}
export const passageOpen=(p:Passage,unlocks:ReadonlySet<string>)=>p.open||unlocks.has(p.id);
export function blockedPassage(p:Point,unlocks:ReadonlySet<string>){return PASSAGES.find(g=>!passageOpen(g,unlocks)&&Math.hypot(p.x-g.x,p.y-g.y)<g.radius);}
export function traversable(a:Point,b:Point,unlocks:ReadonlySet<string>,driving=false){const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<.001)return true;const steps=Math.max(1,Math.ceil(d/8));let prev=a;for(let i=1;i<=steps;i++){const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(p.x<12||p.y<12||p.x>WORLD.w-12||p.y>WORLD.h-12||inRiver(p))return false;const gate=blockedPassage(p,unlocks);if(gate&&Math.hypot(p.x-gate.x,p.y-gate.y)<Math.hypot(prev.x-gate.x,prev.y-gate.y))return false;const grade=Math.abs(heightAt(p)-heightAt(prev))/Math.max(.1,Math.hypot(p.x-prev.x,p.y-prev.y));if(grade>(driving?.65:1.0))return false;prev=p;}return true;}
export function chunkKey(p:Point,size=CHUNK){return Math.floor(p.x/size)+','+Math.floor(p.y/size);}
export function hash(a:number,b:number,c=0){let h=Math.imul(a+7919,374761393)^Math.imul(b+4099,668265263)^Math.imul(c+11,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
export function treeSeeds(cx:number,cy:number){const trees:{id:string;x:number;y:number;species:'pine'|'birch'|'snow'|'gold';size:number;seed:number}[]=[];for(let i=0;i<60;i++){const x=(cx+hash(cx,cy,i*3))*CHUNK,y=(cy+hash(cx,cy,i*3+1))*CHUNK,p={x,y},r=regionAt(p);if(i>=r.density||x<4600&&y<3700||x<80||y<80||x>WORLD.w-80||y>WORLD.h-80||inRiver(p)||roadDistance(p)<115||LANDMARKS.some(l=>Math.hypot(x-l.x,y-l.y)<180)||PASSAGES.some(l=>Math.hypot(x-l.x,y-l.y)<230))continue;if(Math.abs(heightAt({x:x+35,y})-heightAt({x:x-35,y}))>50||Math.abs(heightAt({x,y:y+35})-heightAt({x,y:y-35}))>50)continue;const size=.8+hash(cx,cy,i+180)*.65,forest=forestAt(p,hash(cx,cy,i+380));trees.push({id:`w:${cx}:${cy}:${i}`,x,y,species:forest==='pine'&&hash(cx,cy,i+250)>.85?'birch':forest,size,seed:Math.floor(hash(cx,cy,i+300)*1e7)});}return trees;}
