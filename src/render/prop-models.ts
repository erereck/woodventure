import * as T from 'three';
import { PRODUCTS, WOODS, rng, type Entity } from '../model';
import { axe } from './machinery-models';
import { ball, box, cyl, material } from './primitives';

export function propModel(e:Entity){
 const g=new T.Group(),wood=WOODS[e.species??'pine'];
 if(e.kind==='log'){
  const log=cyl(g,e.h/2,e.w,0,e.h/2,0,wood.bark);log.rotation.z=Math.PI/2;
  for(const x of [-e.w/2-.1,e.w/2+.1]){const end=cyl(g,e.h*.45,.3,x,e.h/2,0,wood.heart);end.rotation.z=Math.PI/2;const ring=new T.Mesh(new T.RingGeometry(e.h*.27,e.h*.3,12),material('#a88152'));ring.rotation.y=Math.PI/2;ring.position.set(x>0?x+.2:x-.2,e.h/2,0);ring.material.side=T.DoubleSide;g.add(ring);}
  for(let z=-e.h*.32;z<e.h*.4;z+=e.h*.3)box(g,e.w-4,1,1,0,e.h*.91,z,'#98734d');
 }else if(e.kind==='plank'){box(g,e.w,7,e.h,0,3.5,0,wood.heart);for(const z of [-4,2])box(g,e.w-6,.2,.6,0,7.2,z,'#ae8856');}
 else if(e.kind==='box'){
  const w=e.w,h=29,d=e.h;box(g,w,h,d,0,h/2,0,'#b89e6a');box(g,w+1,3,d+1,0,h,0,'#c9b180');box(g,6,h+3,d+2,0,(h+3)/2,0,'#e0cca0');box(g,w+2,2,6,0,h+2,0,'#ded1a7');
  box(g,15,10,1,10,17,d/2+.6,PRODUCTS[e.product!]?.color??'#7e9072');if(e.paid)box(g,6,5,1,-10,8,d/2+1,'#588268');
 }else if(e.kind==='dynamite'){
  for(const z of [-5,0,5]){const stick=cyl(g,3,27,0,4,z,z===0?'#c27752':'#a75640');stick.rotation.z=Math.PI/2;}
  for(const x of [-7,7])box(g,3,8,17,x,4,0,'#bbaa75');const fuse=box(g,1,7,1,13,9,0,'#d9bf75');fuse.rotation.z=-.3;const ember=ball(g,15,13,0,2,2,2,'#ffe69a');ember.name='ember';ember.visible=false;
 }else if(e.kind==='tool'){const a=axe();a.rotation.x=Math.PI/2;a.position.y=5;g.add(a);}
 else if(e.kind==='rock'){const random=rng(e.seed);ball(g,0,e.h*.3,0,e.w*.62,e.h*.52,e.h*.53,'#798674');ball(g,-e.w*.2,e.h*.22,e.h*.22,e.w*.32,e.h*.31,e.h*.34,'#8d9680');g.rotation.y=random()*Math.PI;}
 else if(e.kind==='relic'){const torus=new T.Mesh(new T.TorusGeometry(11,4,5,12),material('#b4995e'));torus.rotation.x=Math.PI/2;torus.position.y=5;g.add(torus);for(let i=0;i<8;i++){const a=i*Math.PI/4;const tooth=box(g,7,7,7,Math.cos(a)*15,5,Math.sin(a)*15,'#b4995e');tooth.rotation.y=-a;}}
 return g;
}
