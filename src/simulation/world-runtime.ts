import Matter from 'matter-js';
import { CHUNK, EXPLORE, PASSAGES, LEGACY_WORLD, chunkKey, treeSeeds, passageOpen } from '../world';
import { GATE, HARDWARE, ROOMS, SECRET, SHOP, WORLD, WOODS, biome, dist, inLand, inRiver, rng, roadDistance, type Species } from '../model';
import type { Simulation } from '../simulation';

const { Bodies, Composite }=Matter;

export function installBoundaries(sim:Simulation){
  for(const [x,y,w,h] of [[-30,WORLD.h/2,60,WORLD.h],[WORLD.w+30,WORLD.h/2,60,WORLD.h],[WORLD.w/2,-30,WORLD.w,60],[WORLD.w/2,WORLD.h+30,WORLD.w,60]])Composite.add(sim.engine.world,Bodies.rectangle(x,y,w,h,{isStatic:true}));
  // Water has colliding banks; only the broad timber bridge interrupts them.
  for(let y=0;y<WORLD.h;y+=45){ if(PASSAGES.some(b=>b.kind==='bridge'&&Math.abs(b.x-(2420+Math.sin(b.y/410)*140+Math.sin(b.y/180)*35))<200&&Math.abs(y-b.y)<(b.id==='old-bridge'?140:100)))continue;const x=2420+Math.sin(y/410)*140+Math.sin(y/180)*35;Composite.add(sim.engine.world,Bodies.rectangle(x,y,124,50,{isStatic:true,label:'river'})); }
  Composite.add(sim.engine.world,[Bodies.rectangle(SHOP.x,SHOP.y-65,190,90,{isStatic:true}),Bodies.rectangle(HARDWARE.x,HARDWARE.y-75,190,100,{isStatic:true})]);
  for(const origin of Object.values(ROOMS)){
    const {x,y}=origin;
    for(const [dx,dy,w,h]of [[0,-295,800,24],[-400,0,24,600],[400,0,24,600],[0,295,800,24]])Composite.add(sim.engine.world,Bodies.rectangle(x+dx,y+dy,w,h,{isStatic:true,label:'shop-wall'}));
    // Goods pass over the counter; its body still stops the shopper walking through it.
    Composite.add(sim.engine.world,Bodies.rectangle(x+190,y+45,190,55,{isStatic:true,label:'shop-counter',collisionFilter:{category:8,mask:~2}}));
  }
}

export function generateInitialWorld(sim:Simulation){
  sim.player=sim.create('player',1380,2090,19,19);
  const random=rng(77123);
  for(let i=0;i<1250;i++){
    const p={x:100+random()*4400,y:100+random()*3500};
    if(inLand(p,-120)||roadDistance(p)<120||inRiver(p)||dist(p,SHOP)<220||dist(p,HARDWARE)<240||sim.saleClearing(p)||dist(p,SECRET)<130||dist(p,{x:560,y:1690})<65)continue;
    if(p.x>2460&&p.y>1040&&p.y<1250)continue;
    const b=biome(p);const species:Species=b==='snow'?'snow':b==='gold'?'gold':random()<.22?'birch':'pine';
    const size=.75+random()*.6;const hp=Math.round(WOODS[species].hp*size);
    sim.create('tree',p.x,p.y,20*size,20*size,{species,size,seed:i*912+7,hp,maxHp:hp});
  }
  // A nearby tree teaches by being present, without directing the player.
  sim.create('tree',1300,1750,23,23,{species:'pine',size:1.1,hp:5,maxHp:5,seed:117});
  for(let x=2550;x<LEGACY_WORLD.w;x+=65){if(Math.abs(x-GATE.x)<90)continue;sim.create('rock',x,1130+Math.sin(x*.1)*13,80,95,{size:1.9,seed:x});}
  for(let i=0;i<3;i++)sim.create('rock',GATE.x+(i-1)*47,GATE.y,58,88,{size:1.7,owner:'gate',seed:i+71});
  for(let y=80;y<1840;y+=70){if(Math.abs(y-SECRET.y)<90)continue;sim.create('rock',3560+Math.sin(y*.01)*15,y,80,90,{size:1.5,seed:y});}
  for(let x=3560;x<LEGACY_WORLD.w+40;x+=65)sim.create('rock',x,1840+Math.sin(x*.02)*9,82,86,{size:1.4,seed:x+31});
  sim.create('rock',3560,SECRET.y,70,160,{owner:'secret',size:2.1,seed:991});
  sim.create('relic',550,1690,26,26,{seed:531});
  sim.restock();
}

export function streamWorld(sim:Simulation){
  if(!sim.streaming||!sim.player||sim.interior)return;
  const focus=sim.position,cx=Math.floor(focus.x/CHUNK),cy=Math.floor(focus.y/CHUNK),wanted=new Set<string>();
  for(let x=cx-2;x<=cx+2;x++)for(let y=cy-2;y<=cy+2;y++){if(x<0||y<0||x*CHUNK>=WORLD.w||y*CHUNK>=WORLD.h)continue;const key=x+','+y;wanted.add(key);if(sim.loadedChunks.has(key))continue;
    for(const t of treeSeeds(x,y)){if(sim.removedTrees.has(t.id)||sim.entities.has(t.id))continue;const hp=Math.round(WOODS[t.species].hp*t.size);sim.create('tree',t.x,t.y,20*t.size,20*t.size,{species:t.species,size:t.size,seed:t.seed,hp,maxHp:hp},t.id);}sim.loadedChunks.add(key);}
  for(const key of [...sim.loadedChunks])if(!wanted.has(key)){sim.loadedChunks.delete(key);for(const e of [...sim.entities.values()])if(e.id.startsWith('w:')&&chunkKey(e.body.position)===key&&e.hp===e.maxHp&&e.fallAt===undefined){Composite.remove(sim.engine.world,e.body);sim.entities.delete(e.id);}}
  const ex=Math.floor(focus.x/EXPLORE),ey=Math.floor(focus.y/EXPLORE);for(let x=ex-1;x<=ex+1;x++)for(let y=ey-1;y<=ey+1;y++)if(x>=0&&y>=0&&x*EXPLORE<WORLD.w&&y*EXPLORE<WORLD.h)sim.explored.add(x+','+y);
}

export function nearbyPassage(sim:Simulation){if(sim.interior)return;return PASSAGES.find(p=>!passageOpen(p,sim.unlocked)&&dist(p,sim.position)<p.radius+175);}

export function interactPassage(sim:Simulation){
  const p=nearbyPassage(sim);if(!p)return false;
  if(p.kind==='rockfall'){sim.emit('note',p,'A estrada sumiu sob as pedras. Uma carga de dinamite pode abrir passagem.');return true;}
  const boards=[...sim.entities.values()].filter(e=>e.kind==='plank'&&!e.room&&!e.tied&&dist(e.body.position,p)<350);
  if(boards.length<p.cost){sim.emit('note',p,'A travessia precisa de '+p.cost+' tábuas próximas. Faltam '+(p.cost-boards.length)+'.');return true;}
  boards.slice(0,p.cost).forEach(e=>sim.remove(e.id));sim.unlocked.add(p.id);sim.emit('build',p,'A travessia está firme. Pode passar.');return true;
}
