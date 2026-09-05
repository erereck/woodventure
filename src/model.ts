import { WORLD, LAND, MILL, BUYER, SHOP, HARDWARE, GATE, SECRET, ROOMS, ROAD, biomeAt } from './world';
export { WORLD, LAND, MILL, BUYER, SHOP, HARDWARE, GATE, SECRET, ROOMS, ROAD, roadDistance, riverX, inRiver } from './world';
import type Matter from 'matter-js';
export type Vec = { x: number; y: number };
export type Species = 'pine' | 'birch' | 'snow' | 'gold';
export type Piece = 'floor' | 'wall' | 'post' | 'lamp' | 'conveyor';
export type EntityKind = 'player' | 'truck' | 'tree' | 'log' | 'plank' | 'rock' | 'structure' | 'relic' | 'dynamite' | 'box' | 'mill' | 'tool';
export type ShopId = 'vale' | 'east';
export type Product = 'axe' | 'steelAxe' | 'truck' | 'mill' | 'dynamite' | 'fuel';
export interface Entity {
  id: string; kind: EntityKind; body: Matter.Body; w: number; h: number;
  species?: Species; hp?: number; maxHp?: number; seed: number; size: number;
  cutAt?: number; fallAt?: number; fallAngle?: number; tied?: boolean; piece?: Piece;
  owner: string; process?: number; fuse?: number; room?: ShopId; product?: Product; paid?: boolean; slot?: number; millId?: string; toolPower?: number;
}
export type Command =
  | { type: 'move'; x: number; y: number; brake?: boolean }
  | { type: 'aim'; x: number; y: number }
  | { type: 'chop'; target: string }
  | { type: 'grab'; target: string }
  | { type: 'release' }
  | { type: 'rotate'; direction: number }
  | { type: 'interact' }
  | { type: 'checkout' }
  | { type: 'open'; target: string }
  | { type: 'deploy'; target: string; x: number; y: number; angle: number }
  | { type: 'rope' }
  | { type: 'build'; piece: Piece; x: number; y: number; angle: number }
  | { type: 'remove'; target: string }
  | { type: 'ignite'; target: string }
  | { type: 'lights' };
export interface Envelope { seq: number; tick: number; actor: string; command: Command }
export interface GameEvent { type: 'chop' | 'fall' | 'wood' | 'sell' | 'explode' | 'build' | 'note' | 'engine' | 'secret' | 'transition' | 'death'; x: number; y: number; message?: string; amount?: number }
export interface SavedEntity {
  id: string; kind: EntityKind; x: number; y: number; angle: number; vx: number; vy: number; av: number;
  w: number; h: number; species?: Species; hp?: number; maxHp?: number; seed: number; size: number;
  cutAt?: number; fallAt?: number; fallAngle?: number; tied?: boolean; piece?: Piece; owner: string; process?: number; fuse?: number; room?: ShopId; product?: Product; paid?: boolean; slot?: number; millId?: string; toolPower?: number;
}
export interface Snapshot { version: 1 | 2 | 3; streaming?:boolean; roomOrigins?:Record<ShopId,Vec>; removedTrees?:string[]; explored?:string[]; unlocked?:string[]; tick: number; nextId: number; money: number; fuel: number; axe: number; dynamite?: number; driving: boolean; lights: boolean; elapsed: number; truckUpgrade: boolean; gateOpen: boolean; secretOpen: boolean; entities: SavedEntity[]; interior?: ShopId; facing?: number; swing?: {at:number;angle:number;reach:number;target?:string;hit?:boolean}; deadUntil?:number }
export const WOODS = {
  pine: { name: 'Pinheiro', hp: 5, value: 18, bark: '#75503b', heart: '#d6b27b', foliage: ['#264b42','#345e49','#467353','#638758'] },
  birch: { name: 'Bétula', hp: 4, value: 26, bark: '#d0c6a0', heart: '#e7cda0', foliage: ['#726e36','#95954b','#b2ae59','#cdba6b'] },
  snow: { name: 'Cedro branco', hp: 8, value: 95, bark: '#a1aca9', heart: '#e0ebdd', foliage: ['#4b7271','#7e9690','#bcc9bc','#e0e5d5'] },
  gold: { name: 'Âmbar', hp: 12, value: 190, bark: '#634735', heart: '#ebb86c', foliage: ['#755630','#a77935','#c6984b','#d9b36a'] }
} as const;
export const BUILD = {
  floor: { name:'Piso', cost:1, w:64, h:64 }, wall: { name:'Parede', cost:2, w:64, h:12 },
  post: { name:'Pilar', cost:1, w:14, h:14 }, lamp: { name:'Luminária', cost:1, w:16, h:16 },
  conveyor: { name:'Esteira', cost:3, w:96, h:40 }
} as const;
export const PRODUCTS: Record<Product,{name:string;price:number;color:string}> = {
  axe:{name:'Machado de ferro',price:75,color:'#8ea697'}, steelAxe:{name:'Machado de aço',price:180,color:'#bbc8bb'},
  truck:{name:'Caminhonete',price:210,color:'#679b8b'}, mill:{name:'Refinadora',price:145,color:'#b4ad7b'},
  dynamite:{name:'Dinamite',price:65,color:'#b86850'}, fuel:{name:'Galão de combustível',price:25,color:'#ad944e'}
};
export const roomDoor=(id:ShopId):Vec=>({x:ROOMS[id].x,y:ROOMS[id].y+255});
export const roomCounter=(id:ShopId):Vec=>({x:ROOMS[id].x+190,y:ROOMS[id].y+80});
export const STOCK:Record<ShopId,Product[]>={vale:['axe','steelAxe','truck','mill','fuel'],east:['dynamite','dynamite','steelAxe','fuel']};
export const movable=(e:Entity)=>['log','plank','relic','dynamite','box','tool'].includes(e.kind);
export function localPoint(p:Vec,origin:Vec,angle:number):Vec {const dx=p.x-origin.x,dy=p.y-origin.y;return{x:dx*Math.cos(angle)+dy*Math.sin(angle),y:-dx*Math.sin(angle)+dy*Math.cos(angle)};}
export function worldPoint(p:Vec,origin:Vec,angle:number):Vec {return{x:origin.x+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:origin.y+p.x*Math.sin(angle)+p.y*Math.cos(angle)};}
export const dist = (a:Vec,b:Vec) => Math.hypot(a.x-b.x,a.y-b.y);
export const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
export function rng(seed:number) { return () => { seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
export function segmentDistance(p:Vec,a:Vec,b:Vec) { const t=clamp(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2),0,1);return dist(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)}); }
export function inLand(p:Vec,margin=0) { return p.x>LAND.x+margin&&p.x<LAND.x+LAND.w-margin&&p.y>LAND.y+margin&&p.y<LAND.y+LAND.h-margin; }
export function biome(p:Vec){return biomeAt(p);}
