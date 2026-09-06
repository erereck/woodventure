import { LAND, biomeAt } from '../world';
import type { Entity, Vec } from './types';

export const movable = (e:Entity) => ['log','plank','relic','dynamite','box','tool'].includes(e.kind);

export function inLand(p:Vec,margin=0) {
  return p.x>LAND.x+margin&&p.x<LAND.x+LAND.w-margin&&p.y>LAND.y+margin&&p.y<LAND.y+LAND.h-margin;
}

export function biome(p:Vec){return biomeAt(p);}
