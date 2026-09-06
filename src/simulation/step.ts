import Matter from 'matter-js';
import { traversable, heightAt } from '../world';
import { BUYER, SECRET, WOODS, biome, clamp, dist, movable, roadDistance, worldPoint } from '../model';
import type { Simulation } from '../simulation';

const { Engine, Body }=Matter;
const STEP=1000/60;

export function stepSimulation(sim:Simulation){
  for(const e of sim.queue)sim.command(e.command);sim.queue.length=0;
  sim.tick++;sim.elapsed+=1/60;if(sim.tick%30===0)sim.streamWorld();sim.cooldown=Math.max(0,sim.cooldown-1/60);
  if(sim.swing.target&&!sim.swing.hit&&sim.elapsed-sim.swing.at>=.22){sim.swing.hit=true;sim.hitWood(sim.swing.target);}
  if(sim.deadUntil){if(sim.elapsed>=sim.deadUntil){sim.deadUntil=0;sim.interior=undefined;sim.player.room=undefined;Body.setPosition(sim.player.body,{x:1380,y:2090});Body.setVelocity(sim.player.body,{x:0,y:0});sim.movement={x:0,y:0,brake:false};sim.emit('transition',sim.position,'Você voltou ao terreno. Seus objetos ficaram onde estavam.');}else return;}
  const p=sim.player.body,t=sim.truck?.body;
  if(sim.driving&&t){
    const forward={x:Math.sin(t.angle),y:-Math.cos(t.angle)};
    const speed=t.velocity.x*forward.x+t.velocity.y*forward.y;
    const cargo=[...sim.ties.keys()].reduce((n,id)=>n+(sim.entities.get(id)?.body.mass??0),0);
    const terrain=biome(t.position)==='marsh'?.36:roadDistance(t.position)>100?.64:1;
    const throttle=-sim.movement.y;
    const power=(sim.truckUpgrade?.0018:.0013)*terrain/(1+cargo/180);
    if(sim.fuel>0)Body.applyForce(t,t.position,{x:forward.x*throttle*power*t.mass,y:forward.y*throttle*power*t.mass});
    const lateral={x:Math.cos(t.angle),y:Math.sin(t.angle)};
    const slip=t.velocity.x*lateral.x+t.velocity.y*lateral.y;
    Body.setVelocity(t,{x:t.velocity.x-lateral.x*slip*.17,y:t.velocity.y-lateral.y*slip*.17});
    Body.setAngularVelocity(t,sim.movement.x*.030*clamp(speed/2,-1,1));
    if(sim.movement.brake)Body.setVelocity(t,{x:t.velocity.x*.89,y:t.velocity.y*.89});
    sim.fuel=Math.max(0,sim.fuel-Math.abs(throttle)*.0008);
    Body.setPosition(p,t.position);p.isSensor=true;
  }else{
    p.isSensor=false;
    const m=Math.hypot(sim.movement.x,sim.movement.y)||1;
    const drag=sim.held?.70:1;
    Body.setVelocity(p,{x:sim.movement.x/m*2.4*drag,y:sim.movement.y/m*2.4*drag});
  }
  if(dist(sim.aim,p.position)>5&&sim.elapsed-sim.swing.at>.42)sim.facing=Math.atan2(sim.aim.y-p.position.y,sim.aim.x-p.position.x);
  if(sim.grabConstraint&&sim.held){
    const d=dist(sim.aim,p.position),reach=Math.min(d,108);
    sim.grabConstraint.pointA={x:p.position.x+(sim.aim.x-p.position.x)/(d||1)*reach,y:p.position.y+(sim.aim.y-p.position.y)/(d||1)*reach};
    const item=sim.entities.get(sim.held);if(!item||dist(item.body.position,p.position)>210)sim.release();
  }
  const previous=[...sim.entities.values()].filter(e=>!e.body.isStatic&&!e.room&&!e.tied).map(e=>({e,p:{...e.body.position}}));
  Engine.update(sim.engine,STEP);
  for(const {e,p:before} of previous)if(!traversable(before,e.body.position,sim.unlocked,e.kind==='truck')){Body.setPosition(e.body,before);Body.setVelocity(e.body,{x:0,y:0});}
  if(sim.driving&&t)Body.setPosition(p,t.position);
  const mills=[...sim.entities.values()].filter(e=>e.kind==='mill'),conveyors=[...sim.entities.values()].filter(e=>e.kind==='structure'&&e.piece==='conveyor');
  for(const e of [...sim.entities.values()]){
    if(e.kind==='tree'&&e.fallAt!==undefined&&sim.elapsed-e.fallAt>1.3){
      const a=e.fallAngle??0,q=e.body.position;
      for(let i=0;i<3;i++){const l=sim.create('log',q.x+Math.cos(a)*(24+i*43)*e.size,q.y+Math.sin(a)*(24+i*43)*e.size,(65-i*7)*e.size,21*e.size,{species:e.species,size:e.size});Body.setAngle(l.body,a);Body.setVelocity(l.body,{x:Math.cos(a)*1.1,y:Math.sin(a)*1.1});}
      sim.remove(e.id);sim.emit('wood',q);
    }
    if(e.kind==='dynamite'&&e.fuse!==undefined&&sim.elapsed>=e.fuse){sim.explode(e.body.position,e.room);sim.remove(e.id);}
    if(movable(e)&&t&&!e.room&&!e.tied&&sim.held!==e.id&&sim.inBed(e.body.position))Body.setVelocity(e.body,{x:e.body.velocity.x+(t.velocity.x-e.body.velocity.x)*.1,y:e.body.velocity.y+(t.velocity.y-e.body.velocity.y)*.1});
    if(e.kind==='log'||e.kind==='plank'){
      const q=e.body.position;
      const mill=e.millId?sim.entities.get(e.millId):e.kind==='log'&&!e.room&&!e.tied?mills.find(m=>sim.atInlet(e,m)):undefined;
      if(mill&&e.kind==='log'){
        if(sim.held===e.id)sim.release();e.millId=mill.id;e.process=(e.process??0)+1/60;
        const f=clamp(e.process/3.2,0,1),feed=worldPoint({x:-75+f*95,y:0},mill.body.position,mill.body.angle);
        Body.setPosition(e.body,feed);Body.setVelocity(e.body,{x:0,y:0});Body.setAngle(e.body,mill.body.angle);e.body.isSensor=true;
        if(e.process>3.2){sim.remove(e.id);for(let j=0;j<2;j++){const out=worldPoint({x:127,y:-11+j*23},mill.body.position,mill.body.angle);const plank=sim.create('plank',out.x,out.y,e.w,14,{species:e.species,size:e.size});Body.setAngle(plank.body,mill.body.angle);Body.setVelocity(plank.body,{x:Math.cos(mill.body.angle)*1.1,y:Math.sin(mill.body.angle)*1.1});}sim.emit('wood',feed);}
      }else if(!e.room&&q.x>BUYER.x-BUYER.w/2&&q.x<BUYER.x+BUYER.w/2&&q.y>BUYER.y-BUYER.h/2&&q.y<BUYER.y+BUYER.h/2&&sim.held!==e.id){
        e.process=(e.process??0)+1/60;
        if(e.process>1.5){const value=Math.round(WOODS[e.species??'pine'].value*(e.w/65)*(e.kind==='plank'?1.45:1));sim.money+=value;sim.remove(e.id);sim.emit('sell',q,undefined,value);}
      }else{e.process=0;e.millId=undefined;e.body.isSensor=false;}
      for(const s of conveyors)if(dist(q,s.body.position)<46&&!e.tied&&sim.held!==e.id)Body.setVelocity(e.body,{x:Math.cos(s.body.angle)*1.2,y:Math.sin(s.body.angle)*1.2});
    }
  }
  if(!sim.secretOpen){const relic=[...sim.entities.values()].find(e=>e.kind==='relic');if(relic&&dist(relic.body.position,{x:3505,y:SECRET.y})<52){sim.secretOpen=true;for(const e of [...sim.entities.values()])if(e.owner==='secret')sim.remove(e.id);sim.release();sim.remove(relic.id);sim.emit('secret',{x:3560,y:SECRET.y},'O metal se encaixa. Algo se move do outro lado.');}}
}
