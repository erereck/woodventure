import * as T from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import rawFont from './assets/sign-font.json?raw';

const font=new FontLoader().parse(JSON.parse(rawFont));
const geometries=new Map<string,TextGeometry>();
const inks=new Map<string,T.MeshStandardMaterial>();
/** Raised lettering lies in local XY and projects out along +Z, fixed to its support. */
export function lettering(text:string,width:number,height:number,color='#eadbb4'){
 const key=[text,width,height].join('/');let geometry=geometries.get(key);
 if(!geometry){geometry=new TextGeometry(text,{font,size:12,depth:.45,curveSegments:3,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1});geometry.computeBoundingBox();const b=geometry.boundingBox!,scale=Math.min(width/(b.max.x-b.min.x||1),height/(b.max.y-b.min.y||1));geometry.translate(-(b.max.x+b.min.x)/2,-(b.max.y+b.min.y)/2,0);geometry.scale(scale,scale,1);geometry.userData.shared=true;geometries.set(key,geometry);}
 let ink=inks.get(color);if(!ink){ink=new T.MeshStandardMaterial({color,roughness:.82,metalness:.06});inks.set(color,ink);}
 const mesh=new T.Mesh(geometry,ink);mesh.name='inscription';mesh.userData.text=text;mesh.receiveShadow=true;return mesh;
}
