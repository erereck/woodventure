import Matter from 'matter-js';
import { OLD_ROOMS } from '../world';
import { MILL, ROOMS, type Snapshot } from '../model';
import type { Simulation } from '../simulation';

const { Body }=Matter;

export function captureSnapshot(sim:Simulation):Snapshot {
  return {version:3,streaming:sim.streaming,roomOrigins:{vale:{...ROOMS.vale},east:{...ROOMS.east}},removedTrees:[...sim.removedTrees],explored:[...sim.explored],unlocked:[...sim.unlocked],tick:sim.tick,nextId:sim.nextId,money:sim.money,fuel:sim.fuel,axe:sim.axe,driving:sim.driving,lights:sim.lights,elapsed:sim.elapsed,truckUpgrade:sim.truckUpgrade,gateOpen:sim.gateOpen,secretOpen:sim.secretOpen,interior:sim.interior,facing:sim.facing,swing:{...sim.swing},deadUntil:sim.deadUntil,entities:[...sim.entities.values()].filter(e=>!e.id.startsWith('w:')||e.hp!==e.maxHp||e.fallAt!==undefined).map(({body,...e})=>({...e,x:body.position.x,y:body.position.y,angle:body.angle,vx:body.velocity.x,vy:body.velocity.y,av:body.angularVelocity}))};
}

export function restoreSnapshot(sim:Simulation,s:Snapshot){
  if(!s||![1,2,3].includes(s.version)||!Array.isArray(s.entities)||s.entities.length>10000||s.entities.filter(e=>e.kind==='player').length!==1)throw new Error('Arquivo de mundo incompatível.');
  if(![s.money,s.fuel,s.axe,s.elapsed,s.tick,s.nextId].every(Number.isFinite)||s.entities.some(e=>![e.x,e.y,e.w,e.h,e.angle,e.vx,e.vy,e.av].every(Number.isFinite)||e.w<=0||e.h<=0))throw new Error('O arquivo de mundo contém dados inválidos.');
  if(new Set(s.entities.map(e=>e.id)).size!==s.entities.length||s.interior&&!ROOMS[s.interior])throw new Error('Arquivo de mundo inválido.');
  if([s.removedTrees,s.explored,s.unlocked].some(v=>v!==undefined&&(!Array.isArray(v)||v.some(id=>typeof id!=='string')))||s.streaming!==undefined&&typeof s.streaming!=='boolean'||s.roomOrigins&&Object.values(s.roomOrigins).some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Metadados do mundo inválidos.');
  sim.release();for(const id of [...sim.entities.keys()])sim.remove(id);sim.truck=undefined;
  sim.loadedChunks.clear();sim.removedTrees=new Set(s.removedTrees??[]);sim.explored=new Set(s.explored??[]);sim.unlocked=new Set(s.unlocked??[]);sim.streaming=s.streaming??true;
  sim.tick=s.tick;sim.nextId=s.nextId;sim.money=s.money;sim.fuel=s.fuel;sim.axe=s.axe;sim.driving=s.driving;sim.lights=s.lights;sim.elapsed=s.elapsed;sim.truckUpgrade=s.truckUpgrade;sim.gateOpen=s.gateOpen;sim.secretOpen=s.secretOpen;
  sim.interior=s.interior;sim.facing=s.facing??-Math.PI/2;sim.swing=s.swing?{...s.swing}:{at:-10,angle:0,reach:40};sim.deadUntil=s.deadUntil??0;
  for(const raw of s.entities){const {x,y,angle,vx,vy,av,w,h,id,kind,...opts}=raw;const origin=raw.room?(s.version<3?OLD_ROOMS[raw.room]:s.roomOrigins?.[raw.room]??(raw.room==='vale'?{x:25040,y:1900}:{x:26240,y:1900})):undefined,offset=raw.room&&origin?ROOMS[raw.room].x-origin.x:0,offsetY=raw.room&&origin?ROOMS[raw.room].y-origin.y:0;const e=sim.create(kind,x+offset,y+offsetY,w,h,opts,id);Body.setAngle(e.body,angle);Body.setVelocity(e.body,{x:vx,y:vy});Body.setAngularVelocity(e.body,av);if(kind==='player')sim.player=e;if(e.fallAt!==undefined||e.millId)e.body.isSensor=true;}
  sim.player.room=sim.interior;sim.driving=sim.driving&&!!sim.truck;
  for(const e of sim.entities.values())if(e.tied)sim.tie(e);
  if(s.version===1){
    sim.create('mill',MILL.x,MILL.y,200,64);
    for(let i=0;i<(s.dynamite??0);i++)sim.create('dynamite',sim.player.body.position.x+35+i*27,sim.player.body.position.y+40,26,15,{product:'dynamite',paid:true});
    for(const e of [...sim.entities.values()])if(e.kind==='tree'&&sim.saleClearing(e.body.position))sim.remove(e.id);
    sim.restock();
  }
  sim.streamWorld();sim.movement={x:0,y:0,brake:false};sim.queue=[];sim.events=[];sim.aim={x:sim.position.x+Math.cos(sim.facing)*80,y:sim.position.y+Math.sin(sim.facing)*80};
}
