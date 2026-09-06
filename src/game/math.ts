import type { Vec } from './types';

export const dist = (a:Vec,b:Vec) => Math.hypot(a.x-b.x,a.y-b.y);
export const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));

export function rng(seed:number) {
  return () => {
    seed|=0;
    seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

export function localPoint(p:Vec,origin:Vec,angle:number):Vec {
  const dx=p.x-origin.x,dy=p.y-origin.y;
  return{x:dx*Math.cos(angle)+dy*Math.sin(angle),y:-dx*Math.sin(angle)+dy*Math.cos(angle)};
}

export function worldPoint(p:Vec,origin:Vec,angle:number):Vec {
  return{x:origin.x+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:origin.y+p.x*Math.sin(angle)+p.y*Math.cos(angle)};
}

export function segmentDistance(p:Vec,a:Vec,b:Vec) {
  const t=clamp(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2),0,1);
  return dist(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
}
