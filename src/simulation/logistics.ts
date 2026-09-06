import Matter from 'matter-js';
import type { Entity, Vec } from '../model';
import type { Simulation } from '../simulation';

const { Composite, Constraint }=Matter;

export function releaseHeld(sim:Simulation){
  if(sim.grabConstraint)Composite.remove(sim.engine.world,sim.grabConstraint);
  sim.grabConstraint=null;sim.held=null;
}

export function inTruckBed(sim:Simulation,p:Vec){
  if(!sim.truck)return false;
  const t=sim.truck.body,dx=p.x-t.position.x,dy=p.y-t.position.y;
  const x=dx*Math.cos(t.angle)+dy*Math.sin(t.angle),y=-dx*Math.sin(t.angle)+dy*Math.cos(t.angle);
  return Math.abs(x)<46&&y>-3&&y<83;
}

export function tieEntity(sim:Simulation,e:Entity){
  if(!sim.truck)return;
  const t=sim.truck.body,dx=e.body.position.x-t.position.x,dy=e.body.position.y-t.position.y;
  const constraint=Constraint.create({bodyA:t,pointA:{x:dx,y:dy},bodyB:e.body,length:0,stiffness:.8,damping:.3});
  e.tied=true;sim.ties.set(e.id,constraint);Composite.add(sim.engine.world,constraint);e.body.collisionFilter.group=-1;t.collisionFilter.group=-1;
}
