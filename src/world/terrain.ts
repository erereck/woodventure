import { PLATEAUS, REGIONS, ROAD, type Point } from './data';

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
