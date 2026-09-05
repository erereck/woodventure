import { clamp, localPoint, movable, type Entity, type Vec } from './model';

/** Support relations override depth only for objects overlapping that support.
 * An unlashed load belongs to the same draw group as a lashed one.
 */
export function onTruckBed(e:Entity,truck:Entity|undefined){
  if(!truck||!movable(e)||e.room)return false;
  if(e.tied)return true;
  const points=[e.body.position,...e.body.vertices].map(p=>localPoint(p,truck.body.position,truck.body.angle));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  return maxX>-31&&minX<31&&maxY>5&&minY<62;
}
export function foliageOpacity(tree:Entity,focus:Vec){
  const dx=Math.max(0,Math.abs(tree.body.position.x-focus.x)-62*tree.size);
  const dy=Math.max(0,Math.abs(tree.body.position.y*.72-125*tree.size-(focus.y*.72-22))-96*tree.size);
  if(tree.body.position.y<focus.y-55)return 1;
  const t=clamp(Math.hypot(dx,dy)/120,0,1);
  return .18+.82*t*t*(3-2*t);
}
