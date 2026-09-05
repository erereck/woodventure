import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/simulation';
import {SHOP,roomCounter} from '../src/model';
const {Body}=Matter;
function shop(){const s=new Simulation();Body.setPosition(s.player.body,SHOP);s.command({type:'interact'});const c=roomCounter('vale');Body.setPosition(s.player.body,{x:c.x,y:c.y+70});return{s,c};}
test('releasing goods beside the counter seats them on free spots and they stay above its collider',()=>{
 const {s,c}=shop();const boxes=[...s.entities.values()].filter(e=>e.room==='vale'&&e.kind==='box').slice(0,3);
 for(const e of boxes){Body.setPosition(e.body,{x:c.x,y:c.y+60});s.command({type:'grab',target:e.id});assert.equal(s.held,e.id);const slot=s.counterPlacement(e);assert.ok(slot);s.command({type:'release'});assert.deepEqual(e.body.position,slot);assert.equal(e.body.angle,0);}
 for(let i=0;i<120;i++)s.step();for(const e of boxes){assert.ok(Math.abs(e.body.position.y-(c.y-28))<1);assert.ok(Math.abs(e.body.position.x-c.x)<85);}
 assert.equal(new Set(boxes.map(e=>Math.round(e.body.position.x))).size,3);
 const restored=new Simulation();restored.restore(s.capture());for(let i=0;i<30;i++)restored.step();for(const e of boxes)assert.ok(Math.abs(restored.entities.get(e.id)!.body.position.y-e.body.position.y)<1);
});
test('E can seat and purchase a held item; distant products do not snap to the register',()=>{
 const {s,c}=shop();const e=[...s.entities.values()].find(e=>e.room==='vale'&&e.product==='axe')!;assert.equal(s.counterPlacement(e),undefined);
 Body.setPosition(e.body,{x:c.x,y:c.y+60});s.command({type:'grab',target:e.id});s.money=100;s.command({type:'checkout'});assert.equal(s.held,null);assert.equal(e.paid,true);assert.equal(s.money,25);assert.equal(e.body.position.y,c.y-28);
 s.command({type:'checkout'});assert.equal(s.money,25);
});
