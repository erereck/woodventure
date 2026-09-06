import Matter from 'matter-js';
import { BUYER, type Command, type Entity, type Envelope, type GameEvent, type Piece, type ShopId, type Snapshot, type Vec } from './model';
import { createEntity, removeEntity, closestEntity } from './simulation/entities';
import { installBoundaries, generateInitialWorld, interactPassage, nearbyPassage, streamWorld as streamWorldChunks } from './simulation/world-runtime';
import { stepSimulation } from './simulation/step';
import { runCommand, hitWood as hitWoodEntity, atMillInlet } from './simulation/commands';
import { releaseHeld, inTruckBed, tieEntity } from './simulation/logistics';
import { changeRoom as moveRoom, checkout as checkoutGoods, counterPlacement as findCounterPlacement, deployPackage, openPackage as openProduct, placeOnCounter as placeProductOnCounter, restockShops } from './simulation/commerce';
import { buildPiece, explode as explodeAt } from './simulation/construction';
import { captureSnapshot, restoreSnapshot } from './simulation/snapshot';

const { Engine }=Matter;

/**
 * Authoritative simulation facade.
 * Domain behavior lives under ./simulation so new systems can evolve independently.
 */
export class Simulation {
  engine=Engine.create({gravity:{x:0,y:0},positionIterations:8,velocityIterations:8});
  entities=new Map<string,Entity>(); events:GameEvent[]=[]; tick=0; nextId=1;
  money=0; fuel=100; axe=.6; driving=false; lights=false; elapsed=0; truckUpgrade=false;
  gateOpen=false; secretOpen=false; player!:Entity; truck:Entity|undefined;
  interior:ShopId|undefined; facing=-Math.PI/2; swing:NonNullable<Snapshot['swing']>={at:-10,angle:0,reach:40}; deadUntil=0;
  movement={x:0,y:0,brake:false}; aim:Vec={x:1450,y:1900}; held:string|null=null;

  // Package-internal state used by the focused simulation modules.
  grabConstraint:Matter.Constraint|null=null;
  ties=new Map<string,Matter.Constraint>();
  queue:Envelope[]=[];
  lastSeq=new Map<string,number>();
  cooldown=0;
  streaming=true;
  loadedChunks=new Set<string>();
  removedTrees=new Set<string>(); explored=new Set<string>(); unlocked=new Set<string>();

  constructor(populate=true){this.streaming=populate;this.boundaries();if(populate){this.generate();this.streamWorld();}}

  emit(type:GameEvent['type'],p:Vec,message?:string,amount?:number){this.events.push({type,x:p.x,y:p.y,message,amount});}
  create(kind:Entity['kind'],x:number,y:number,w:number,h:number,opts:Partial<Omit<Entity,'kind'|'body'|'w'|'h'>>={},id?:string){return createEntity(this,kind,x,y,w,h,opts,id);}
  boundaries(){installBoundaries(this);}
  generate(){generateInitialWorld(this);}
  streamWorld(){streamWorldChunks(this);}
  nearbyPassage(){return nearbyPassage(this);}
  interactPassage(){return interactPassage(this);}

  receive(e:Envelope){
    if(e.actor!=='local'||e.seq<=(this.lastSeq.get(e.actor)??0)||!Number.isFinite(e.seq)||e.tick>this.tick+120)return;
    this.lastSeq.set(e.actor,e.seq);this.queue.push(e);
  }
  get position(){return (this.driving&&this.truck?this.truck:this.player).body.position;}
  saleClearing(p:Vec){return Math.abs(p.x-BUYER.x)<285&&p.y>BUYER.y-270&&p.y<BUYER.y+460;}

  step(){stepSimulation(this);}
  command(c:Command){runCommand(this,c);}
  hitWood(id:string){hitWoodEntity(this,id);}
  atInlet(log:Entity,mill:Entity){return atMillInlet(log,mill);}

  restock(){restockShops(this);}
  changeRoom(room:ShopId|undefined){moveRoom(this,room);}
  counterPlacement(e:Entity):Vec|undefined{return findCounterPlacement(this,e);}
  placeOnCounter(e:Entity){placeProductOnCounter(this,e);}
  checkout(){checkoutGoods(this);}
  openPackage(id:string){openProduct(this,id);}
  deploy(id:string,x:number,y:number,angle:number){deployPackage(this,id,x,y,angle);}

  release(){releaseHeld(this);}
  inBed(p:Vec){return inTruckBed(this,p);}
  tie(e:Entity){tieEntity(this,e);}
  build(piece:Piece,x:number,y:number,angle:number){buildPiece(this,piece,x,y,angle);}
  explode(p:Vec,room?:ShopId){explodeAt(this,p,room);}

  remove(id:string){removeEntity(this,id);}
  closest(p:Vec,kinds:Entity['kind'][],range:number){return closestEntity(this,p,kinds,range);}
  capture():Snapshot{return captureSnapshot(this);}
  restore(s:Snapshot){restoreSnapshot(this,s);}
}
