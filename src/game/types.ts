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

export interface Snapshot {
  version: 1 | 2 | 3;
  streaming?: boolean;
  roomOrigins?: Record<ShopId, Vec>;
  removedTrees?: string[];
  explored?: string[];
  unlocked?: string[];
  tick: number;
  nextId: number;
  money: number;
  fuel: number;
  axe: number;
  dynamite?: number;
  driving: boolean;
  lights: boolean;
  elapsed: number;
  truckUpgrade: boolean;
  gateOpen: boolean;
  secretOpen: boolean;
  entities: SavedEntity[];
  interior?: ShopId;
  facing?: number;
  swing?: { at: number; angle: number; reach: number; target?: string; hit?: boolean };
  deadUntil?: number;
}
