import { CHUNK, EXPLORE, PASSAGES, OLD_ROOMS, LEGACY_WORLD, chunkKey, treeSeeds, heightAt, traversable, blockedPassage, passageOpen } from './world';
import Matter from 'matter-js';
import { BUILD, BUYER, GATE, HARDWARE, LAND, MILL, SECRET, SHOP, WORLD, WOODS, PRODUCTS, ROOMS, STOCK, roomCounter, roomDoor, localPoint, worldPoint, movable, biome, clamp, dist, inLand, inRiver, rng, roadDistance, type Command, type Entity, type Envelope, type GameEvent, type Piece, type Product, type ShopId, type Snapshot, type Species, type Vec } from './model';
const { Engine, Bodies, Body, Composite, Constraint } = Matter;
const STEP = 1000/60;
export class Simulation {
  engine=Engine.create({gravity:{x:0,y:0},positionIterations:8,velocityIterations:8});
  entities=new Map<string,Entity>(); events:GameEvent[]=[]; tick=0; nextId=1;
  money=0; fuel=100; axe=.6; driving=false; lights=false; elapsed=0; truckUpgrade=false;
  gateOpen=false; secretOpen=false; player!:Entity; truck:Entity|undefined;
  interior:ShopId|undefined; facing=-Math.PI/2; swing:NonNullable<Snapshot['swing']>={at:-10,angle:0,reach:40}; deadUntil=0;
  movement={x:0,y:0,brake:false}; aim:Vec={x:1450,y:1900}; held:string|null=null;
  private grabConstraint:Matter.Constraint|null=null; private ties=new Map<string,Matter.Constraint>();
  private queue:Envelope[]=[]; private lastSeq=new Map<string,number>(); private cooldown=0;
  private streaming=true;private loadedChunks=new Set<string>();removedTrees=new Set<string>();explored=new Set<string>();unlocked=new Set<string>();
  constructor(populate=true) {this.streaming=populate;this.boundaries();if(populate){this.generate();this.streamWorld();}}
  emit(type:GameEvent['type'],p:Vec,message?:string,amount?:number) {this.events.push({type,x:p.x,y:p.y,message,amount});}
  create(kind:Entity['kind'],x:number,y:number,w:number,h:number,opts:Partial<Omit<Entity,'kind'|'body'|'w'|'h'>>={},id?:string) {
    const fixed=kind==='tree'||kind==='rock'||kind==='structure'||kind==='mill';
    const body=(kind==='player'||kind==='tree')?Bodies.circle(x,y,w/2,{isStatic:fixed}):Bodies.rectangle(x,y,w,h,{isStatic:fixed,chamfer:{radius:kind==='truck'?6:2}});
    body.frictionAir=kind==='truck'?.045:kind==='player'?.2:.065;
    body.friction=.4;body.restitution=kind==='log'?.14:.05;
    if(kind==='player'){ Body.setInertia(body,Infinity); Body.setMass(body,5); }
    if(kind==='truck'){Body.setMass(body,180);Body.setInertia(body,200000);body.collisionFilter.category=4;body.collisionFilter.mask=~2;}
    if(['log','plank','relic','box','tool','dynamite'].includes(kind)){Body.setMass(body,Math.max(.6,w*h*(kind==='plank'?.002:.004)));body.collisionFilter.category=2;}
    const e:Entity={id:id??`e${this.nextId++}`,kind,body,w,h,owner:'local',seed:this.nextId*137,size:1,...opts};
    if(kind==='structure'&&(e.piece==='floor'||e.piece==='conveyor')) body.isSensor=true;
    if(kind==='mill')body.isSensor=true;
    body.label=e.id;this.entities.set(e.id,e);Composite.add(this.engine.world,body);if(kind==='truck')this.truck=e;return e;
  }
  private boundaries() {
    for(const [x,y,w,h] of [[-30,WORLD.h/2,60,WORLD.h],[WORLD.w+30,WORLD.h/2,60,WORLD.h],[WORLD.w/2,-30,WORLD.w,60],[WORLD.w/2,WORLD.h+30,WORLD.w,60]])Composite.add(this.engine.world,Bodies.rectangle(x,y,w,h,{isStatic:true}));
    // Water has colliding banks; only the broad timber bridge interrupts them.
    for(let y=0;y<WORLD.h;y+=45){ if(PASSAGES.some(b=>b.kind==='bridge'&&Math.abs(b.x-(2420+Math.sin(b.y/410)*140+Math.sin(b.y/180)*35))<200&&Math.abs(y-b.y)<(b.id==='old-bridge'?140:100)))continue;const x=2420+Math.sin(y/410)*140+Math.sin(y/180)*35;Composite.add(this.engine.world,Bodies.rectangle(x,y,124,50,{isStatic:true,label:'river'})); }
    Composite.add(this.engine.world,[Bodies.rectangle(SHOP.x,SHOP.y-65,190,90,{isStatic:true}),Bodies.rectangle(HARDWARE.x,HARDWARE.y-75,190,100,{isStatic:true})]);
    for(const origin of Object.values(ROOMS)){
      const {x,y}=origin;
      for(const [dx,dy,w,h]of [[0,-295,800,24],[-400,0,24,600],[400,0,24,600],[0,295,800,24]])Composite.add(this.engine.world,Bodies.rectangle(x+dx,y+dy,w,h,{isStatic:true,label:'shop-wall'}));
      // Goods pass over the counter; its body still stops the shopper walking through it.
      Composite.add(this.engine.world,Bodies.rectangle(x+190,y+45,190,55,{isStatic:true,label:'shop-counter',collisionFilter:{category:8,mask:~2}}));
    }
  }
  private generate() {
    this.player=this.create('player',1380,2090,19,19);
    const random=rng(77123);
    for(let i=0;i<1250;i++){
      const p={x:100+random()*4400,y:100+random()*3500};
      if(inLand(p,-120)||roadDistance(p)<120||inRiver(p)||dist(p,SHOP)<220||dist(p,HARDWARE)<240||this.saleClearing(p)||dist(p,SECRET)<130||dist(p,{x:560,y:1690})<65)continue;
      if(p.x>2460&&p.y>1040&&p.y<1250)continue;
      const b=biome(p);const species:Species=b==='snow'?'snow':b==='gold'?'gold':random()<.22?'birch':'pine';
      const size=.75+random()*.6;const hp=Math.round(WOODS[species].hp*size);
      this.create('tree',p.x,p.y,20*size,20*size,{species,size,seed:i*912+7,hp,maxHp:hp});
    }
    // A nearby tree teaches by being present, without directing the player.
    this.create('tree',1300,1750,23,23,{species:'pine',size:1.1,hp:5,maxHp:5,seed:117});
    for(let x=2550;x<LEGACY_WORLD.w;x+=65){if(Math.abs(x-GATE.x)<90)continue;this.create('rock',x,1130+Math.sin(x*.1)*13,80,95,{size:1.9,seed:x});}
    for(let i=0;i<3;i++)this.create('rock',GATE.x+(i-1)*47,GATE.y,58,88,{size:1.7,owner:'gate',seed:i+71});
    for(let y=80;y<1840;y+=70){if(Math.abs(y-SECRET.y)<90)continue;this.create('rock',3560+Math.sin(y*.01)*15,y,80,90,{size:1.5,seed:y});}
    for(let x=3560;x<LEGACY_WORLD.w+40;x+=65)this.create('rock',x,1840+Math.sin(x*.02)*9,82,86,{size:1.4,seed:x+31});
    this.create('rock',3560,SECRET.y,70,160,{owner:'secret',size:2.1,seed:991});
    this.create('relic',550,1690,26,26,{seed:531});
    this.restock();
  }
  streamWorld(){
    if(!this.streaming||!this.player||this.interior)return;
    const focus=this.position,cx=Math.floor(focus.x/CHUNK),cy=Math.floor(focus.y/CHUNK),wanted=new Set<string>();
    for(let x=cx-2;x<=cx+2;x++)for(let y=cy-2;y<=cy+2;y++){if(x<0||y<0||x*CHUNK>=WORLD.w||y*CHUNK>=WORLD.h)continue;const key=x+','+y;wanted.add(key);if(this.loadedChunks.has(key))continue;
      for(const t of treeSeeds(x,y)){if(this.removedTrees.has(t.id)||this.entities.has(t.id))continue;const hp=Math.round(WOODS[t.species].hp*t.size);this.create('tree',t.x,t.y,20*t.size,20*t.size,{species:t.species,size:t.size,seed:t.seed,hp,maxHp:hp},t.id);}this.loadedChunks.add(key);}
    for(const key of [...this.loadedChunks])if(!wanted.has(key)){this.loadedChunks.delete(key);for(const e of [...this.entities.values()])if(e.id.startsWith('w:')&&chunkKey(e.body.position)===key&&e.hp===e.maxHp&&e.fallAt===undefined){Composite.remove(this.engine.world,e.body);this.entities.delete(e.id);}}
    const ex=Math.floor(focus.x/EXPLORE),ey=Math.floor(focus.y/EXPLORE);for(let x=ex-1;x<=ex+1;x++)for(let y=ey-1;y<=ey+1;y++)if(x>=0&&y>=0&&x*EXPLORE<WORLD.w&&y*EXPLORE<WORLD.h)this.explored.add(x+','+y);
  }
  nearbyPassage(){if(this.interior)return;return PASSAGES.find(p=>!passageOpen(p,this.unlocked)&&dist(p,this.position)<p.radius+175);}
  private interactPassage(){const p=this.nearbyPassage();if(!p)return false;if(p.kind==='rockfall'){this.emit('note',p,'A estrada sumiu sob as pedras. Uma carga de dinamite pode abrir passagem.');return true;}const boards=[...this.entities.values()].filter(e=>e.kind==='plank'&&!e.room&&!e.tied&&dist(e.body.position,p)<350);if(boards.length<p.cost){this.emit('note',p,'A travessia precisa de '+p.cost+' tábuas próximas. Faltam '+(p.cost-boards.length)+'.');return true;}boards.slice(0,p.cost).forEach(e=>this.remove(e.id));this.unlocked.add(p.id);this.emit('build',p,'A travessia está firme. Pode passar.');return true;}
  receive(e:Envelope) {
    if(e.actor!=='local'||e.seq<=(this.lastSeq.get(e.actor)??0)||!Number.isFinite(e.seq)||e.tick>this.tick+120)return;
    this.lastSeq.set(e.actor,e.seq);this.queue.push(e);
  }
  get position() {return (this.driving&&this.truck?this.truck:this.player).body.position;}
  saleClearing(p:Vec){return Math.abs(p.x-BUYER.x)<285&&p.y>BUYER.y-270&&p.y<BUYER.y+460;}
  step() {
    for(const e of this.queue)this.command(e.command);this.queue.length=0;
    this.tick++;this.elapsed+=1/60;if(this.tick%30===0)this.streamWorld();this.cooldown=Math.max(0,this.cooldown-1/60);
    if(this.swing.target&&!this.swing.hit&&this.elapsed-this.swing.at>=.22){this.swing.hit=true;this.hitWood(this.swing.target);}
    if(this.deadUntil){if(this.elapsed>=this.deadUntil){this.deadUntil=0;this.interior=undefined;this.player.room=undefined;Body.setPosition(this.player.body,{x:1380,y:2090});Body.setVelocity(this.player.body,{x:0,y:0});this.movement={x:0,y:0,brake:false};this.emit('transition',this.position,'Você voltou ao terreno. Seus objetos ficaram onde estavam.');}else return;}
    const p=this.player.body, t=this.truck?.body;
    if(this.driving&&t){
      const forward={x:Math.sin(t.angle),y:-Math.cos(t.angle)};
      const speed=t.velocity.x*forward.x+t.velocity.y*forward.y;
      const cargo=[...this.ties.keys()].reduce((n,id)=>n+(this.entities.get(id)?.body.mass??0),0);
      const terrain=biome(t.position)==='marsh'?.36:roadDistance(t.position)>100?.64:1;
      const throttle=-this.movement.y;
      const power=(this.truckUpgrade?.0018:.0013)*terrain/(1+cargo/180);
      if(this.fuel>0)Body.applyForce(t,t.position,{x:forward.x*throttle*power*t.mass,y:forward.y*throttle*power*t.mass});
      const lateral={x:Math.cos(t.angle),y:Math.sin(t.angle)};
      const slip=t.velocity.x*lateral.x+t.velocity.y*lateral.y;
      Body.setVelocity(t,{x:t.velocity.x-lateral.x*slip*.17,y:t.velocity.y-lateral.y*slip*.17});
      Body.setAngularVelocity(t,this.movement.x*.030*clamp(speed/2,-1,1));
      if(this.movement.brake)Body.setVelocity(t,{x:t.velocity.x*.89,y:t.velocity.y*.89});
      this.fuel=Math.max(0,this.fuel-Math.abs(throttle)*.0008);
      Body.setPosition(p,t.position);p.isSensor=true;
    } else {
      p.isSensor=false;
      const m=Math.hypot(this.movement.x,this.movement.y)||1;
      const drag=this.held? .70:1;
      Body.setVelocity(p,{x:this.movement.x/m*2.4*drag,y:this.movement.y/m*2.4*drag});
    }
    if(dist(this.aim,p.position)>5&&this.elapsed-this.swing.at>.42)this.facing=Math.atan2(this.aim.y-p.position.y,this.aim.x-p.position.x);
    if(this.grabConstraint&&this.held){
      const d=dist(this.aim,p.position);const reach=Math.min(d,108);
      this.grabConstraint.pointA={x:p.position.x+(this.aim.x-p.position.x)/(d||1)*reach,y:p.position.y+(this.aim.y-p.position.y)/(d||1)*reach};
      const item=this.entities.get(this.held);if(!item||dist(item.body.position,p.position)>210)this.release();
    }
    const previous=[...this.entities.values()].filter(e=>!e.body.isStatic&&!e.room&&!e.tied).map(e=>({e,p:{...e.body.position}}));
    Engine.update(this.engine,STEP);
    for(const {e,p:before} of previous)if(!traversable(before,e.body.position,this.unlocked,e.kind==='truck')){Body.setPosition(e.body,before);Body.setVelocity(e.body,{x:0,y:0});}
    if(this.driving&&t)Body.setPosition(p,t.position);
    const mills=[...this.entities.values()].filter(e=>e.kind==='mill'),conveyors=[...this.entities.values()].filter(e=>e.kind==='structure'&&e.piece==='conveyor');
    for(const e of [...this.entities.values()]){
      if(e.kind==='tree'&&e.fallAt!==undefined&&this.elapsed-e.fallAt>1.3){
        const a=e.fallAngle??0;const p=e.body.position;
        for(let i=0;i<3;i++){const l=this.create('log',p.x+Math.cos(a)*(24+i*43)*e.size,p.y+Math.sin(a)*(24+i*43)*e.size,(65-i*7)*e.size,21*e.size,{species:e.species,size:e.size});Body.setAngle(l.body,a);Body.setVelocity(l.body,{x:Math.cos(a)*1.1,y:Math.sin(a)*1.1});}
        this.remove(e.id);this.emit('wood',p);
      }
      if(e.kind==='dynamite'&&e.fuse!==undefined&&this.elapsed>=e.fuse){this.explode(e.body.position,e.room);this.remove(e.id);}
      if(movable(e)&&t&&!e.room&&!e.tied&&this.held!==e.id&&this.inBed(e.body.position))Body.setVelocity(e.body,{x:e.body.velocity.x+(t.velocity.x-e.body.velocity.x)*.1,y:e.body.velocity.y+(t.velocity.y-e.body.velocity.y)*.1});
      if(e.kind==='log'||e.kind==='plank'){
        const q=e.body.position;
        const mill=e.millId?this.entities.get(e.millId):e.kind==='log'&&!e.room&&!e.tied?mills.find(m=>this.atInlet(e,m)):undefined;
        if(mill&&e.kind==='log'){
          if(this.held===e.id)this.release();e.millId=mill.id;e.process=(e.process??0)+1/60;
          const f=clamp(e.process/3.2,0,1),feed=worldPoint({x:-75+f*95,y:0},mill.body.position,mill.body.angle);
          Body.setPosition(e.body,feed);Body.setVelocity(e.body,{x:0,y:0});Body.setAngle(e.body,mill.body.angle);e.body.isSensor=true;
          if(e.process>3.2){this.remove(e.id);for(let j=0;j<2;j++){const out=worldPoint({x:127,y:-11+j*23},mill.body.position,mill.body.angle);const plank=this.create('plank',out.x,out.y,e.w,14,{species:e.species,size:e.size});Body.setAngle(plank.body,mill.body.angle);Body.setVelocity(plank.body,{x:Math.cos(mill.body.angle)*1.1,y:Math.sin(mill.body.angle)*1.1});}this.emit('wood',feed);}
        }else if(!e.room&&q.x>BUYER.x-BUYER.w/2&&q.x<BUYER.x+BUYER.w/2&&q.y>BUYER.y-BUYER.h/2&&q.y<BUYER.y+BUYER.h/2&&this.held!==e.id){
          e.process=(e.process??0)+1/60;
          if(e.process>1.5){const value=Math.round(WOODS[e.species??'pine'].value*(e.w/65)*(e.kind==='plank'?1.45:1));this.money+=value;this.remove(e.id);this.emit('sell',q,undefined,value);}
        }else {e.process=0;e.millId=undefined;e.body.isSensor=false;}
        for(const s of conveyors)if(dist(q,s.body.position)<46&&!e.tied&&this.held!==e.id)Body.setVelocity(e.body,{x:Math.cos(s.body.angle)*1.2,y:Math.sin(s.body.angle)*1.2});
      }
    }
    if(!this.secretOpen){const relic=[...this.entities.values()].find(e=>e.kind==='relic');if(relic&&dist(relic.body.position,{x:3505,y:SECRET.y})<52){this.secretOpen=true;for(const e of [...this.entities.values()])if(e.owner==='secret')this.remove(e.id);this.release();this.remove(relic.id);this.emit('secret',{x:3560,y:SECRET.y},'O metal se encaixa. Algo se move do outro lado.');}}
  }
  command(c:Command) {
    if(this.deadUntil)return;
    const p=this.player.body.position;
    switch(c.type){
      case 'move': if(Number.isFinite(c.x)&&Number.isFinite(c.y))this.movement={x:clamp(c.x,-1,1),y:clamp(c.y,-1,1),brake:!!c.brake};break;
      case 'aim': if(Number.isFinite(c.x)&&Number.isFinite(c.y))this.aim={x:c.x,y:c.y};break;
      case 'lights':this.lights=!this.lights;break;
      case 'chop':{
        if(this.driving||this.cooldown>0)return;
        const e=this.entities.get(c.target);if(!e||e.room!==this.interior||dist(e.body.position,p)>105||!e.room&&Math.abs(heightAt(e.body.position)-heightAt(p))>35||e.fallAt!==undefined||e.millId||!['tree','log'].includes(e.kind))return;
        this.cooldown=this.axe<1?.82:.61;
        this.facing=Math.atan2(e.body.position.y-p.y,e.body.position.x-p.x);
        this.swing={at:this.elapsed,angle:this.facing,reach:dist(e.body.position,p),target:e.id,hit:false};break;
      }
      case 'grab':{
        if(this.driving)return;const e=this.entities.get(c.target);
        if(!e||!movable(e)||e.room!==this.interior||dist(e.body.position,p)>125||!e.room&&Math.abs(heightAt(e.body.position)-heightAt(p))>45||e.tied||e.millId)return;
        this.release();this.held=e.id;
        this.grabConstraint=Constraint.create({pointA:{...e.body.position},bodyB:e.body,pointB:{x:0,y:0},length:0,stiffness:.025,damping:.12});Composite.add(this.engine.world,this.grabConstraint);break;
      }
      case 'release':{const item=this.held?this.entities.get(this.held):undefined;this.release();if(item)this.placeOnCounter(item);break;}
      case 'rotate':{const e=this.held?this.entities.get(this.held):null;if(e)Body.setAngularVelocity(e.body,clamp(c.direction,-1,1)*.035);break;}
      case 'interact':{
        if(this.interior){const door=roomDoor(this.interior);if(dist(p,door)<110)this.changeRoom(undefined);else if(dist(p,roomCounter(this.interior))<145)this.checkout();else this.emit('note',p,'Leve a caixa até o balcão e fale com o vendedor.');break;}
        if(this.interactPassage())break;
        if(!this.driving&&(dist(p,SHOP)<155||dist(p,HARDWARE)<155)){this.changeRoom(dist(p,SHOP)<155?'vale':'east');break;}
        if(this.driving){
          const t=this.truck!.body;
          if(Math.hypot(t.velocity.x,t.velocity.y)>3){this.emit('note',t.position,'Pare a caminhonete antes de sair.');return;}
          this.driving=false;const q={x:t.position.x+Math.cos(t.angle)*65,y:t.position.y+Math.sin(t.angle)*65};Body.setPosition(this.player.body,q);Body.setVelocity(this.player.body,{x:0,y:0});this.player.body.isSensor=false;
        }else if(this.truck&&dist(p,this.truck.body.position)<120){this.release();this.driving=true;this.emit('engine',p);}
        break;
      }
      case 'checkout':this.checkout();break;
      case 'open':this.openPackage(c.target);break;
      case 'deploy':this.deploy(c.target,c.x,c.y,c.angle);break;
      case 'rope':{
        if(!this.truck||this.interior||dist(this.position,this.truck.body.position)>150)return;
        if(this.ties.size){for(const [id,c]of this.ties){Composite.remove(this.engine.world,c);const e=this.entities.get(id);if(e){e.tied=false;e.body.collisionFilter.group=0;}}this.ties.clear();this.emit('note',p,'Cordas soltas.');}
        else {for(const e of this.entities.values())if(movable(e)&&e.paid!==false&&this.inBed(e.body.position)){this.tie(e);if(this.held===e.id)this.release();}this.emit('note',p,this.ties.size?'Carga amarrada.':'Coloque os objetos na caçamba antes de amarrar.');}break;
      }
      case 'build':this.build(c.piece,c.x,c.y,c.angle);break;
      case 'remove':{const e=this.entities.get(c.target);if(e?.kind==='structure'&&e.owner==='local'&&dist(e.body.position,p)<160){for(let i=0;i<BUILD[e.piece!].cost;i++)this.create('plank',e.body.position.x+i*18,e.body.position.y+30,65,14,{species:'pine'});this.remove(e.id);this.emit('wood',p);}break;}
      case 'ignite':{
        const e=this.entities.get(c.target);
        if(this.driving||!e||e.kind!=='dynamite'||e.room!==this.interior||e.paid===false||e.fuse!==undefined||dist(p,e.body.position)>120)return;
        e.fuse=this.elapsed+4;if(this.held===e.id)this.release();this.emit('note',e.body.position,'Pavio aceso. Afaste-se!');break;
      }
    }
  }
  private hitWood(id:string){
    const e=this.entities.get(id);if(!e||dist(e.body.position,this.player.body.position)>145)return;
    if(e.kind==='tree'&&e.fallAt===undefined){e.hp=(e.hp??5)-this.axe;e.cutAt=this.elapsed;this.emit('chop',e.body.position);
      if(e.hp<=.001){e.fallAt=this.elapsed;e.fallAngle=this.swing.angle;e.body.isSensor=true;this.emit('fall',e.body.position);}
    }else if(e.kind==='log'&&!e.tied&&e.w>38&&!e.millId){const a=e.body.angle,q={...e.body.position};this.remove(e.id);for(const sign of [-1,1]){const n=this.create('log',q.x+Math.cos(a)*e.w*.25*sign,q.y+Math.sin(a)*e.w*.25*sign,e.w/2-1,e.h,{species:e.species,size:e.size,room:e.room});Body.setAngle(n.body,a);}this.emit('chop',q);}
  }
  private atInlet(log:Entity,mill:Entity){
    const p=localPoint(log.body.position,mill.body.position,mill.body.angle);
    return p.x>-125&&p.x<-12&&Math.abs(p.y)<34;
  }
  private restock(){
    for(const shop of ['vale','east'] as ShopId[])STOCK[shop].forEach((product,slot)=>{
      if([...this.entities.values()].some(e=>e.room===shop&&e.slot===slot&&e.paid===false))return;
      const p=ROOMS[shop],x=p.x-290+(slot%3)*225,y=p.y-170+Math.floor(slot/3)*130;
      this.create(product==='dynamite'?'dynamite':'box',x,y,product==='dynamite'?26:43,product==='dynamite'?15:36,{product,paid:false,slot,room:shop,owner:'shop:'+shop});
    });
  }
  private changeRoom(room:ShopId|undefined){
    const carried=this.held?this.entities.get(this.held):undefined;
    if(!room&&carried?.paid===false){this.emit('note',this.position,'Falta pagar por esse produto no balcão.');return;}
    if(carried?.fuse!==undefined){this.emit('note',this.position,'Largue a dinamite acesa!');return;}
    const exterior=this.interior==='east'?HARDWARE:SHOP;
    const destination=room?{x:roomDoor(room).x,y:roomDoor(room).y-15}:{x:exterior.x,y:exterior.y+88};
    this.interior=room;this.player.room=room;Body.setPosition(this.player.body,destination);Body.setVelocity(this.player.body,{x:0,y:0});
    this.aim={x:destination.x,y:destination.y-65};
    if(carried){carried.room=room;Body.setPosition(carried.body,{x:destination.x,y:destination.y+(room?-58:48)});Body.setVelocity(carried.body,{x:0,y:0});}
    this.movement={x:0,y:0,brake:false};this.restock();this.emit('transition',destination,room?'Leve o produto ao balcão. E para conversar com o vendedor.':undefined);
  }
  counterPlacement(e:Entity):Vec|undefined {
    if(!this.interior||e.room!==this.interior||!e.product||e.fuse!==undefined||dist(this.position,roomCounter(this.interior))>160)return;
    const c=roomCounter(this.interior),p=e.body.position;
    if(Math.abs(p.x-c.x)>140||p.y<c.y-110||p.y>c.y+105)return;
    const slots=[-65,-12,41].map(x=>({x:c.x+x,y:c.y-28}));
    return slots.find(p=>![...this.entities.values()].some(other=>other.id!==e.id&&other.room===e.room&&movable(other)&&dist(other.body.position,p)<45));
  }
  private placeOnCounter(e:Entity){const p=this.counterPlacement(e);if(!p)return;Body.setPosition(e.body,p);Body.setVelocity(e.body,{x:0,y:0});Body.setAngularVelocity(e.body,0);Body.setAngle(e.body,0);this.emit('wood',p);}
  private checkout(){
    if(!this.interior||dist(this.player.body.position,roomCounter(this.interior))>145)return;
    const counter=roomCounter(this.interior);
    const held=this.held?this.entities.get(this.held):undefined;if(held&&this.counterPlacement(held)){this.release();this.placeOnCounter(held);}
    const goods=[...this.entities.values()].filter(e=>e.room===this.interior&&e.paid===false&&e.product&&Math.abs(e.body.position.x-counter.x)<140&&Math.abs(e.body.position.y-counter.y)<95);
    if(!goods.length){this.emit('note',counter,'Pode trazer a caixa aqui no balcão.');return;}
    const total=goods.reduce((sum,e)=>sum+PRODUCTS[e.product!].price,0);
    if(this.money<total){this.emit('note',counter,'Faltam $ '+(total-this.money)+' para pagar esses produtos.');return;}
    this.money-=total;goods.forEach(e=>{e.paid=true;e.owner='local';e.slot=undefined;});
    this.emit('note',counter,'Tudo certo. $ '+total+' pagos. Pode levar.');this.restock();
  }
  private openPackage(id:string){
    const e=this.entities.get(id);if(!e||e.room!==this.interior||dist(this.player.body.position,e.body.position)>125||e.tied)return;
    if(e.paid===false){this.emit('note',e.body.position,'Pague a caixa antes de abrir.');return;}
    if(e.kind==='tool'){
      const old=this.axe;this.axe=e.toolPower??1;e.toolPower=old;this.emit('note',e.body.position,'Machado equipado. O anterior ficou no chão.');return;
    }
    if(e.kind!=='box'||!e.product)return;
    if(e.product==='truck'||e.product==='mill'){this.emit('note',e.body.position,'Leve a caixa ao terreno e use X para posicionar.');return;}
    if(e.product==='fuel'){if(!this.truck||dist(e.body.position,this.truck.body.position)>150){this.emit('note',e.body.position,'Leve o galão até a caminhonete.');return;}this.fuel=100;this.remove(id);this.emit('note',this.position,'Tanque abastecido.');return;}
    const q={...e.body.position},old=this.axe;
    this.axe=e.product==='steelAxe'?2:1;this.remove(id);this.create('tool',q.x,q.y,32,12,{toolPower:old,paid:true,room:this.interior});this.emit('wood',q);this.emit('note',q,'Machado novo equipado. O anterior ficou no chão.');
  }
  private deploy(id:string,x:number,y:number,angle:number){
    const e=this.entities.get(id);if(!e||!Number.isFinite(x+y+angle)||this.driving||this.interior||e.paid===false||e.tied||dist(this.position,e.body.position)>145)return;
    const kind=e.kind==='mill'?'mill':e.kind==='box'&&['truck','mill'].includes(e.product!)?e.product:undefined;
    if(!kind)return;
    const p={x,y};if(!inLand(e.body.position,0)||!inLand(p,100)||dist(this.position,p)>210){this.emit('note',p,'Posicione dentro do terreno, perto de você.');return;}
    if(kind==='truck'&&this.truck){this.emit('note',p,'Você já tem uma caminhonete neste protótipo.');return;}
    if([...this.entities.values()].some(o=>o.id!==id&&['truck','mill','structure','tree'].includes(o.kind)&&!(o.kind==='structure'&&o.piece==='floor')&&dist(o.body.position,p)<115)){this.emit('note',p,'Deixe mais espaço livre para instalar.');return;}
    if(e.kind==='mill'){if([...this.entities.values()].some(o=>o.millId===id)){this.emit('note',p,'Espere a refinadora terminar.');return;}Body.setPosition(e.body,p);Body.setAngle(e.body,angle);}
    else{this.remove(id);const n=this.create(kind as 'truck'|'mill',x,y,kind==='truck'?69:200,kind==='truck'?124:64);Body.setAngle(n.body,angle);}
    this.emit('build',p);this.emit('note',p,kind==='truck'?'Caminhonete pronta.':'Refinadora instalada. Alimente a mesa de entrada.');
  }
  private release(){if(this.grabConstraint)Composite.remove(this.engine.world,this.grabConstraint);this.grabConstraint=null;this.held=null;}
  inBed(p:Vec){if(!this.truck)return false;const t=this.truck.body;const dx=p.x-t.position.x,dy=p.y-t.position.y;const x=dx*Math.cos(t.angle)+dy*Math.sin(t.angle),y=-dx*Math.sin(t.angle)+dy*Math.cos(t.angle);return Math.abs(x)<46&&y>-3&&y<83;}
  private tie(e:Entity){if(!this.truck)return;const t=this.truck.body;const dx=e.body.position.x-t.position.x,dy=e.body.position.y-t.position.y;const constraint=Constraint.create({bodyA:t,pointA:{x:dx,y:dy},bodyB:e.body,length:0,stiffness:.8,damping:.3});e.tied=true;this.ties.set(e.id,constraint);Composite.add(this.engine.world,constraint);e.body.collisionFilter.group=-1;t.collisionFilter.group=-1;}
  private build(piece:Piece,x:number,y:number,angle:number){
    const def=BUILD[piece];if(!def||![x,y,angle].every(Number.isFinite)||this.driving||this.interior)return;
    const q={x,y};if(!inLand(q,40)||dist(q,this.player.body.position)>180){this.emit('note',q,'Construa perto de você, dentro do seu terreno.');return;}
    const existing=[...this.entities.values()].some(e=>e.kind==='structure'&&dist(e.body.position,q)<22);
    if(existing){this.emit('note',q,'Já existe uma peça aqui.');return;}
    const planks=[...this.entities.values()].filter(e=>e.kind==='plank'&&!e.tied&&dist(e.body.position,q)<230);
    if(planks.length<def.cost){this.emit('note',q,`Deixe ${def.cost} ${def.cost===1?'tábua':'tábuas'} perto da construção.`);return;}
    planks.slice(0,def.cost).forEach(e=>this.remove(e.id));
    const e=this.create('structure',x,y,def.w,def.h,{piece});Body.setAngle(e.body,angle);this.emit('build',q);
  }
  private explode(p:Vec,room?:ShopId){
    this.emit('explode',p);
    if(!room)for(const gate of PASSAGES)if(gate.kind==='rockfall'&&Math.hypot(dist(p,gate),heightAt(p)-heightAt(gate))<gate.radius+110){this.unlocked.add(gate.id);this.emit('note',p,'As pedras cederam. A subida está aberta.');}
    if(room===this.interior&&Math.hypot(dist(this.position,p),room?0:heightAt(this.position)-heightAt(p))<145){this.release();this.driving=false;this.deadUntil=this.elapsed+3;this.movement={x:0,y:0,brake:false};Body.setVelocity(this.player.body,{x:0,y:0});this.emit('death',p,'A explosão atingiu você.');}
    for(const e of [...this.entities.values()]){const d=Math.hypot(dist(p,e.body.position),room?0:heightAt(p)-heightAt(e.body.position));if(d>160||e.room!==room)continue;
      if(e.kind==='dynamite'&&e.fuse===undefined&&e.paid!==false)e.fuse=this.elapsed+.15;
      if(e.owner==='gate'){this.gateOpen=true;this.remove(e.id);}
      else if(e.kind==='tree'&&e.fallAt===undefined){e.hp=0;e.fallAt=this.elapsed;e.fallAngle=Math.atan2(e.body.position.y-p.y,e.body.position.x-p.x);e.body.isSensor=true;}
      else if(!e.body.isStatic&&e.kind!=='player'){Body.setVelocity(e.body,{x:(e.body.position.x-p.x)/(d||1)*6,y:(e.body.position.y-p.y)/(d||1)*6});}
    }
  }
  remove(id:string){if(id.startsWith('w:'))this.removedTrees.add(id);const e=this.entities.get(id);if(!e)return;if(this.held===id)this.release();if(e===this.truck){this.truck=undefined;this.driving=false;}const tie=this.ties.get(id);if(tie){Composite.remove(this.engine.world,tie);this.ties.delete(id);}Composite.remove(this.engine.world,e.body);this.entities.delete(id);}
  closest(p:Vec,kinds:Entity['kind'][],range:number){let found:Entity|undefined;let best=range;for(const e of this.entities.values()){const d=dist(p,e.body.position);if(e.room===this.interior&&kinds.includes(e.kind)&&e.fallAt===undefined&&d<best){best=d;found=e;}}return found;}
  capture():Snapshot {return {version:3,streaming:this.streaming,roomOrigins:{vale:{...ROOMS.vale},east:{...ROOMS.east}},removedTrees:[...this.removedTrees],explored:[...this.explored],unlocked:[...this.unlocked],tick:this.tick,nextId:this.nextId,money:this.money,fuel:this.fuel,axe:this.axe,driving:this.driving,lights:this.lights,elapsed:this.elapsed,truckUpgrade:this.truckUpgrade,gateOpen:this.gateOpen,secretOpen:this.secretOpen,interior:this.interior,facing:this.facing,swing:{...this.swing},deadUntil:this.deadUntil,entities:[...this.entities.values()].filter(e=>!e.id.startsWith('w:')||e.hp!==e.maxHp||e.fallAt!==undefined).map(({body,...e})=>({...e,x:body.position.x,y:body.position.y,angle:body.angle,vx:body.velocity.x,vy:body.velocity.y,av:body.angularVelocity}))};}
  restore(s:Snapshot){
    if(!s||![1,2,3].includes(s.version)||!Array.isArray(s.entities)||s.entities.length>10000||s.entities.filter(e=>e.kind==='player').length!==1)throw new Error('Arquivo de mundo incompatível.');
    if(![s.money,s.fuel,s.axe,s.elapsed,s.tick,s.nextId].every(Number.isFinite)||s.entities.some(e=>![e.x,e.y,e.w,e.h,e.angle,e.vx,e.vy,e.av].every(Number.isFinite)||e.w<=0||e.h<=0))throw new Error('O arquivo de mundo contém dados inválidos.');
    if(new Set(s.entities.map(e=>e.id)).size!==s.entities.length||s.interior&&!ROOMS[s.interior])throw new Error('Arquivo de mundo inválido.');
    if([s.removedTrees,s.explored,s.unlocked].some(v=>v!==undefined&&(!Array.isArray(v)||v.some(id=>typeof id!=='string')))||s.streaming!==undefined&&typeof s.streaming!=='boolean'||s.roomOrigins&&Object.values(s.roomOrigins).some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Metadados do mundo inválidos.');
    this.release();for(const id of [...this.entities.keys()])this.remove(id);this.truck=undefined;
    this.loadedChunks.clear();this.removedTrees=new Set(s.removedTrees??[]);this.explored=new Set(s.explored??[]);this.unlocked=new Set(s.unlocked??[]);this.streaming=s.streaming??true;
    this.tick=s.tick;this.nextId=s.nextId;this.money=s.money;this.fuel=s.fuel;this.axe=s.axe;this.driving=s.driving;this.lights=s.lights;this.elapsed=s.elapsed;this.truckUpgrade=s.truckUpgrade;this.gateOpen=s.gateOpen;this.secretOpen=s.secretOpen;
    this.interior=s.interior;this.facing=s.facing??-Math.PI/2;this.swing=s.swing?{...s.swing}:{at:-10,angle:0,reach:40};this.deadUntil=s.deadUntil??0;
    for(const raw of s.entities){const {x,y,angle,vx,vy,av,w,h,id,kind,...opts}=raw;const origin=raw.room?(s.version<3?OLD_ROOMS[raw.room]:s.roomOrigins?.[raw.room]??(raw.room==='vale'?{x:25040,y:1900}:{x:26240,y:1900})):undefined,offset=raw.room&&origin?ROOMS[raw.room].x-origin.x:0,offsetY=raw.room&&origin?ROOMS[raw.room].y-origin.y:0;const e=this.create(kind,x+offset,y+offsetY,w,h,opts,id);Body.setAngle(e.body,angle);Body.setVelocity(e.body,{x:vx,y:vy});Body.setAngularVelocity(e.body,av);if(kind==='player')this.player=e;if(e.fallAt!==undefined||e.millId)e.body.isSensor=true;}
    this.player.room=this.interior;this.driving=this.driving&&!!this.truck;
    for(const e of this.entities.values())if(e.tied)this.tie(e);
    if(s.version===1){
      this.create('mill',MILL.x,MILL.y,200,64);
      for(let i=0;i<(s.dynamite??0);i++)this.create('dynamite',this.player.body.position.x+35+i*27,this.player.body.position.y+40,26,15,{product:'dynamite',paid:true});
      for(const e of [...this.entities.values()])if(e.kind==='tree'&&this.saleClearing(e.body.position))this.remove(e.id);
      this.restock();
    }
    this.streamWorld();this.movement={x:0,y:0,brake:false};this.queue=[];this.events=[];this.aim={x:this.position.x+Math.cos(this.facing)*80,y:this.position.y+Math.sin(this.facing)*80};
  }
}
