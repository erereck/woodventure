import Matter from 'matter-js';
import { HARDWARE, PRODUCTS, ROOMS, SHOP, STOCK, dist, inLand, movable, roomCounter, roomDoor, type Entity, type ShopId, type Vec } from '../model';
import type { Simulation } from '../simulation';

const { Body }=Matter;

export function restockShops(sim:Simulation){
  for(const shop of ['vale','east'] as ShopId[])STOCK[shop].forEach((product,slot)=>{
    if([...sim.entities.values()].some(e=>e.room===shop&&e.slot===slot&&e.paid===false))return;
    const p=ROOMS[shop],x=p.x-290+(slot%3)*225,y=p.y-170+Math.floor(slot/3)*130;
    sim.create(product==='dynamite'?'dynamite':'box',x,y,product==='dynamite'?26:43,product==='dynamite'?15:36,{product,paid:false,slot,room:shop,owner:'shop:'+shop});
  });
}

export function changeRoom(sim:Simulation,room:ShopId|undefined){
  const carried=sim.held?sim.entities.get(sim.held):undefined;
  if(!room&&carried?.paid===false){sim.emit('note',sim.position,'Falta pagar por esse produto no balcão.');return;}
  if(carried?.fuse!==undefined){sim.emit('note',sim.position,'Largue a dinamite acesa!');return;}
  const exterior=sim.interior==='east'?HARDWARE:SHOP;
  const destination=room?{x:roomDoor(room).x,y:roomDoor(room).y-15}:{x:exterior.x,y:exterior.y+88};
  sim.interior=room;sim.player.room=room;Body.setPosition(sim.player.body,destination);Body.setVelocity(sim.player.body,{x:0,y:0});
  sim.aim={x:destination.x,y:destination.y-65};
  if(carried){carried.room=room;Body.setPosition(carried.body,{x:destination.x,y:destination.y+(room?-58:48)});Body.setVelocity(carried.body,{x:0,y:0});}
  sim.movement={x:0,y:0,brake:false};sim.restock();sim.emit('transition',destination,room?'Leve o produto ao balcão. E para conversar com o vendedor.':undefined);
}

export function counterPlacement(sim:Simulation,e:Entity):Vec|undefined {
  if(!sim.interior||e.room!==sim.interior||!e.product||e.fuse!==undefined||dist(sim.position,roomCounter(sim.interior))>160)return;
  const c=roomCounter(sim.interior),p=e.body.position;
  if(Math.abs(p.x-c.x)>140||p.y<c.y-110||p.y>c.y+105)return;
  const slots=[-65,-12,41].map(x=>({x:c.x+x,y:c.y-28}));
  return slots.find(p=>![...sim.entities.values()].some(other=>other.id!==e.id&&other.room===e.room&&movable(other)&&dist(other.body.position,p)<45));
}

export function placeOnCounter(sim:Simulation,e:Entity){
  const p=counterPlacement(sim,e);if(!p)return;
  Body.setPosition(e.body,p);Body.setVelocity(e.body,{x:0,y:0});Body.setAngularVelocity(e.body,0);Body.setAngle(e.body,0);sim.emit('wood',p);
}

export function checkout(sim:Simulation){
  if(!sim.interior||dist(sim.player.body.position,roomCounter(sim.interior))>145)return;
  const counter=roomCounter(sim.interior);
  const held=sim.held?sim.entities.get(sim.held):undefined;if(held&&counterPlacement(sim,held)){sim.release();placeOnCounter(sim,held);}
  const goods=[...sim.entities.values()].filter(e=>e.room===sim.interior&&e.paid===false&&e.product&&Math.abs(e.body.position.x-counter.x)<140&&Math.abs(e.body.position.y-counter.y)<95);
  if(!goods.length){sim.emit('note',counter,'Pode trazer a caixa aqui no balcão.');return;}
  const total=goods.reduce((sum,e)=>sum+PRODUCTS[e.product!].price,0);
  if(sim.money<total){sim.emit('note',counter,'Faltam $ '+(total-sim.money)+' para pagar esses produtos.');return;}
  sim.money-=total;goods.forEach(e=>{e.paid=true;e.owner='local';e.slot=undefined;});
  sim.emit('note',counter,'Tudo certo. $ '+total+' pagos. Pode levar.');sim.restock();
}

export function openPackage(sim:Simulation,id:string){
  const e=sim.entities.get(id);if(!e||e.room!==sim.interior||dist(sim.player.body.position,e.body.position)>125||e.tied)return;
  if(e.paid===false){sim.emit('note',e.body.position,'Pague a caixa antes de abrir.');return;}
  if(e.kind==='tool'){
    const old=sim.axe;sim.axe=e.toolPower??1;e.toolPower=old;sim.emit('note',e.body.position,'Machado equipado. O anterior ficou no chão.');return;
  }
  if(e.kind!=='box'||!e.product)return;
  if(e.product==='truck'||e.product==='mill'){sim.emit('note',e.body.position,'Leve a caixa ao terreno e use X para posicionar.');return;}
  if(e.product==='fuel'){if(!sim.truck||dist(e.body.position,sim.truck.body.position)>150){sim.emit('note',e.body.position,'Leve o galão até a caminhonete.');return;}sim.fuel=100;sim.remove(id);sim.emit('note',sim.position,'Tanque abastecido.');return;}
  const q={...e.body.position},old=sim.axe;
  sim.axe=e.product==='steelAxe'?2:1;sim.remove(id);sim.create('tool',q.x,q.y,32,12,{toolPower:old,paid:true,room:sim.interior});sim.emit('wood',q);sim.emit('note',q,'Machado novo equipado. O anterior ficou no chão.');
}

export function deployPackage(sim:Simulation,id:string,x:number,y:number,angle:number){
  const e=sim.entities.get(id);if(!e||!Number.isFinite(x+y+angle)||sim.driving||sim.interior||e.paid===false||e.tied||dist(sim.position,e.body.position)>145)return;
  const kind=e.kind==='mill'?'mill':e.kind==='box'&&['truck','mill'].includes(e.product!)?e.product:undefined;
  if(!kind)return;
  const p={x,y};if(!inLand(e.body.position,0)||!inLand(p,100)||dist(sim.position,p)>210){sim.emit('note',p,'Posicione dentro do terreno, perto de você.');return;}
  if(kind==='truck'&&sim.truck){sim.emit('note',p,'Você já tem uma caminhonete neste protótipo.');return;}
  if([...sim.entities.values()].some(o=>o.id!==id&&['truck','mill','structure','tree'].includes(o.kind)&&!(o.kind==='structure'&&o.piece==='floor')&&dist(o.body.position,p)<115)){sim.emit('note',p,'Deixe mais espaço livre para instalar.');return;}
  if(e.kind==='mill'){if([...sim.entities.values()].some(o=>o.millId===id)){sim.emit('note',p,'Espere a refinadora terminar.');return;}Body.setPosition(e.body,p);Body.setAngle(e.body,angle);}
  else{sim.remove(id);const n=sim.create(kind as 'truck'|'mill',x,y,kind==='truck'?69:200,kind==='truck'?124:64);Body.setAngle(n.body,angle);}
  sim.emit('build',p);sim.emit('note',p,kind==='truck'?'Caminhonete pronta.':'Refinadora instalada. Alimente a mesa de entrada.');
}
