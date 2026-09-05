import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/simulation';
import {WORLD,LEGACY_WORLD,REGIONS,PLATEAUS,PASSAGES,ROAD,ROOMS,OLD_ROOMS,CHUNK,heightAt,traversable,groundColor,treeSeeds} from '../src/world';
const {Body}=Matter,open=new Set(PASSAGES.map(p=>p.id));
const advance=(s:Simulation,n:number)=>{for(let i=0;i<n;i++)s.step();};
function small(x:number,y:number){const s=new Simulation(false);s.player=s.create('player',x,y,19,19);return s;}

test('the registry defines a continuous territory about 25 times the previous area',()=>{assert.ok(WORLD.w*WORLD.h/(LEGACY_WORLD.w*LEGACY_WORLD.h)>24);assert.equal(REGIONS.length,9);assert.ok(ROOMS.vale.x>WORLD.w);assert.equal(treeSeeds(13,4).length>0,true);assert.deepEqual(treeSeeds(13,4),treeSeeds(13,4));});

test('all plateau roads, both shoulders and their joins remain drivable in both directions',()=>{
 for(const plateau of PLATEAUS){const route=plateau.ramp;assert.ok(heightAt(route[0])<1);assert.ok(Math.abs(heightAt(route.at(-1)!)-plateau.height)<1);
  for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],d=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
   for(const offset of [-100,0,100]){let prev={x:a.x+nx*offset,y:a.y+ny*offset};for(let i=1;i<=Math.ceil(d/12);i++){const t=i/Math.ceil(d/12),p={x:a.x+(b.x-a.x)*t+nx*offset,y:a.y+(b.y-a.y)*t+ny*offset};assert.ok(traversable(prev,p,open,true),plateau.id+' uphill '+JSON.stringify(p));assert.ok(traversable(p,prev,open,true),plateau.id+' downhill');prev=p;}}
  }
 }
 for(const road of ROAD)for(let k=1;k<road.length;k++){const a=road[k-1],b=road[k],d=Math.hypot(b.x-a.x,b.y-a.y);let prev=a;for(let i=1;i<=Math.ceil(d/20);i++){const t=i/Math.ceil(d/20),p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(p.x>5000)assert.ok(traversable(prev,p,open,true),'road cliff '+JSON.stringify(p));prev=p;}}
});

test('closed highland approaches require preparation, while cliffs cannot be driven up',()=>{
 for(const id of ['branca','ambar']){const r=PLATEAUS.find(p=>p.id===id)!.ramp;assert.equal(traversable(r[0],r[1],new Set(),true),false);assert.equal(traversable(r[0],r[1],open,true),true);}
 assert.equal(traversable({x:12000,y:200},{x:12000,y:500},open,true),false);
});

test('a real truck climbs and descends every ramp using throttle and steering',()=>{
 for(const plateau of PLATEAUS)for(const reverse of [false,true]){const route=reverse?[...plateau.ramp].reverse():plateau.ramp,s=small(route[0].x,route[0].y),truck=s.create('truck',route[0].x,route[0].y,69,124);s.driving=true;s.unlocked=new Set(open);Body.setAngle(truck.body,Math.atan2(route[1].x-route[0].x,-(route[1].y-route[0].y)));let at=1;
  for(let tick=0;tick<3000&&at<route.length;tick++){const p=truck.body.position,target=route[at],dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<75){at++;continue;}const wanted=Math.atan2(dx,-dy),error=Math.atan2(Math.sin(wanted-truck.body.angle),Math.cos(wanted-truck.body.angle));s.command({type:'move',x:Math.max(-1,Math.min(1,error*4)),y:-1});s.step();}
  assert.equal(at,route.length,plateau.id+(reverse?' descent':' ascent')+' stuck at '+JSON.stringify(truck.body.position));assert.ok(Math.abs(heightAt(truck.body.position)-heightAt(route.at(-1)!))<5);
 }
});

test('biome palettes blend continuously across the shared boundaries',()=>{for(const [x,y,dx,dy] of [[4600,2400,1,0],[9000,3400,1,0],[15000,3400,1,0],[7500,7000,0,1],[17000,9000,0,1]]){let prev=groundColor({x:x-dx*850,y:y-dy*850});for(let d=-840;d<=850;d+=10){const next=groundColor({x:x+dx*d,y:y+dy*d});assert.ok(Math.max(...next.map((v,i)=>Math.abs(v-prev[i])))<4);prev=next;}}});

test('sector unloading retains harvested trees, damaged trees, goods and exploration in compact saves',()=>{
 const s=new Simulation();Body.setPosition(s.player.body,{x:10500,y:3500});s.streamWorld();const trees=[...s.entities.values()].filter(e=>e.id.startsWith('w:')),cut=trees[0],damaged=trees[1];s.remove(cut.id);damaged.hp!--;const log=s.create('log',10500,3500,70,20);const pristine=trees[2].id;
 Body.setPosition(s.player.body,{x:21100,y:15300});s.streamWorld();assert.ok(!s.entities.has(pristine));assert.ok(s.entities.has(damaged.id));assert.ok(s.entities.has(log.id));assert.ok(s.entities.size<2600);const snapshot=s.capture();assert.ok(snapshot.entities.every(e=>!e.id.startsWith('w:')||e.hp!==e.maxHp));
 const restored=new Simulation(false);restored.restore(JSON.parse(JSON.stringify(snapshot)));Body.setPosition(restored.player.body,{x:10500,y:3500});restored.streamWorld();assert.ok(!restored.entities.has(cut.id));assert.equal(restored.entities.get(damaged.id)?.hp,damaged.hp);assert.ok(restored.entities.has(pristine));assert.ok(restored.explored.size>=18);assert.ok(restored.entities.has(log.id));
});

test('repair consumes only delivered loose planks and the crossing stays open after a save',()=>{const gate=PASSAGES.find(p=>p.id==='south-bridge')!,s=small(gate.x-220,gate.y);for(let i=0;i<gate.cost-1;i++)s.create('plank',gate.x-220,gate.y+i*18,65,14);s.command({type:'interact'});assert.ok(!s.unlocked.has(gate.id));s.create('plank',gate.x-220,gate.y-40,65,14);const distant=s.create('plank',gate.x-700,gate.y,65,14);s.command({type:'interact'});assert.ok(s.unlocked.has(gate.id));assert.equal([...s.entities.values()].filter(e=>e.kind==='plank').length,1);assert.ok(s.entities.has(distant.id));const restored=new Simulation(false);restored.restore(s.capture());assert.ok(restored.unlocked.has(gate.id));assert.ok(traversable({x:gate.x-220,y:gate.y},{x:gate.x+220,y:gate.y},restored.unlocked,true));});

test('dynamite delivered to the accessible edge clears the new rockfall',()=>{const gate=PASSAGES.find(p=>p.id==='snow-slide')!,p={x:gate.x-145,y:gate.y+218},s=small(p.x-30,p.y+30),d=s.create('dynamite',p.x,p.y,26,15,{paid:true});assert.ok(Math.hypot(p.x-gate.x,p.y-gate.y)>gate.radius);s.command({type:'ignite',target:d.id});Body.setPosition(s.player.body,{x:p.x-300,y:p.y+300});advance(s,250);assert.ok(s.unlocked.has(gate.id));assert.equal(s.deadUntil,0);});

test('v2 interior saves migrate outside the expanded world without changing purchases or money',()=>{const s=new Simulation(),snapshot=s.capture();snapshot.version=2;snapshot.interior='vale';snapshot.money=321;for(const e of snapshot.entities)if(e.room)e.x-=ROOMS[e.room].x-OLD_ROOMS[e.room].x;const player=snapshot.entities.find(e=>e.kind==='player')!;player.room='vale';player.x=OLD_ROOMS.vale.x;player.y=2100;const box=snapshot.entities.find(e=>e.room==='vale'&&e.product==='axe')!;box.paid=true;const restored=new Simulation();restored.restore(snapshot);assert.equal(restored.position.x,ROOMS.vale.x);assert.equal(restored.money,321);assert.equal(restored.entities.get(box.id)?.paid,true);assert.equal(restored.capture().entities.length,snapshot.entities.length);});

test('saved room origins survive future world growth; invalid metadata leaves the live world intact',()=>{const s=new Simulation(),snapshot=s.capture(),roomBoxes=snapshot.entities.filter(e=>e.room==='vale');snapshot.roomOrigins!.vale.x-=5000;for(const e of roomBoxes)e.x-=5000;const restored=new Simulation(false);restored.restore(snapshot);assert.equal(restored.entities.get(roomBoxes[0].id)!.body.position.x,roomBoxes[0].x+5000);const before=restored.capture();assert.throws(()=>restored.restore({...snapshot,explored:42 as any}));assert.deepEqual(restored.capture(),before);});
