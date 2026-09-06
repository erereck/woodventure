import Matter from 'matter-js';
import { PASSAGES, heightAt } from '../world';
import { BUILD, dist, inLand, type Piece, type ShopId, type Vec } from '../model';
import type { Simulation } from '../simulation';

const { Body }=Matter;

export function buildPiece(sim:Simulation,piece:Piece,x:number,y:number,angle:number){
  const def=BUILD[piece];if(!def||![x,y,angle].every(Number.isFinite)||sim.driving||sim.interior)return;
  const q={x,y};if(!inLand(q,40)||dist(q,sim.player.body.position)>180){sim.emit('note',q,'Construa perto de você, dentro do seu terreno.');return;}
  const existing=[...sim.entities.values()].some(e=>e.kind==='structure'&&dist(e.body.position,q)<22);
  if(existing){sim.emit('note',q,'Já existe uma peça aqui.');return;}
  const planks=[...sim.entities.values()].filter(e=>e.kind==='plank'&&!e.tied&&dist(e.body.position,q)<230);
  if(planks.length<def.cost){sim.emit('note',q,`Deixe ${def.cost} ${def.cost===1?'tábua':'tábuas'} perto da construção.`);return;}
  planks.slice(0,def.cost).forEach(e=>sim.remove(e.id));
  const e=sim.create('structure',x,y,def.w,def.h,{piece});Body.setAngle(e.body,angle);sim.emit('build',q);
}

export function explode(sim:Simulation,p:Vec,room?:ShopId){
  sim.emit('explode',p);
  if(!room)for(const gate of PASSAGES)if(gate.kind==='rockfall'&&Math.hypot(dist(p,gate),heightAt(p)-heightAt(gate))<gate.radius+110){sim.unlocked.add(gate.id);sim.emit('note',p,'As pedras cederam. A subida está aberta.');}
  if(room===sim.interior&&Math.hypot(dist(sim.position,p),room?0:heightAt(sim.position)-heightAt(p))<145){sim.release();sim.driving=false;sim.deadUntil=sim.elapsed+3;sim.movement={x:0,y:0,brake:false};Body.setVelocity(sim.player.body,{x:0,y:0});sim.emit('death',p,'A explosão atingiu você.');}
  for(const e of [...sim.entities.values()]){const d=Math.hypot(dist(p,e.body.position),room?0:heightAt(p)-heightAt(e.body.position));if(d>160||e.room!==room)continue;
    if(e.kind==='dynamite'&&e.fuse===undefined&&e.paid!==false)e.fuse=sim.elapsed+.15;
    if(e.owner==='gate'){sim.gateOpen=true;sim.remove(e.id);}
    else if(e.kind==='tree'&&e.fallAt===undefined){e.hp=0;e.fallAt=sim.elapsed;e.fallAngle=Math.atan2(e.body.position.y-p.y,e.body.position.x-p.x);e.body.isSensor=true;}
    else if(!e.body.isStatic&&e.kind!=='player'){Body.setVelocity(e.body,{x:(e.body.position.x-p.x)/(d||1)*6,y:(e.body.position.y-p.y)/(d||1)*6});}
  }
}
