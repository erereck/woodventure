import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/simulation';
import {foliageOpacity,onTruckBed} from '../src/layers';
import {SHOP,ROOMS,roomDoor,roomCounter,PRODUCTS,GATE,worldPoint,type Snapshot} from '../src/model';
const {Body}=Matter;
const advance=(s:Simulation,n:number)=>{for(let i=0;i<n;i++)s.step();};
function small(){const s=new Simulation(false);s.player=s.create('player',1380,2090,19,19);return s;}
test('depth support recognizes loose wood at every truck heading, independent of ropes',()=>{
  const s=small(),truck=s.create('truck',1480,2140,69,124),log=s.create('log',0,0,85,20);
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){Body.setAngle(truck.body,angle);Body.setAngle(log.body,angle);Body.setPosition(log.body,worldPoint({x:0,y:36},truck.body.position,angle));assert.equal(onTruckBed(log,truck),true);log.tied=true;assert.equal(onTruckBed(log,truck),true);log.tied=false;Body.setPosition(log.body,worldPoint({x:120,y:35},truck.body.position,angle));assert.equal(onTruckBed(log,truck),false);}
});
test('foliage opens a broad area around the player with a continuous falloff',()=>{const s=small(),tree=s.create('tree',1450,2190,20,20,{size:1});assert.ok(foliageOpacity(tree,s.position)<.45);assert.ok(foliageOpacity(tree,{x:900,y:2090})>.99);const nearby=foliageOpacity(tree,{x:1300,y:2090}),farther=foliageOpacity(tree,{x:1240,y:2090});assert.ok(nearby<farther);});
test('axe contact occurs during the swing and faces its actual target',()=>{const s=small(),tree=s.create('tree',1320,2090,20,20,{species:'pine',hp:5,maxHp:5});s.command({type:'chop',target:tree.id});assert.equal(tree.hp,5);assert.ok(Math.abs(s.facing-Math.PI)<.01);advance(s,14);assert.equal(tree.hp,4.4);assert.equal(s.swing.hit,true);});
test('unpaid physical products cannot be opened or taken through the shop door',()=>{
  const s=new Simulation();Body.setPosition(s.player.body,{x:SHOP.x,y:SHOP.y+60});s.command({type:'interact'});assert.equal(s.interior,'vale');
  const box=[...s.entities.values()].find(e=>e.room==='vale'&&e.product==='axe')!;Body.setPosition(box.body,{x:s.position.x,y:s.position.y-50});s.command({type:'open',target:box.id});assert.equal(s.axe,.6);s.command({type:'grab',target:box.id});s.command({type:'interact'});assert.equal(s.interior,'vale');assert.equal(box.paid,false);
});
test('checkout requires a physical delivery and enough money; paid boxes leave with you',()=>{
  const s=new Simulation();Body.setPosition(s.player.body,SHOP);s.command({type:'interact'});const counter=roomCounter('vale'),box=[...s.entities.values()].find(e=>e.room==='vale'&&e.product==='axe')!;
  Body.setPosition(s.player.body,{x:counter.x,y:counter.y+55});s.money=100;s.command({type:'checkout'});assert.equal(s.money,100);
  Body.setPosition(box.body,{x:counter.x-45,y:counter.y+15});s.money=0;s.command({type:'checkout'});assert.equal(box.paid,false);
  s.money=100;s.command({type:'checkout'});assert.equal(box.paid,true);assert.equal(s.money,25);s.command({type:'checkout'});assert.equal(s.money,25);
  Body.setPosition(s.player.body,roomDoor('vale'));Body.setPosition(box.body,{x:s.position.x,y:s.position.y-45});s.command({type:'grab',target:box.id});s.command({type:'interact'});assert.equal(s.interior,undefined);assert.equal(box.room,undefined);assert.equal(s.held,box.id);
  s.command({type:'release'});s.command({type:'open',target:box.id});assert.equal(s.axe,1);assert.ok(!s.entities.has(box.id));assert.ok([...s.entities.values()].some(e=>e.kind==='tool'&&e.toolPower===.6));
});
test('vehicle and mill packages install only after payment and delivery to the lot',()=>{
  const s=small(),box=s.create('box',1400,2100,43,36,{product:'truck',paid:false});s.command({type:'deploy',target:box.id,x:1490,y:2100,angle:Math.PI/2});assert.equal(s.truck,undefined);box.paid=true;
  s.command({type:'deploy',target:box.id,x:900,y:1800,angle:0});assert.equal(s.truck,undefined);
  s.command({type:'deploy',target:box.id,x:1490,y:2100,angle:Math.PI/2});assert.ok(s.truck);assert.ok(!s.entities.has(box.id));assert.equal(s.truck!.body.angle,Math.PI/2);
  const kit=s.create('box',1300,2140,43,36,{product:'mill',paid:true});s.command({type:'deploy',target:kit.id,x:1270,y:2180,angle:-Math.PI/2});const mill=[...s.entities.values()].find(e=>e.kind==='mill')!;assert.ok(mill);assert.ok(!s.entities.has(kit.id));assert.equal(mill.body.angle,-Math.PI/2);
});
test('the directional inlet captures held timber, aligns it and produces boards',()=>{
  const s=small(),mill=s.create('mill',1400,2110,200,64);Body.setAngle(mill.body,Math.PI/2);const inlet=worldPoint({x:-75,y:0},mill.body.position,mill.body.angle),log=s.create('log',inlet.x,inlet.y,70,20,{species:'pine'});
  s.command({type:'grab',target:log.id});assert.equal(s.held,log.id);advance(s,1);assert.equal(s.held,null);assert.equal(log.millId,mill.id);assert.equal(log.body.angle,Math.PI/2);advance(s,210);assert.ok(!s.entities.has(log.id));assert.equal([...s.entities.values()].filter(e=>e.kind==='plank').length,2);
  const behind=worldPoint({x:80,y:0},mill.body.position,mill.body.angle),other=s.create('log',behind.x,behind.y,65,20);advance(s,200);assert.ok(s.entities.has(other.id));assert.equal(other.millId,undefined);
});
test('dynamite can be moved and lashed, and only the selected paid item gets a fuse',()=>{
  const s=small(),truck=s.create('truck',1440,2100,69,124),d=s.create('dynamite',1440,2135,26,15,{paid:true,product:'dynamite'}),unpaid=s.create('dynamite',1390,2090,26,15,{paid:false,product:'dynamite'});
  s.command({type:'grab',target:d.id});assert.equal(s.held,d.id);s.command({type:'rope'});assert.equal(d.tied,true);assert.equal(s.held,null);s.command({type:'ignite',target:unpaid.id});assert.equal(unpaid.fuse,undefined);s.command({type:'ignite',target:d.id});assert.ok(d.fuse!>s.elapsed);assert.ok(s.entities.has(d.id));
  Body.setPosition(s.player.body,{x:1100,y:2100});advance(s,250);assert.ok(!s.entities.has(d.id));assert.equal(s.deadUntil,0);assert.ok(s.entities.has(truck.id));
});
test('remaining inside a blast kills the player and returns them to the lot',()=>{const s=small(),d=s.create('dynamite',1400,2090,26,15,{paid:true});s.command({type:'ignite',target:d.id});advance(s,245);assert.ok(s.deadUntil>s.elapsed);assert.equal(s.driving,false);advance(s,190);assert.equal(s.deadUntil,0);assert.deepEqual(s.position,{x:1380,y:2090});});
test('a delivered explosive opens the mountain gate without an inventory counter',()=>{const s=small();Body.setPosition(s.player.body,{x:GATE.x,y:GATE.y+80});const rock=s.create('rock',GATE.x,GATE.y,60,80,{owner:'gate'}),d=s.create('dynamite',GATE.x,GATE.y+20,26,15,{paid:true});s.command({type:'ignite',target:d.id});Body.setPosition(s.player.body,{x:GATE.x,y:GATE.y+290});advance(s,250);assert.equal(s.gateOpen,true);assert.ok(!s.entities.has(rock.id));assert.equal(s.deadUntil,0);});
test('v1 migration preserves property and converts old equipment to physical entities',()=>{const s=small(),old={...s.capture(),version:1,dynamite:2,money:315} as Snapshot;const restored=new Simulation(false);restored.restore(old);assert.equal(restored.money,315);assert.equal(restored.capture().version,3);assert.equal([...restored.entities.values()].filter(e=>e.kind==='dynamite'&&!e.room).length,2);assert.equal([...restored.entities.values()].filter(e=>e.kind==='mill').length,1);assert.ok([...restored.entities.values()].some(e=>e.room==='vale'&&e.product==='truck'));});
test('shop ownership, interior and lit fuse survive a save without duplicating stock',()=>{const s=new Simulation();Body.setPosition(s.player.body,SHOP);s.command({type:'interact'});const d=s.create('dynamite',5400,2100,26,15,{paid:true,room:'vale',fuse:s.elapsed+4});const before=s.capture(),restored=new Simulation();restored.restore(JSON.parse(JSON.stringify(before)));assert.equal(restored.interior,'vale');assert.equal(restored.entities.get(d.id)?.fuse,d.fuse);assert.equal(restored.capture().entities.length,s.capture().entities.length);});
