import { ROOMS } from '../world';
import type { Product, ShopId, Vec } from './types';

export const WOODS = {
  pine: { name: 'Pinheiro', hp: 5, value: 18, bark: '#75503b', heart: '#d6b27b', foliage: ['#264b42','#345e49','#467353','#638758'] },
  birch: { name: 'Bétula', hp: 4, value: 26, bark: '#d0c6a0', heart: '#e7cda0', foliage: ['#726e36','#95954b','#b2ae59','#cdba6b'] },
  snow: { name: 'Cedro branco', hp: 8, value: 95, bark: '#a1aca9', heart: '#e0ebdd', foliage: ['#4b7271','#7e9690','#bcc9bc','#e0e5d5'] },
  gold: { name: 'Âmbar', hp: 12, value: 190, bark: '#634735', heart: '#ebb86c', foliage: ['#755630','#a77935','#c6984b','#d9b36a'] }
} as const;

export const BUILD = {
  floor: { name:'Piso', cost:1, w:64, h:64 },
  wall: { name:'Parede', cost:2, w:64, h:12 },
  post: { name:'Pilar', cost:1, w:14, h:14 },
  lamp: { name:'Luminária', cost:1, w:16, h:16 },
  conveyor: { name:'Esteira', cost:3, w:96, h:40 }
} as const;

export const PRODUCTS: Record<Product,{name:string;price:number;color:string}> = {
  axe:{name:'Machado de ferro',price:75,color:'#8ea697'},
  steelAxe:{name:'Machado de aço',price:180,color:'#bbc8bb'},
  truck:{name:'Caminhonete',price:210,color:'#679b8b'},
  mill:{name:'Refinadora',price:145,color:'#b4ad7b'},
  dynamite:{name:'Dinamite',price:65,color:'#b86850'},
  fuel:{name:'Galão de combustível',price:25,color:'#ad944e'}
};

export const STOCK: Record<ShopId, Product[]> = {
  vale:['axe','steelAxe','truck','mill','fuel'],
  east:['dynamite','dynamite','steelAxe','fuel']
};

export const roomDoor = (id:ShopId):Vec => ({x:ROOMS[id].x,y:ROOMS[id].y+255});
export const roomCounter = (id:ShopId):Vec => ({x:ROOMS[id].x+190,y:ROOMS[id].y+80});
