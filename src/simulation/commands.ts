import Matter from 'matter-js';
import { heightAt } from '../world';
import { BUILD, HARDWARE, SHOP, clamp, dist, localPoint, movable, roomCounter, roomDoor, type Command, type Entity } from '../model';
import type { Simulation } from '../simulation';

const { Body, Composite, Constraint }=Matter;

export function runCommand(sim:Simulation,c:Command){
  if(sim.deadUntil)return;
  const p=sim.player.body.position;
  switch(c.type){
    case 'move': if(Number.isFinite(c.x)&&Number.isFinite(c.y))sim.movement={x:clamp(c.x,-1,1),y:clamp(c.y,-1,1),brake:!!c.brake};break;
    case 'aim': if(Number.isFinite(c.x)&&Number.isFinite(c.y))sim.aim={x:c.x,y:c.y};break;
    case 'lights':sim.lights=!sim.lights;break;
    case 'chop':{
      if(sim.driving||sim.cooldown>0)return;
      const e=sim.entities.get(c.target);if(!e||e.room!==sim.interior||dist(e.body.position,p)>105||!e.room&&Math.abs(heightAt(e.body.position)-heightAt(p))>35||e.fallAt!==undefined||e.millId||!['tree','log'].includes(e.kind))return;
      sim.cooldown=sim.axe<1?.82:.61;
      sim.facing=Math.atan2(e.body.position.y-p.y,e.body.position.x-p.x);
      sim.swing={at:sim.elapsed,angle:sim.facing,reach:dist(e.body.position,p),target:e.id,hit:false};break;
    }
    case 'grab':{
      if(sim.driving)return;const e=sim.entities.get(c.target);
      if(!e||!movable(e)||e.room!==sim.interior||dist(e.body.position,p)>125||!e.room&&Math.abs(heightAt(e.body.position)-heightAt(p))>45||e.tied||e.millId)return;
      sim.release();sim.held=e.id;
      sim.grabConstraint=Constraint.create({pointA:{...e.body.position},bodyB:e.body,pointB:{x:0,y:0},length:0,stiffness:.025,damping:.12});Composite.add(sim.engine.world,sim.grabConstraint);break;
    }
    case 'release':{const item=sim.held?sim.entities.get(sim.held):undefined;sim.release();if(item)sim.placeOnCounter(item);break;}
    case 'rotate':{const e=sim.held?sim.entities.get(sim.held):null;if(e)Body.setAngularVelocity(e.body,clamp(c.direction,-1,1)*.035);break;}
    case 'interact':{
      if(sim.interior){const door=roomDoor(sim.interior);if(dist(p,door)<110)sim.changeRoom(undefined);else if(dist(p,roomCounter(sim.interior))<145)sim.checkout();else sim.emit('note',p,'Leve a caixa até o balcão e fale com o vendedor.');break;}
      if(sim.interactPassage())break;
      if(!sim.driving&&(dist(p,SHOP)<155||dist(p,HARDWARE)<155)){sim.changeRoom(dist(p,SHOP)<155?'vale':'east');break;}
      if(sim.driving){
        const t=sim.truck!.body;
        if(Math.hypot(t.velocity.x,t.velocity.y)>3){sim.emit('note',t.position,'Pare a caminhonete antes de sair.');return;}
        sim.driving=false;const q={x:t.position.x+Math.cos(t.angle)*65,y:t.position.y+Math.sin(t.angle)*65};Body.setPosition(sim.player.body,q);Body.setVelocity(sim.player.body,{x:0,y:0});sim.player.body.isSensor=false;
      }else if(sim.truck&&dist(p,sim.truck.body.position)<120){sim.release();sim.driving=true;sim.emit('engine',p);}
      break;
    }
    case 'checkout':sim.checkout();break;
    case 'open':sim.openPackage(c.target);break;
    case 'deploy':sim.deploy(c.target,c.x,c.y,c.angle);break;
    case 'rope':{
      if(!sim.truck||sim.interior||dist(sim.position,sim.truck.body.position)>150)return;
      if(sim.ties.size){for(const [id,constraint]of sim.ties){Composite.remove(sim.engine.world,constraint);const e=sim.entities.get(id);if(e){e.tied=false;e.body.collisionFilter.group=0;}}sim.ties.clear();sim.emit('note',p,'Cordas soltas.');}
      else {for(const e of sim.entities.values())if(movable(e)&&e.paid!==false&&sim.inBed(e.body.position)){sim.tie(e);if(sim.held===e.id)sim.release();}sim.emit('note',p,sim.ties.size?'Carga amarrada.':'Coloque os objetos na caçamba antes de amarrar.');}break;
    }
    case 'build':sim.build(c.piece,c.x,c.y,c.angle);break;
    case 'remove':{const e=sim.entities.get(c.target);if(e?.kind==='structure'&&e.owner==='local'&&dist(e.body.position,p)<160){for(let i=0;i<BUILD[e.piece!].cost;i++)sim.create('plank',e.body.position.x+i*18,e.body.position.y+30,65,14,{species:'pine'});sim.remove(e.id);sim.emit('wood',p);}break;}
    case 'ignite':{
      const e=sim.entities.get(c.target);
      if(sim.driving||!e||e.kind!=='dynamite'||e.room!==sim.interior||e.paid===false||e.fuse!==undefined||dist(p,e.body.position)>120)return;
      e.fuse=sim.elapsed+4;if(sim.held===e.id)sim.release();sim.emit('note',e.body.position,'Pavio aceso. Afaste-se!');break;
    }
  }
}

export function hitWood(sim:Simulation,id:string){
  const e=sim.entities.get(id);if(!e||dist(e.body.position,sim.player.body.position)>145)return;
  if(e.kind==='tree'&&e.fallAt===undefined){e.hp=(e.hp??5)-sim.axe;e.cutAt=sim.elapsed;sim.emit('chop',e.body.position);
    if(e.hp<=.001){e.fallAt=sim.elapsed;e.fallAngle=sim.swing.angle;e.body.isSensor=true;sim.emit('fall',e.body.position);}
  }else if(e.kind==='log'&&!e.tied&&e.w>38&&!e.millId){const a=e.body.angle,q={...e.body.position};sim.remove(e.id);for(const sign of [-1,1]){const n=sim.create('log',q.x+Math.cos(a)*e.w*.25*sign,q.y+Math.sin(a)*e.w*.25*sign,e.w/2-1,e.h,{species:e.species,size:e.size,room:e.room});Body.setAngle(n.body,a);}sim.emit('chop',q);}
}

export function atMillInlet(log:Entity,mill:Entity){
  const p=localPoint(log.body.position,mill.body.position,mill.body.angle);
  return p.x>-125&&p.x<-12&&Math.abs(p.y)<34;
}
