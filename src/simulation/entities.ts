import Matter from 'matter-js';
import type { Entity, Vec } from '../model';
import type { Simulation } from '../simulation';

const { Bodies, Body, Composite } = Matter;

export function createEntity(
  sim: Simulation,
  kind: Entity['kind'], x: number, y: number, w: number, h: number,
  opts: Partial<Omit<Entity,'kind'|'body'|'w'|'h'>> = {}, id?: string,
) {
  const fixed=kind==='tree'||kind==='rock'||kind==='structure'||kind==='mill';
  const body=(kind==='player'||kind==='tree')?Bodies.circle(x,y,w/2,{isStatic:fixed}):Bodies.rectangle(x,y,w,h,{isStatic:fixed,chamfer:{radius:kind==='truck'?6:2}});
  body.frictionAir=kind==='truck'?.045:kind==='player'?.2:.065;
  body.friction=.4;body.restitution=kind==='log'?.14:.05;
  if(kind==='player'){ Body.setInertia(body,Infinity); Body.setMass(body,5); }
  if(kind==='truck'){Body.setMass(body,180);Body.setInertia(body,200000);body.collisionFilter.category=4;body.collisionFilter.mask=~2;}
  if(['log','plank','relic','box','tool','dynamite'].includes(kind)){Body.setMass(body,Math.max(.6,w*h*(kind==='plank'?.002:.004)));body.collisionFilter.category=2;}
  const e:Entity={id:id??`e${sim.nextId++}`,kind,body,w,h,owner:'local',seed:sim.nextId*137,size:1,...opts};
  if(kind==='structure'&&(e.piece==='floor'||e.piece==='conveyor')) body.isSensor=true;
  if(kind==='mill')body.isSensor=true;
  body.label=e.id;sim.entities.set(e.id,e);Composite.add(sim.engine.world,body);if(kind==='truck')sim.truck=e;return e;
}

export function removeEntity(sim:Simulation,id:string){
  if(id.startsWith('w:'))sim.removedTrees.add(id);
  const e=sim.entities.get(id);if(!e)return;
  if(sim.held===id)sim.release();
  if(e===sim.truck){sim.truck=undefined;sim.driving=false;}
  const tie=sim.ties.get(id);if(tie){Composite.remove(sim.engine.world,tie);sim.ties.delete(id);}
  Composite.remove(sim.engine.world,e.body);sim.entities.delete(id);
}

export function closestEntity(sim:Simulation,p:Vec,kinds:Entity['kind'][],range:number){
  let found:Entity|undefined;let best=range;
  for(const e of sim.entities.values()){
    const d=Math.hypot(p.x-e.body.position.x,p.y-e.body.position.y);
    if(e.room===sim.interior&&kinds.includes(e.kind)&&e.fallAt===undefined&&d<best){best=d;found=e;}
  }
  return found;
}
